import { MonoTypeOperatorFunction, share, ReplaySubject } from "rxjs"

export function persistSubscription<T>(): MonoTypeOperatorFunction<T> {
  return share({
    connector: () => new ReplaySubject(1),
    resetOnComplete: false,
    resetOnRefCountZero: false,
    resetOnError: true,
  })
}
