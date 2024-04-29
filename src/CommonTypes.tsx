import { Button, Popover, TextField } from "@radix-ui/themes"
import { useStateObservable } from "@react-rxjs/core"
import { Search } from "lucide-react"
import { ForwardedRef, forwardRef, useRef } from "react"
import { Components, Virtuoso, VirtuosoHandle } from "react-virtuoso"
import { firstValueFrom } from "rxjs"
import { twMerge } from "tailwind-merge"
import { CommonType } from "./CommonType"
import {
  commonTypeNames$,
  commonTypes$,
  newKnownTypes$,
  setSearch,
} from "./commonTypes.state"

export function CommonTypes({ className }: { className?: string }) {
  const commonTypes = useStateObservable(commonTypes$)

  const ref = useRef<VirtuosoHandle | null>(null)

  const changeSearch = (newValue: string) => {
    const value = newValue.trim().toLocaleLowerCase()
    setSearch(value)
    if (value.length) {
      // I don't want to subscribe at this level for name changes, so I just #yolo
      firstValueFrom(commonTypeNames$).then((names) => {
        const idx = commonTypes.findIndex(
          (item) =>
            item.checksum.includes(value) ||
            (names[item.checksum] ?? "").toLocaleLowerCase().includes(value),
        )
        if (idx >= 0) {
          ref.current!.scrollToIndex({
            index: idx,
            align: "start",
            behavior: "smooth",
            offset: -60,
          })
        }
      })
    }
  }

  return (
    <div className={twMerge("flex flex-col gap-2", className)}>
      <div className="border-2 rounded p-2 sticky top-2 z-10 bg-slate-50 flex justify-between">
        <Popover.Root>
          <Popover.Trigger>
            <Button>Export</Button>
          </Popover.Trigger>
          <Popover.Content>
            <ExportKnownTypes />
          </Popover.Content>
        </Popover.Root>
        <TextField.Root
          onChange={(evt) => changeSearch(evt.target.value)}
          onBlur={(evt) => {
            evt.target.value = ""
            changeSearch("")
          }}
        >
          <TextField.Slot>
            <Search size={16} />
          </TextField.Slot>
        </TextField.Root>
      </div>
      <Virtuoso
        ref={ref}
        useWindowScroll
        data={commonTypes}
        components={{ Item }}
        itemContent={(idx) => (
          <CommonType key={commonTypes[idx].checksum} {...commonTypes[idx]} />
        )}
      />
    </div>
  )
}

const Item: Components["Item"] = forwardRef(
  (props, ref: ForwardedRef<HTMLDivElement>) => (
    <div
      {...props}
      className="border first:rounded-t last:rounded-b overflow-hidden"
      ref={ref}
    />
  ),
)

const ExportKnownTypes = () => {
  const newKnownTypes = useStateObservable(newKnownTypes$)

  return (
    <div className="p-2 max-h-96 flex flex-col gap-2">
      <p>Here are the known types object for the selected chains</p>
      <pre className="overflow-auto border rounded p-2">
        <code className="select-all">
          {JSON.stringify(newKnownTypes, null, 2)}
        </code>
      </pre>
    </div>
  )
}
