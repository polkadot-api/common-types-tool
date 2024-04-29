import {
  EnumVar,
  LookupEntry,
  getChecksumBuilder,
  getLookupFn,
} from "@polkadot-api/metadata-builders"
import { state } from "@react-rxjs/core"
import { map } from "rxjs"
import { metadatas } from "./api/metadatas"

type References = { direct: string[]; indirect: string[] }
const emptyReferences: References = { direct: [], indirect: [] }
const mergeReferences = (a: References, b: References): References => ({
  direct: [...a.direct, ...b.direct],
  indirect: [...a.indirect, ...b.indirect],
})
const removeDuplicates = <T>(v: Array<T>) => [...new Set(v)]

/**
 * Constructs a graph of references between enums
 */
export const typeReferences$ = state(
  (chain: string) =>
    metadatas[chain].pipe(
      map((metadata) => {
        const result: Record<
          string,
          { inputs: References; outputs: References; backRefs: References }
        > = {}
        const checksumBuilder = getChecksumBuilder(metadata)
        const lookup = getLookupFn(metadata.lookup)

        const referenceCache: Record<number, References> = {}
        const getLookupReferences = (entry: LookupEntry): References => {
          if (referenceCache[entry.id]) return referenceCache[entry.id]
          const refsResult: References = { direct: [], indirect: [] }
          referenceCache[entry.id] = refsResult

          switch (entry.type) {
            case "enum": {
              const checksum = checksumBuilder.buildDefinition(entry.id)!
              refsResult.direct.push(checksum)

              const subReferences = flattenEnumEntries(entry.value)
                .map(getLookupReferences)
                .reduce(mergeReferences, emptyReferences)
              refsResult.indirect = removeDuplicates([
                ...subReferences.direct,
                ...subReferences.indirect,
              ])
              result[checksum] = {
                inputs: {
                  direct: removeDuplicates(subReferences.direct),
                  indirect: removeDuplicates(subReferences.indirect),
                },
                outputs: emptyReferences,
                backRefs: {
                  direct: [],
                  indirect: [],
                },
              }
              break
            }
            case "sequence":
            case "array":
            case "option": {
              const subReference = getLookupReferences(entry.value)
              refsResult.direct = subReference.direct
              refsResult.indirect = subReference.indirect
              break
            }
            case "result": {
              const subReference = [
                getLookupReferences(entry.value.ok),
                getLookupReferences(entry.value.ko),
              ].reduce(mergeReferences)
              refsResult.direct = removeDuplicates(subReference.direct)
              refsResult.indirect = removeDuplicates(subReference.indirect)
              break
            }
            case "tuple": {
              const subReference = entry.value
                .map(getLookupReferences)
                .reduce(mergeReferences, emptyReferences)
              refsResult.direct = removeDuplicates(subReference.direct)
              refsResult.indirect = removeDuplicates(subReference.indirect)
              break
            }
            case "struct": {
              const subReference = Object.values(entry.value)
                .map(getLookupReferences)
                .reduce(mergeReferences, emptyReferences)
              refsResult.direct = removeDuplicates(subReference.direct)
              refsResult.indirect = removeDuplicates(subReference.indirect)
              break
            }
          }

          return refsResult
        }

        metadata.apis.forEach((runtimeCall) => {
          runtimeCall.methods.forEach((method) => {
            const inputs = method.inputs
              .map((input) => getLookupReferences(lookup(input.type)))
              .reduce(mergeReferences, emptyReferences)
            const outputs = getLookupReferences(lookup(method.output))
            result[`api.${runtimeCall.name}.${method.name}`] = {
              inputs: {
                direct: removeDuplicates(inputs.direct),
                indirect: removeDuplicates(inputs.indirect),
              },
              outputs,
              backRefs: emptyReferences,
            }
          })
        })
        metadata.pallets.forEach((pallet) => {
          const addEnumCall = (type: string, id: number | undefined) => {
            if (id === undefined) return
            const entry = lookup(id)
            if (entry.type === "void") return
            if (entry.type !== "enum")
              throw new Error("unreachable: " + entry.type)

            Object.entries(entry.value).forEach(([name, entry]) => {
              const subReferences = getEnumInputs(entry)
                .map(getLookupReferences)
                .reduce(mergeReferences, emptyReferences)
              const resultingRefs = {
                direct: removeDuplicates(subReferences.direct),
                indirect: removeDuplicates(subReferences.indirect),
              }
              result[`${type}.${pallet.name}.${name}`] = {
                inputs: type === "tx" ? resultingRefs : emptyReferences,
                outputs: type === "tx" ? emptyReferences : resultingRefs,
                backRefs: emptyReferences,
              }
            })
          }
          addEnumCall("tx", pallet.calls)
          addEnumCall("error", pallet.errors)
          addEnumCall("evt", pallet.events)

          pallet.constants.forEach((constant) => {
            result[`const.${pallet.name}.${constant.name}`] = {
              inputs: emptyReferences,
              outputs: getLookupReferences(lookup(constant.type)),
              backRefs: emptyReferences,
            }
          })
          pallet.storage?.items.forEach((entry) => {
            if (entry.type.tag === "map") {
              result[`query.${pallet.name}.${entry.name}`] = {
                inputs: getLookupReferences(lookup(entry.type.value.key)),
                outputs: getLookupReferences(lookup(entry.type.value.value)),
                backRefs: emptyReferences,
              }
            } else {
              result[`query.${pallet.name}.${entry.name}`] = {
                inputs: emptyReferences,
                outputs: getLookupReferences(lookup(entry.type.value)),
                backRefs: emptyReferences,
              }
            }
          })
        })

        // Populate backRefs
        Object.entries(result).forEach(([key, refs]) => {
          ;[...refs.inputs.direct, ...refs.outputs.direct].forEach((refKey) =>
            result[refKey].backRefs.direct.push(key),
          )
          ;[...refs.inputs.indirect, ...refs.outputs.indirect].forEach(
            (refKey) => result[refKey].backRefs.indirect.push(key),
          )
        })

        return result
      }),
    ),
  {},
)

function getEnumInputs(entry: EnumVar["value"][string]): LookupEntry[] {
  switch (entry.type) {
    case "lookupEntry":
      return [entry.value]
    case "struct":
      return Object.values(entry.value)
    case "tuple":
      return entry.value
    case "void":
      return []
  }
}
function flattenEnumEntries(enumValue: EnumVar["value"]) {
  return Object.values(enumValue).flatMap(getEnumInputs)
}
