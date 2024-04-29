import { state, useStateObservable } from "@react-rxjs/core"
import { combineKeys, createSignal } from "@react-rxjs/utils"
import { combineLatest, map, scan } from "rxjs"
import { selectedChains$ } from "../ChainPicker"
import {
  chainTypes$,
  commonTypeNames$,
  getCurrentKnownType,
} from "./commonTypes.state"
import { Checkbox } from "@radix-ui/themes"

export type RepositoryEntry = {
  name: string
  chains: string
  paths: string[]
  type: string
}
const allNewKnownTypes$ = state(
  combineLatest({
    chains: combineKeys(selectedChains$, chainTypes$),
    names: commonTypeNames$,
  }).pipe(
    map(({ chains, names }) => {
      const result: Record<string, RepositoryEntry> = {}

      Object.entries(names).forEach(([checksum, name]) => {
        if (!name) return

        const chainsWithType = Array.from(chains.keys()).filter(
          (chain) => checksum in chains.get(chain)!,
        )
        if (chainsWithType.length === 0) return

        const paths = Array.from(
          new Set(
            chainsWithType.flatMap((chain) =>
              chains
                .get(chain)!
                [checksum].map((type) => type.entry.path.join(".")),
            ),
          ),
        )

        const selectedChain = chains.get(chainsWithType[0])!
        const chainType = selectedChain[checksum][0]
        const type = `Enum(${Object.keys(chainType.value).join(", ")})`

        result[checksum] = {
          name,
          chains: chainsWithType.join(", "),
          paths,
          type,
        }
      })

      return result
    }),
  ),
  {},
)

const [toggleOnlyChanges$, toggleOnlyChanges] = createSignal()
const onlyChanges$ = state(
  toggleOnlyChanges$.pipe(scan((acc) => !acc, true)),
  true,
)

const newKnownTypes$ = state(
  combineLatest([allNewKnownTypes$, onlyChanges$]).pipe(
    map(([allNewKnownTypes, onlyChanges]) =>
      onlyChanges
        ? Object.fromEntries(
            Object.entries(allNewKnownTypes).filter(
              ([checksum, entry]) =>
                entry.name !== getCurrentKnownType(checksum),
            ),
          )
        : allNewKnownTypes,
    ),
  ),
  {},
)

export const ExportKnownTypes = () => {
  const onlyChanges = useStateObservable(onlyChanges$)
  const newKnownTypes = useStateObservable(newKnownTypes$)

  return (
    <div className="p-2 max-h-[50vh] flex flex-col gap-2">
      <p>Here are the known types object for the selected chains</p>
      <label className="flex items-center gap-1 px-2 py-1 border rounded self-start select-none cursor-pointer">
        <Checkbox checked={onlyChanges} onCheckedChange={toggleOnlyChanges} />
        Only changed names
      </label>
      <pre className="overflow-auto border rounded p-2 text-xs">
        <code className="select-all">
          {JSON.stringify(newKnownTypes, null, 2)}
        </code>
      </pre>
    </div>
  )
}
