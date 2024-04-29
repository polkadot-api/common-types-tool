import { Button, Checkbox, Spinner } from "@radix-ui/themes"
import { state, useStateObservable } from "@react-rxjs/core"
import { createSignal, mergeWithKey } from "@react-rxjs/utils"
import { CircleX } from "lucide-react"
import { FC } from "react"
import { defer, map, scan, startWith } from "rxjs"
import {
  LoadStatus,
  metadataLoadStatus$,
  setUseCache,
  useCache$,
} from "./api/metadatas"
import { chains } from "./api/smoldot"

export const [toggleSelectedChain$, toggleSelectedChain] =
  createSignal<string>()
export const [selectAllChains$, selectAllChains] = createSignal<boolean>()

export const selectedChains$ = state(
  defer(() => {
    const initialValue: Set<string> = new Set()
    return mergeWithKey({
      toggle: toggleSelectedChain$,
      selectAll: selectAllChains$,
    }).pipe(
      scan((acc, action) => {
        const newState = new Set(acc)
        if (action.type === "toggle") {
          if (acc.has(action.payload)) {
            newState.delete(action.payload)
          } else {
            newState.add(action.payload)
          }
        } else if (action.type === "selectAll") {
          if (action.payload) {
            Object.keys(chains).forEach((chain) => newState.add(chain))
          } else {
            newState.clear()
          }
        }
        return newState
      }, initialValue),
      startWith(initialValue),
    )
  }),
  new Set(),
)

export function ChainPicker() {
  const usingCache = useStateObservable(useCache$)

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-center gap-2">
        <Button onClick={() => selectAllChains(true)}>Select all</Button>
        <Button onClick={() => selectAllChains(false)}>Deselect all</Button>
        <label className="flex items-center py-1 px-2 border rounded gap-2 bg-blue-50 cursor-pointer">
          <Checkbox
            checked={usingCache}
            onClick={() => setUseCache(!usingCache)}
          />
          Use cached metadata
        </label>
      </div>
      <ul className="flex flex-row gap-2 flex-wrap justify-center">
        {Object.keys(chains).map((chain) => (
          <ChainOption key={chain} chain={chain} />
        ))}
      </ul>
    </div>
  )
}

const chainIsSelected$ = state(
  (chain: string) =>
    selectedChains$.pipe(map((selection) => selection.has(chain))),
  false,
)
const ChainOption: FC<{ chain: string }> = ({ chain }) => {
  const loadStatus = useStateObservable(metadataLoadStatus$(chain))
  const checked = useStateObservable(chainIsSelected$(chain))

  return (
    <li
      key={chain}
      className="flex items-center p-2 border rounded gap-2 cursor-pointer"
      onClick={() => toggleSelectedChain(chain)}
    >
      {checked && loadStatus === LoadStatus.Loading ? (
        <Spinner />
      ) : checked && loadStatus === LoadStatus.Error ? (
        <CircleX size={16} className="text-red-700" />
      ) : (
        <Checkbox checked={checked} />
      )}
      {chain}
    </li>
  )
}
