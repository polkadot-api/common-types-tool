import { useEffect, useState } from "react"
import { RepositoryEntry } from "./Export"
import { commonTypeNames$, setTypeName } from "./commonTypes.state"

export const ImportKnownTypes = () => {
  const [done, setDone] = useState(false)

  useEffect(() => {
    const sub = commonTypeNames$.subscribe()
    return () => sub.unsubscribe()
  }, [])

  const handleChange = (value: string) => {
    try {
      const result = JSON.parse(value) as Record<string, RepositoryEntry>
      if (typeof result !== "object") throw new Error("Not an object")
      Object.entries(result).forEach(([checksum, type]) => {
        setTypeName({ checksum, name: type.name })
      })
      setDone(true)
    } catch (ex) {
      console.error(ex)
    }
  }

  if (done) {
    return (
      <div className="p-2 max-h-[50vh] flex flex-col gap-2">
        <p>Imported successfully!</p>
      </div>
    )
  }

  return (
    <div className="p-2 max-h-[50vh] flex flex-col gap-2">
      <p>Paste here your saved types</p>
      <textarea
        className="p-1"
        onChange={(evt) => {
          handleChange(evt.target.value)
        }}
      ></textarea>
    </div>
  )
}
