import { getObservableClient } from "@polkadot-api/observable-client"
import { V14, V15 } from "@polkadot-api/substrate-bindings"
import { createClient } from "@polkadot-api/substrate-client"
import { state } from "@react-rxjs/core"
import { get, set } from "idb-keyval"
import { withLogsRecorder } from "polkadot-api/logs-provider"
import { getSmProvider } from "polkadot-api/sm-provider"
import { mapObject } from "polkadot-api/utils"
import {
  ReplaySubject,
  catchError,
  filter,
  finalize,
  from,
  map,
  of,
  share,
  startWith,
  switchMap,
  take,
  tap,
} from "rxjs"
import { selectedChains$ } from "../ChainPicker"
import { chains } from "./smoldot"
import { createSignal } from "@react-rxjs/utils"

export const [changeUseCache$, setUseCache] = createSignal<boolean>()
export const useCache$ = state(changeUseCache$, true)

export const metadatas = mapObject(chains, (chain, key) => {
  const throughSmoldot$ = from(chain).pipe(
    map(getSmProvider),
    map((provider) =>
      withLogsRecorder((log) => console.log(key, log), provider),
    ),
    map(createClient),
    map(getObservableClient),
    switchMap((observableClient) => {
      const chainHead = observableClient.chainHead$()

      return chainHead.getRuntimeContext$(null).pipe(
        map((v) => v.metadata),
        take(1),
        finalize(() => {
          chainHead.unfollow()
        }),
      )
    }),
    tap({
      next: (result) => set(key, result),
    }),
  )

  const throughIDB$ = useCache$.pipe(
    take(1),
    switchMap(async (useCache) =>
      useCache ? get<V14 | V15 | undefined>(key) : undefined,
    ),
  )

  return throughIDB$.pipe(
    switchMap((result) => {
      if (!result) return throughSmoldot$
      return of(result)
    }),
    share({
      connector: () => new ReplaySubject(1),
      resetOnComplete: false,
      resetOnRefCountZero: false,
      resetOnError: true,
    }),
  )
})

export enum LoadStatus {
  Idle = "Idle",
  Loading = "Loading",
  Error = "Error",
  Loaded = "Loaded",
}
export const metadataLoadStatus$ = state(
  (chain: string) =>
    selectedChains$.pipe(
      filter((selection) => selection.has(chain)),
      take(1),
      switchMap(() =>
        metadatas[chain].pipe(
          map(() => LoadStatus.Loaded),
          startWith(LoadStatus.Loading),
          catchError((err) => {
            console.error(err)
            return of(LoadStatus.Error)
          }),
        ),
      ),
    ),
  LoadStatus.Idle,
)
