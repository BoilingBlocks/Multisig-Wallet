import { Component, For, Show, createResource, createSignal } from "solid-js";
import { css } from "../styled-system/css";
import { Card } from "./Card";
import { AuthOverlay } from "./AuthOverlay";
import { publicProvider } from "@wagmi/core/providers/public";
import { hardhat } from "@wagmi/core/chains";
import {
  InjectedConnector,
  configureChains,
  connect,
  createConfig,
  switchNetwork,
  watchAccount,
  readContract,
  readContracts,
} from "@wagmi/core";
import { FACTORY_ABI, LOCAL_CONTRACT_ADDRESS } from "./constants";
import { CreateWalletModal } from "./CreateWalletModal";

const ADDRESS = LOCAL_CONTRACT_ADDRESS;

const setupClient = () => {
  const { chains, publicClient, webSocketPublicClient } = configureChains([hardhat], [publicProvider()]);
  createConfig({
    autoConnect: true,
    publicClient,
    webSocketPublicClient,
  });

  const [account, setAccount] = createSignal<`0x${string}`>();
  watchAccount((account) => {
    if (!account.isConnected) {
      setAccount(undefined);
      return;
    }

    setAccount(account.address);
  });

  return { account, setAccount, chains };
};

const getWallets = async (account: `0x${string}` | undefined) => {
  if (account === undefined) {
    return [];
  }

  const factoryContract = { address: ADDRESS as `0x${string}`, abi: FACTORY_ABI };
  const walletsCount = await readContract({
    ...factoryContract,
    functionName: "walletsCount",
    args: [account],
  });

  if (Number(walletsCount) === 0) {
    return [];
  }

  const batchedReadCalls = new Array(Number(walletsCount)).fill(0).map((_, i) => ({
    ...factoryContract,
    functionName: "getWallet",
    args: [i],
  }));

  const wallets = await readContracts({ contracts: batchedReadCalls });

  console.log(wallets);

  return wallets;
};

const App: Component = () => {
  const { account, setAccount, chains } = setupClient();

  const [wallets, { mutate, refetch }] = createResource(account, getWallets);

  const handleConnectWallet = async () => {
    try {
      const result = await connect({
        connector: new InjectedConnector({ chains }),
      });
      await switchNetwork({
        chainId: chains[0].id,
      });
      setAccount(result.account);
    } catch (e) {}
  };

  const [showCreateWalletModal, setShowCreateWalletModal] = createSignal(false);

  return (
    <>
      {!account() && <AuthOverlay onConnectWallet={handleConnectWallet} />}
      {showCreateWalletModal() && <CreateWalletModal onCancel={() => setShowCreateWalletModal(false)} />}
      <div class={css({ md: { display: "flex", height: "90vh" }, width: "100%" })}>
        <Card title="Wallets">
          <div class={css({ height: "100%", width: "100%", backgroundColor: "rose.100" })}>
            {wallets.loading && <p class={css(styles)}>Loading...</p>}
            <Show
              when={!wallets.loading && wallets()?.length}
              fallback={<p class={css(styles)}>No Multisig Wallets!</p>}
            >
              <For each={wallets()}>{(wallet) => <div>wallet</div>}</For>
            </Show>
          </div>
          <button class={css(createWalletStyles)} onClick={() => setShowCreateWalletModal(true)}>
            Create New
          </button>
        </Card>
        <Card title="Transactions">
          <div class={css({ height: "100%", backgroundColor: "rose.100" })}></div>
        </Card>
      </div>
    </>
  );
};

export default App;

const styles = {
  height: "100%",
  width: "100%",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  fontSize: "2xl",
  color: "rose.800",
};

const createWalletStyles = {
  position: "absolute",
  bottom: "3",
  right: "3",
  backgroundColor: "rose.300",
  padding: "2",
  borderRadius: "lg",
  color: "white",
  fontWeight: "bold",
  cursor: "pointer",
  borderWidth: "thin",
  borderColor: "rose.600",
  boxShadow: "0px 4px 12px rgba(0, 0, 0, 0.2)",
  transition: "all 0.3s ease 0s",
  _hover: {
    backgroundColor: "rose.500",
  },
  _active: {
    transform: "translateY(7px)",
  },
} as const;
