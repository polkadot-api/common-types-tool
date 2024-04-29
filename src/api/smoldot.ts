import { startFromWorker } from "polkadot-api/smoldot/from-worker"
import SmWorker from "polkadot-api/smoldot/worker?worker"
import { Chain } from "smoldot"

export const smoldot = startFromWorker(new SmWorker())

const chainImports = {
  polkadot: {
    relayChain: import("polkadot-api/chains/polkadot"),
    assetHub: import("polkadot-api/chains/polkadot_asset_hub"),
    bridgeHub: import("polkadot-api/chains/polkadot_bridge_hub"),
    collectives: import("polkadot-api/chains/polkadot_collectives"),
  },
  kusama: {
    relayChain: import("polkadot-api/chains/ksmcc3"),
    assetHub: import("polkadot-api/chains/ksmcc3_asset_hub"),
    bridgeHub: import("polkadot-api/chains/ksmcc3_bridge_hub"),
  },
  rococo: {
    relayChain: import("polkadot-api/chains/rococo_v2_2"),
    assetHub: import("polkadot-api/chains/rococo_v2_2_asset_hub"),
    bridgeHub: import("polkadot-api/chains/rococo_v2_2_bridge_hub"),
  },
  westend: {
    relayChain: import("polkadot-api/chains/westend2"),
    assetHub: import("polkadot-api/chains/westend2_asset_hub"),
    bridgeHub: import("polkadot-api/chains/westend2_bridge_hub"),
    collectives: import("polkadot-api/chains/westend2_collectives"),
  },
}

export const chains: Record<string, Promise<Chain>> = Object.fromEntries(
  Object.entries(chainImports).flatMap(([key, chains]) => {
    const { relayChain, ...parachains } = chains

    const chainRelayChain = new Promise<Chain>(() => {})
    relayChain.then(({ chainSpec }) =>
      smoldot.addChain({
        chainSpec,
      }),
    )
    const parachainChains = Object.entries(parachains).map(
      ([parachainKey, parachain]) =>
        [
          `${key}.${parachainKey}`,
          Promise.all([chainRelayChain, parachain]).then(
            ([chainRelayChain, parachain]) =>
              smoldot.addChain({
                chainSpec: parachain.chainSpec,
                potentialRelayChains: [chainRelayChain],
              }),
          ),
        ] as const,
    )

    return [[key, chainRelayChain], ...parachainChains]
  }),
)
