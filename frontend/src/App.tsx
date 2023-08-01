import { Component, For, Match, Show, Switch, createEffect, createResource, createSignal } from "solid-js";
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
  fetchBalance,
} from "@wagmi/core";
import { FACTORY_ABI, WALLET_ABI } from "./constants";
import { CreateWalletModal } from "./CreateWalletModal";
import { CONTRACT_ADDRESS } from "./config";
import { Spinner } from "./Spinner";
import { CreateTransactionModal } from "./CreateTransactionModal";

const setupClient = () => {
  const { chains, publicClient, webSocketPublicClient } = configureChains([hardhat], [publicProvider()]);
  createConfig({
    autoConnect: true,
    publicClient,
    webSocketPublicClient,
  });

  const [account, setAccount] = createSignal<`0x${string}`>();
  watchAccount(async (account) => {
    console.log(account);
    if (!account.isConnected) {
      setAccount(undefined);
      return;
    }

    setAccount(account.address);
  });

  return { account, setAccount, chains };
};

const getWallets = async (account: `0x${string}` | undefined) => {
  console.log("getting wallet for:", account);
  if (account === undefined) {
    return [];
  }

  try {
    const factoryContract = { address: CONTRACT_ADDRESS as `0x${string}`, abi: FACTORY_ABI };
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
    console.log(wallets.filter((el) => typeof el.result === "string").reverse());

    return wallets.filter((el) => typeof el.result === "string").reverse();
  } catch (e) {
    return [];
  }
};

const getBalance = async (walletAddress: `0x${string}`) => {
  return await fetchBalance({ address: walletAddress });
};

const getTransactions = async (walletAddress: `0x${string}` | undefined) => {
  if (walletAddress === undefined) {
    return [];
  }

  const walletContract = { address: walletAddress, abi: WALLET_ABI };

  const transactionsCount = await readContract({
    ...walletContract,
    functionName: "transactionsCount",
  });

  if (transactionsCount < 1) {
    return [];
  }

  const batchedReadCalls = new Array(Number(transactionsCount)).fill(0).map((_, i) => ({
    ...walletContract,
    functionName: "transactions",
    args: [i],
  }));

  const data = await readContracts({ contracts: batchedReadCalls });

  return data.reverse();
};

const getOwners = async (walletAddress: `0x${string}` | undefined) => {
  if (walletAddress === undefined) {
    return [];
  }

  const walletContract = { address: walletAddress, abi: WALLET_ABI };

  try {
    const ownersCount = await readContract({
      ...walletContract,
      functionName: "ownersCount",
    });

    if (ownersCount < 1) {
      return [];
    }

    const batchedReadCalls = new Array(Number(ownersCount)).fill(0).map((_, i) => ({
      ...walletContract,
      functionName: "owners",
      args: [i],
    }));

    const data = await readContracts({ contracts: batchedReadCalls });

    return data.filter((el) => el.status === "success").map((el) => el.result as `0x${string}`);
  } catch (e) {
    return [];
  }
};

const App: Component = () => {
  const { account, setAccount, chains } = setupClient();

  const [wallets, { mutate: mutateWallets, refetch: refetchWallets }] = createResource(account, getWallets);

  const handleConnectWallet = async () => {
    try {
      const result = await connect({
        connector: new InjectedConnector({ chains }),
      });
      await switchNetwork({
        chainId: chains[0].id,
      });
      setAccount(result.account);
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateWallet = (newWalletAddress: `0x${string}`, owners: `0x${string}`[]) => {
    if (account() !== undefined && owners.map((el) => el.toLowerCase()).includes(account()!.toLowerCase()))
      mutateWallets((prev) => {
        if (prev === undefined) {
          return [];
        }

        return [{ status: "success", result: newWalletAddress }, ...prev];
      });

    refetchWallets();
  };

  const [showCreateWalletModal, setShowCreateWalletModal] = createSignal(false);
  const [showCreateTransactionModal, setShowCreateTransactionModal] = createSignal(false);
  const [selectedWallet, setSelectedWallet] = createSignal<`0x${string}`>();

  const [transactions] = createResource(selectedWallet, getTransactions);
  const [owners] = createResource(selectedWallet, getOwners);
  const [balance, { refetch: refetchBalance, mutate: mutateBalance }] = createResource(selectedWallet, getBalance);

  createEffect(() => {
    if (account()) {
      setSelectedWallet(undefined);
      mutateBalance(undefined);
      mutateWallets(undefined);
    }
    // (() => console.log(wallets()))();
  });

  // onMount(() => {
  //   toast.success(
  //     <div
  //       class={css({
  //         width: "100%",
  //         height: "100%",
  //         display: "flex",
  //         flexDirection: "column",
  //         justifyContent: "center",
  //         alignItems: "flex-start",
  //       })}
  //     >
  //       <p class={css({ color: "#065f46" })}>Multisig Wallet Created!</p>
  //       <p class={css({ color: "#065f46" })}>0x23r23r23rf2-0fjawe-f0awgt4gawg</p>
  //     </div>,
  //     { style: { background: "#d1fae5" } }
  //   );
  // });

  return (
    <>
      <Switch>
        <Match when={showCreateWalletModal()}>
          <CreateWalletModal close={() => setShowCreateWalletModal(false)} onCreate={handleCreateWallet} />
        </Match>
        <Match when={showCreateTransactionModal()}>
          <CreateTransactionModal close={() => setShowCreateTransactionModal(false)} />
        </Match>
        <Match when={true}>
          <Show when={account()} fallback={<AuthOverlay onConnectWallet={handleConnectWallet} />}>
            <div class={css({ lg: { display: "flex", height: "90vh" }, width: "100%" })}>
              <Card title="Your Multisig Wallets">
                <div class={css({ height: "100%", width: "100%", backgroundColor: "rose.100", overflow: "auto" })}>
                  {wallets.loading && wallets() === undefined && (
                    <div
                      class={css({
                        width: "100%",
                        height: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      })}
                    >
                      <Spinner />
                    </div>
                  )}
                  <Show when={wallets()?.length} fallback={<p class={css(styles)}>No Multisig Wallets!</p>}>
                    <ul>
                      <For each={wallets()}>
                        {(wallet) => (
                          <li
                            class={css({
                              height: "60px",
                              width: "100%",
                              display: "flex",
                              justifyContent: "center",
                              alignItems: "center",
                              color: wallet !== undefined && wallet.result === selectedWallet() ? "white" : "rose.600",
                              _hover: {
                                backgroundColor: "rose.200",
                              },
                              borderColor: "rose.200",
                              borderWidth: "thin",
                              fontSize: { base: "sm", lg: "xs", xl: "sm", "2xl": "md" },
                            })}
                            classList={{
                              [css({ backgroundColor: { base: "rose.600", _hover: "rose.600" }, color: "white" })]:
                                wallet !== undefined && wallet.result === selectedWallet(),
                            }}
                          >
                            <button
                              class={css({
                                height: "100%",
                                width: "100%",
                                cursor: "pointer",
                                color: "inherit",
                              })}
                              onClick={() =>
                                setSelectedWallet((prev) => {
                                  if (wallet === undefined) {
                                    return prev;
                                  }
                                  return wallet.result as `0x${string}`;
                                })
                              }
                            >
                              <span class={css({ color: "inherit" })}>{wallet.result as `0x${string}`}</span>
                            </button>
                          </li>
                        )}
                      </For>
                    </ul>
                  </Show>
                </div>
                <Switch>
                  <Match when={account() !== undefined && !wallets.loading}>
                    <button class={css(createWalletStyles)} onClick={() => setShowCreateWalletModal(true)}>
                      + New Wallet
                    </button>
                  </Match>
                </Switch>
              </Card>
              <div class={css({ display: "flex", flexDirection: "column", width: "100%" })}>
                <div class={css({ width: "100%", display: "flex", justifyContent: "center" })}>
                  <Switch
                    fallback={<Card title={`Balance: ---`} height="initial" width="100%" lg={{ width: "100%" }} />}
                  >
                    <Match when={balance.loading}>
                      <Card title={`Balance: loading...`} height="initial" width="100%" lg={{ width: "100%" }} />
                    </Match>
                    <Match when={balance()}>
                      <Card
                        title={`Balance: ${balance()!.value}ETH`}
                        height="initial"
                        width="100%"
                        lg={{ width: "100%" }}
                      />
                    </Match>
                  </Switch>
                </div>
                <div class={css({ height: "100%", display: "flex", flexDirection: { base: "column", lg: "row" } })}>
                  <Card title="Transactions">
                    <div class={css({ height: "100%", backgroundColor: "rose.100" })}>
                      <div
                        class={css({
                          width: "100%",
                          height: "100%",
                          display: "flex",
                          justifyContent: "center",
                          alignItems: "center",
                        })}
                      >
                        <Switch>
                          <Match when={wallets() === undefined && wallets.loading}>
                            <Spinner />
                          </Match>
                          <Match when={wallets()?.length === 0}>
                            <p class={css(styles)}>Create a wallet to get started.</p>
                          </Match>
                          <Match when={wallets()?.length && selectedWallet() === undefined}>
                            <p class={css(styles)}>Select a wallet</p>
                          </Match>
                          <Match when={transactions.loading}>
                            <Spinner />
                          </Match>
                          <Match when={!transactions.loading && transactions.length}>
                            <For each={transactions()}>{(transaction) => <p>{JSON.stringify(transaction)}</p>}</For>
                          </Match>
                          <Match when={transactions.length === 0}>
                            <p class={css(styles)}>No transactions</p>
                          </Match>
                        </Switch>
                      </div>
                      {selectedWallet() && (
                        <button class={css(createWalletStyles)} onClick={() => setShowCreateTransactionModal(true)}>
                          + New Transaction
                        </button>
                      )}
                    </div>
                  </Card>
                  <Card
                    title={
                      owners() === undefined
                        ? "Owners"
                        : owners()?.length === 1
                        ? "(1) Owner"
                        : `(${owners()?.length}) Owners`
                    }
                  >
                    <div class={css({ height: "100%", backgroundColor: "rose.100" })}>
                      <Switch>
                        <Match when={(wallets() === undefined && wallets.loading) || owners.loading}>
                          <div
                            class={css({
                              width: "100%",
                              height: "100%",
                              display: "flex",
                              justifyContent: "center",
                              alignItems: "center",
                            })}
                          >
                            <Spinner />
                          </div>
                        </Match>
                        <Match when={selectedWallet() === undefined}>
                          <div
                            class={css({
                              width: "100%",
                              height: "100%",
                              display: "flex",
                              justifyContent: "center",
                              alignItems: "center",
                            })}
                          >
                            <p class={css(styles)}>N/A</p>
                          </div>
                        </Match>
                        <Match when={owners()?.length}>
                          <ul>
                            <For each={owners()}>
                              {(owner) => (
                                <li
                                  class={css({
                                    height: "60px",
                                    width: "100%",
                                    display: "flex",
                                    justifyContent: "center",
                                    alignItems: "center",
                                    color: "rose.600",
                                    borderColor: "rose.200",
                                    borderWidth: "thin",
                                    fontSize: { base: "sm", lg: "xs", xl: "sm", "2xl": "md" },
                                  })}
                                >
                                  {owner}
                                </li>
                              )}
                            </For>
                          </ul>
                        </Match>
                      </Switch>
                    </div>
                  </Card>
                </div>
              </div>
            </div>
          </Show>
        </Match>
      </Switch>
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
