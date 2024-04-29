import { useState } from "react"

export function useViewTransition<T>(
  initialValue: T,
  customIsTransitioning?: [boolean, (transitioning: boolean) => void],
) {
  const [state, setState] = useState(initialValue)
  const privateIsTransitioning = useState(false)

  const isTransitioning =
    customIsTransitioning?.[0] ?? privateIsTransitioning[0]
  const setIsTransitioning =
    customIsTransitioning?.[1] ?? privateIsTransitioning[1]

  const changeState = (value: T) => {
    if ("startViewTransition" in document) {
      setIsTransitioning(true)
      const transition = (document.startViewTransition as any)(() => {
        setState(value)
      })
      transition.finished.then(() => setIsTransitioning(false))
    } else {
      setState(value)
    }
  }

  return [state, changeState, isTransitioning] as const
}
