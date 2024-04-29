import { TextField } from "@radix-ui/themes"
import { useStateObservable } from "@react-rxjs/core"
import { FC, useMemo, useState } from "react"
import { twMerge } from "tailwind-merge"
import {
  EnumEntry,
  currentName$,
  getCurrentKnownType,
  isHighlighted$,
  nameDuplicate$,
  setTypeName,
} from "./commonTypes.state"
import { typeReferences$ } from "./typeReferences.state"

export const CommonType: FC<{
  checksum: string
  types: Array<{
    chain: string
    type: EnumEntry
  }>
}> = ({ checksum, types }) => {
  const [expanded, setExpanded] = useState(false)
  const name = useStateObservable(currentName$(checksum))
  const duplicates = useStateObservable(nameDuplicate$(name)).filter(
    (v) => v !== checksum,
  )
  const isHighlighted = useStateObservable(isHighlighted$(checksum))

  const groupedTypes = useMemo(() => {
    const result: Record<string, EnumEntry[]> = {}
    types.forEach(({ chain, type }) => {
      result[chain] = result[chain] ?? []
      result[chain].push(type)
    })
    return result
  }, [types])

  return (
    <>
      <div
        className={twMerge(
          "flex gap-1 cursor-pointer px-2 py-1",
          isHighlighted ? "bg-yellow-50" : "bg-slate-50",
        )}
        onClick={() => setExpanded(!expanded)}
      >
        <div className="text-slate-400 font-mono">
          {checksum.padStart(13, "\xa0")}
        </div>
        <code className="flex-1">{name}</code>
        <div>{types.length}</div>
      </div>
      {expanded ? (
        <div className="px-2 py-2 flex flex-col gap-2">
          <div>
            <h2 className="text-2xl">Name</h2>
            <div>
              Current: <code>{getCurrentKnownType(checksum)}</code>
            </div>
            <label className="flex items-center gap-1">
              New name:
              <TextField.Root
                className="flex-1"
                value={name ?? ""}
                onChange={(evt) =>
                  setTypeName({ checksum, name: evt.target.value })
                }
              />
            </label>
            {duplicates.length ? (
              <div>
                <h3>Duplicates</h3>
                <ul className="flex flex-wrap gap-2">
                  {duplicates.map((checksum) => (
                    <li
                      key={checksum}
                      className="px-2 py-1 border rounded font-mono"
                    >
                      {checksum}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
          <div>
            <h2 className="text-2xl">Variants</h2>
            <ul className="flex flex-wrap gap-2">
              {Object.keys(types[0].type.value).map((key) => (
                <li key={key} className="px-2 py-1 border rounded">
                  <code>{key}</code>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="text-2xl">Chains</h2>
            <div className="flex flex-wrap justify-center gap-2">
              {Object.entries(groupedTypes).map(([chain, types]) => (
                <Chain key={chain} chain={chain} types={types} />
              ))}
            </div>
          </div>
          <ChainReferences checksum={checksum} chain={types[0].chain} />
        </div>
      ) : null}
    </>
  )
}

const Chain: FC<{
  chain: string
  types: EnumEntry[]
}> = ({ chain, types }) => (
  <div className="border rounded p-2 flex flex-col gap-1">
    <h3 className="text-xl font-bold">{chain}</h3>
    <div>
      <div className="font-bold">Types</div>
      <ul>
        {types.map((type) => (
          <li key={type.id} className="flex gap-2">
            <span className="text-slate-400">{type.id}</span>
            <code>{type.entry.path.join(".") || "N/A"}</code>
          </li>
        ))}
      </ul>
    </div>
  </div>
)

const ChainReferences: FC<{ chain: string; checksum: string }> = ({
  chain,
  checksum,
}) => {
  const references = useStateObservable(typeReferences$(chain))
  const refs = references[checksum]
  if (!refs) return null

  return (
    <>
      <div>
        <h2 className="text-2xl">References ({chain})</h2>
        <div>
          <div className="font-bold">Direct</div>
          <ReferenceList references={refs.inputs.direct} />
          <div className="font-bold">Indirect</div>
          <ReferenceList references={refs.inputs.indirect} />
        </div>
      </div>
      <div>
        <h2 className="text-2xl">Referenced by</h2>
        <div>
          <div className="font-bold">Direct</div>
          <ReferenceList references={refs.backRefs.direct} />
          <div className="font-bold">Indirect</div>
          <ReferenceList references={refs.backRefs.indirect} />
        </div>
      </div>
    </>
  )
}

const ReferenceList: FC<{ references: string[] }> = ({ references }) => (
  <ul className="flex flex-wrap items-center gap-2">
    {references.sort(sortRefs).map((key) => (
      <EnumReference key={key} checksum={key} />
    ))}
  </ul>
)
const EnumReference: FC<{ checksum: string }> = ({ checksum }) => {
  const name = useStateObservable(currentName$(checksum))
  return (
    <li className="border rounded py-1 px-2">
      <code>{name || checksum}</code>
    </li>
  )
}

const sortRefs = (k1: string, k2: string) => {
  if (k1.includes(".")) {
    return k2.includes(".") ? k1.localeCompare(k2) : 1
  }
  if (k2.includes(".")) {
    return -1
  }
  return k1.localeCompare(k2)
}
