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
import { hexToString } from "viem";
import { SystemStyleObject } from "../styled-system/types";

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
  const tx = data.filter((el) => el.status === "success"); // Assuming all will succeed. Don't do this at home.

  return tx.map((el) => el.result as [`0x${string}`, BigInt, `0x${string}`, boolean]).reverse();
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

  const handleCreateTransaction = (to: `0x${string}`, value: BigInt, data: `0x${string}`) => {
    mutateTransactions((prev) => {
      if (prev === undefined) {
        return [[to, value, data, false]];
      }
      return [[to, value, data, false], ...prev];
    });

    refetchTransactions();
  };

  const [showCreateWalletModal, setShowCreateWalletModal] = createSignal(false);
  const [showCreateTransactionModal, setShowCreateTransactionModal] = createSignal(false);
  const [selectedWallet, setSelectedWallet] = createSignal<`0x${string}`>();

  const [transactions, { refetch: refetchTransactions, mutate: mutateTransactions }] = createResource(
    selectedWallet,
    getTransactions
  );
  const [owners] = createResource(selectedWallet, getOwners);
  const [balance, { /* refetch: refetchBalance,*/ mutate: mutateBalance }] = createResource(selectedWallet, getBalance);

  createEffect(() => {
    if (account()) {
      setSelectedWallet(undefined);
      mutateBalance(undefined);
      mutateWallets(undefined);
    }
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
          <CreateTransactionModal
            close={() => setShowCreateTransactionModal(false)}
            wallet={selectedWallet()!}
            onCreate={handleCreateTransaction}
          />
        </Match>
        <Match when={true}>
          <Show when={account()} fallback={<AuthOverlay onConnectWallet={handleConnectWallet} />}>
            <div class={css({ lg: { display: "flex", height: "90vh" }, width: "100%" })}>
              <Card title="Your Multisig Wallets">
                <div class={css({ height: "100%", width: "100%", backgroundColor: "rose.100", overflow: "auto" })}>
                  {wallets.loading && wallets() === undefined && (
                    <div class={css(centerStuff)}>
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
                              [css({
                                backgroundColor: { base: "rose.600", _hover: "rose.600" },
                                color: "white",
                              })]: wallet !== undefined && wallet.result === selectedWallet(),
                            }}
                          >
                            <button
                              class={css({
                                height: "100%",
                                width: "100%",
                                cursor: wallet.result !== selectedWallet() ? "pointer" : "initial",
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
                    <div class={css({ height: "100%", width: "100%", backgroundColor: "rose.100", overflow: "auto" })}>
                      <Switch>
                        <Match when={wallets() === undefined && wallets.loading}>
                          <div class={css(centerStuff)}>
                            <Spinner />
                          </div>
                        </Match>
                        <Match when={wallets()?.length === 0}>
                          <div class={css(centerStuff)}>
                            <p class={css(styles)}>Create a wallet to get started.</p>
                          </div>
                        </Match>
                        <Match when={wallets()?.length && selectedWallet() === undefined}>
                          <div class={css(centerStuff)}>
                            <p class={css(styles)}>Select a wallet</p>
                          </div>
                        </Match>
                        <Match when={transactions.loading}>
                          <div class={css(centerStuff)}>
                            <Spinner />
                          </div>
                        </Match>
                        <Match when={!transactions.loading && transactions()?.length}>
                          <For each={transactions()}>
                            {(transaction, i) => (
                              <li
                                class={css({
                                  height: "150px",
                                  width: "100%",
                                  listStyle: "none",
                                })}
                              >
                                <button
                                  class={css({
                                    width: "inherit",
                                    height: "inherit",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-evenly",
                                    flexDirection: "column",
                                    borderBottomWidth: "medium",
                                    borderBottomColor: "rose.200",
                                    color: "rose.600",
                                    fontSize: { base: "sm", lg: "xs", xl: "sm", "2xl": "md" },
                                  })}
                                  classList={{
                                    [css({ borderTopColor: "rose.200", borderTopWidth: "medium" })]: i() === 0,
                                  }}
                                >
                                  {/* 
                                      executed: yes = green / no = yellow,
                                      approvals: executed = green / not enough approvals = yellow / ready to execute = blue
                                      to, 
                                      value, 
                                      data,
                                  */}
                                  <div class={css(txDetailRow)}>
                                    <div class={css(txDetailLabel)}>
                                      <p>EXECUTED</p>
                                    </div>
                                    <div class={css(txDetailInfo)}>
                                      <p>{JSON.stringify(transaction[3])}</p>
                                    </div>
                                  </div>
                                  <div class={css(txDetailRow)}>
                                    <div class={css(txDetailLabel)}>
                                      <p>TO</p>
                                    </div>
                                    <div
                                      class={css({
                                        ...txDetailInfo,
                                        fontSize: { base: "xs", lg: "xx-small", xl: "xs", "2xl": "sm" },
                                      })}
                                    >
                                      {transaction[0]}
                                    </div>
                                  </div>
                                  <div class={css(txDetailRow)}>
                                    <div class={css(txDetailLabel)}>
                                      <p>VALUE</p>
                                    </div>
                                    <div class={css(txDetailInfo)}>{transaction[1].toString()}ETH</div>
                                  </div>
                                  <div class={css(txDetailRow)}>
                                    <div class={css(txDetailLabel)}>
                                      <p>DATA</p>
                                    </div>
                                    <div class={css(txDetailInfo)}>"{hexToString(transaction[2])}"</div>
                                  </div>
                                </button>
                              </li>
                            )}
                          </For>
                        </Match>
                        <Match when={transactions()?.length === 0}>
                          <div class={css(centerStuff)}>
                            <p class={css(styles)}>No transactions</p>
                          </div>
                        </Match>
                      </Switch>
                    </div>
                    {selectedWallet() && (
                      <button class={css(createWalletStyles)} onClick={() => setShowCreateTransactionModal(true)}>
                        + New Transaction
                      </button>
                    )}
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
                          <div class={css(centerStuff)}>
                            <Spinner />
                          </div>
                        </Match>
                        <Match when={selectedWallet() === undefined}>
                          <div class={css(centerStuff)}>
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

const styles: SystemStyleObject = {
  height: "100%",
  width: "100%",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  fontSize: "2xl",
  color: "rose.800",
};

const createWalletStyles: SystemStyleObject = {
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
  transition: "all 0.15s ease 0s",
  _hover: {
    backgroundColor: "rose.500",
  },
  _active: {
    transform: "translateY(7px)",
  },
} as const;

const centerStuff: SystemStyleObject = {
  width: "100%",
  height: "100%",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
};

const txDetailRow: SystemStyleObject = {
  width: { base: "85%", mdToXl: "70%" },
  maxWidth: "600px",
  display: "flex",
};

const txDetailLabel: SystemStyleObject = {
  width: "25%",
  maxWidth: "240px",
  display: "flex",
  justifyContent: "flex-start",
  alignItems: "center",
};

const txDetailInfo: SystemStyleObject = {
  width: "75%",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
};
