import { startFromWorker } from "polkadot-api/smoldot/from-worker"
import SmWorker from "polkadot-api/smoldot/worker?worker"
import { Observable, combineLatest, defer, switchMap } from "rxjs"
import { Chain } from "smoldot"
import { persistSubscription } from "../lib/persistSubscription"

export const smoldot = startFromWorker(new SmWorker())

const chainImports = {
  polkadot: {
    relayChain: import("polkadot-api/chains/polkadot"),
    assetHub: import("polkadot-api/chains/polkadot_asset_hub"),
    bridgeHub: import("polkadot-api/chains/polkadot_bridge_hub"),
    collectives: import("polkadot-api/chains/polkadot_collectives"),
    people: import("polkadot-api/chains/polkadot_people"),
  },
  kusama: {
    relayChain: import("polkadot-api/chains/ksmcc3"),
    assetHub: import("polkadot-api/chains/ksmcc3_asset_hub"),
    bridgeHub: import("polkadot-api/chains/ksmcc3_bridge_hub"),
    people: import("polkadot-api/chains/ksmcc3_people"),
  },
  rococo: {
    relayChain: import("polkadot-api/chains/rococo_v2_2"),
    assetHub: import("polkadot-api/chains/rococo_v2_2_asset_hub"),
    bridgeHub: import("polkadot-api/chains/rococo_v2_2_bridge_hub"),
    people: import("polkadot-api/chains/rococo_v2_2_people"),
  },
  westend: {
    relayChain: import("polkadot-api/chains/westend2"),
    assetHub: import("polkadot-api/chains/westend2_asset_hub"),
    bridgeHub: import("polkadot-api/chains/westend2_bridge_hub"),
    collectives: import("polkadot-api/chains/westend2_collectives"),
    people: import("polkadot-api/chains/westend2_people"),
  },
}

export const chains: Record<string, Observable<Chain>> = Object.fromEntries(
  Object.entries(chainImports).flatMap(([key, chains]) => {
    const { relayChain, ...parachains } = chains

    const chainRelayChain = defer(() =>
      relayChain.then(({ chainSpec }) =>
        smoldot.addChain({
          chainSpec,
        }),
      ),
    ).pipe(persistSubscription())
    const parachainChains = Object.entries(parachains).map(
      ([parachainKey, parachain]) =>
        [
          `${key}.${parachainKey}`,
          combineLatest([chainRelayChain, parachain]).pipe(
            switchMap(([chainRelayChain, parachain]) =>
              smoldot.addChain({
                chainSpec: parachain.chainSpec,
                potentialRelayChains: [chainRelayChain],
              }),
            ),
            persistSubscription(),
          ),
        ] as const,
    )

    return [[key, chainRelayChain], ...parachainChains]
  }),
)
