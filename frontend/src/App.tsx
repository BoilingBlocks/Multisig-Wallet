import { Component, For, Match, Show, Switch, createEffect, createResource, createSignal } from "solid-js";
import { css } from "../styled-system/css";
import { Card } from "./Card";
import { AuthOverlay } from "./AuthOverlay";
import { sepolia } from "@wagmi/core/chains";
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
  writeContract,
  waitForTransaction,
} from "@wagmi/core";
import { FACTORY_ABI, WALLET_ABI } from "./constants";
import { CreateWalletModal } from "./CreateWalletModal";
import { CONTRACT_ADDRESS } from "./config";
import { Spinner } from "./Spinner";
import { CreateTransactionModal } from "./CreateTransactionModal";
import { formatEther, hexToString } from "viem";
import { SystemStyleObject } from "../styled-system/types";
import {
  FaSolidCheck,
  FaSolidCircleXmark,
  FaSolidEnvelopeCircleCheck,
  FaSolidThumbsDown,
  FaSolidThumbsUp,
} from "solid-icons/fa";
import toast from "solid-toast";
import { alchemyProvider } from "@wagmi/core/providers/alchemy";

const setupClient = () => {
  const { chains, publicClient, webSocketPublicClient } = configureChains(
    [sepolia],
    [alchemyProvider({ apiKey: import.meta.env.VITE_ALCHEMY })]
  );
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

    const batchedReadCalls = new Array(Number(walletsCount)).fill(0).map((_, i) =>
      readContract({
        ...factoryContract,
        functionName: "getWallet",
        args: [BigInt(i)],
        account: account,
      })
    );

    const wallets = await Promise.all(batchedReadCalls);

    return wallets.reverse();
  } catch (e) {
    console.log(e);
    return [];
  }
};

const getBalance = async (walletAddress: `0x${string}`) => {
  return await fetchBalance({ address: walletAddress, formatUnits: "ether" });
};

const getTransactions = async ({
  walletAddress,
  account,
}: {
  walletAddress: `0x${string}` | undefined;
  account: `0x${string}` | undefined;
}) => {
  if (walletAddress === undefined || account === undefined) {
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

  const batchedReadCalls = new Array(Number(transactionsCount)).fill(0).map((_, i) =>
    readContract({
      ...walletContract,
      functionName: "transactions",
      args: [BigInt(i)],
      account,
    })
  );

  // const data = await readContracts({ contracts: batchedReadCalls });
  const data = await Promise.all(batchedReadCalls);
  // const tx = data.filter((el) => el.status === "success"); // Assuming all will succeed. Don't do this at home.

  // return tx.map((el) => el.result as [`0x${string}`, BigInt, `0x${string}`, boolean, BigInt]).reverse();
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

const getRequiredSigs = async (walletAddress: `0x${string}` | undefined) => {
  if (walletAddress === undefined) {
    return undefined;
  }

  try {
    return await readContract({
      address: walletAddress,
      abi: WALLET_ABI,
      functionName: "required",
    });
  } catch (e) {
    return undefined;
  }
};

const getApprovalStatuses = async ({
  transactions,
  walletAddress,
  account,
}: {
  transactions: (readonly [`0x${string}`, BigInt, `0x${string}`, boolean, BigInt])[] | undefined;
  walletAddress: `0x${string}` | undefined;
  account: `0x${string}` | undefined;
}) => {
  if (transactions === undefined || walletAddress === undefined || account === undefined) {
    return [];
  }

  const transactionsCount = transactions.length;

  if (transactionsCount === 0) {
    return [];
  }

  const walletContract = { address: walletAddress, abi: WALLET_ABI };

  const batchedReadCalls = new Array(transactionsCount).fill(0).map((_, i) =>
    readContract({
      ...walletContract,
      functionName: "approved",
      args: [BigInt(i), account],
      account,
    })
  );

  try {
    // const data = await readContracts({ contracts: batchedReadCalls });
    const data = await Promise.all(batchedReadCalls);

    return data.reverse();
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

        return [newWalletAddress, ...prev];
      });

    refetchWallets();
  };

  const handleCreateTransaction = (to: `0x${string}`, value: BigInt, data: `0x${string}`) => {
    mutateTransactions((prev) => {
      const newData = [to, value, data, false, BigInt(0)] as const;
      if (prev === undefined) {
        return [newData] as (readonly [`0x${string}`, bigint, `0x${string}`, boolean, bigint])[];
      }
      return [newData, ...prev] as (readonly [`0x${string}`, bigint, `0x${string}`, boolean, bigint])[];
    });

    refetchTransactions();
  };

  const handleApproveTx = async (index: number, walletAddress: `0x${string}` | undefined) => {
    try {
      if (transactions() === undefined || walletAddress === undefined) {
        throw new Error();
      }

      const transactionsMaxIndex = transactions()!.length - 1;
      const nonreversedIndex = Math.abs(index - transactionsMaxIndex); // ui reverses the indices so newest is on top. unreverse the index before interacting with contract
      console.log("nonreverse", nonreversedIndex);

      const result = await writeContract({
        abi: WALLET_ABI,
        address: walletAddress,
        functionName: "approve",
        args: [BigInt(nonreversedIndex)],
      });
      await waitForTransaction({ hash: result.hash });

      mutateApprovalStatuses((prev) => {
        if (prev === undefined) {
          return prev;
        }

        return prev.map((el, i) => {
          if (i === index) {
            return true;
          }
          return el;
        });
      });

      mutateTransactions((prev) => {
        return prev!.map((el, i) => {
          if (i === index) {
            // @ts-ignore
            return el.map((el2, j) => {
              if (j === 4 && typeof el2 === "bigint") {
                return ++el2;
              }

              return el2;
            }) as readonly [`0x${string}`, bigint, `0x${string}`, boolean, bigint];
          }
          return el as readonly [`0x${string}`, bigint, `0x${string}`, boolean, bigint];
        });
      });
      refetchTransactions();

      toast.success(
        <div
          class={css({
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "flex-start",
          })}
        >
          <p class={css({ color: "#065f46" })}>Transaction Approved</p>
        </div>,
        { style: { background: "#d1fae5" } }
      );
    } catch (e) {
      toast.error(
        <div
          class={css({
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "flex-start",
          })}
        >
          <p class={css({ color: "white" })}>Error</p>
        </div>,
        { style: { background: "red" } }
      );
    }
  };

  const handleRevokeTx = async (index: number, walletAddress: `0x${string}` | undefined) => {
    try {
      if (transactions() === undefined || walletAddress === undefined) {
        throw new Error();
      }

      const transactionsMaxIndex = transactions()!.length - 1;
      const nonreversedIndex = Math.abs(index - transactionsMaxIndex); // ui reverses the indices so newest is on top. unreverse the index before interacting with contract

      const result = await writeContract({
        abi: WALLET_ABI,
        address: walletAddress,
        functionName: "revoke",
        args: [BigInt(nonreversedIndex)],
      });
      await waitForTransaction({ hash: result.hash });

      mutateApprovalStatuses((prev) => {
        if (prev === undefined) {
          return prev;
        }

        return prev.map((el, i) => {
          if (i === index) {
            return false;
          }
          return el;
        });
      });

      mutateTransactions((prev) => {
        return prev!.map((el, i) => {
          if (i === index) {
            // @ts-ignore
            return el.map((el2, j) => {
              if (j === 4 && typeof el2 === "bigint") {
                return --el2;
              }

              return el2;
            }) as readonly [`0x${string}`, bigint, `0x${string}`, boolean, bigint];
          }
          return el as readonly [`0x${string}`, bigint, `0x${string}`, boolean, bigint];
        });
      });
      refetchTransactions();

      toast.success(
        <div
          class={css({
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "flex-start",
          })}
        >
          <p class={css({ color: "#065f46" })}>Transaction Revoked</p>
        </div>,
        { style: { background: "#d1fae5" } }
      );
    } catch (e) {
      toast.error(
        <div
          class={css({
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "flex-start",
          })}
        >
          <p class={css({ color: "white" })}>Error</p>
        </div>,
        { style: { background: "red" } }
      );
    }
  };

  const handleExecute = async (index: number, walletAddress: `0x${string}` | undefined) => {
    try {
      if (transactions() === undefined || walletAddress === undefined) {
        throw new Error();
      }

      const transactionsMaxIndex = transactions()!.length - 1;
      const nonreversedIndex = Math.abs(index - transactionsMaxIndex);

      const result = await writeContract({
        abi: WALLET_ABI,
        address: walletAddress,
        functionName: "execute",
        args: [BigInt(nonreversedIndex)],
      });
      await waitForTransaction({ hash: result.hash });

      // @ts-ignore
      mutateTransactions((prev) => {
        return prev!.map((el, i) => {
          if (i === index) {
            return el.map((el2, j) => {
              if (j === 3) {
                return true;
              }

              return el2;
            }) as [`0x${string}`, BigInt, `0x${string}`, boolean, BigInt];
          }
          return el;
        });
      });
      refetchTransactions();
      refetchBalance();

      toast.success(
        <div
          class={css({
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "flex-start",
          })}
        >
          <p class={css({ color: "#065f46" })}>Transaction Executed</p>
        </div>,
        { style: { background: "#d1fae5" } }
      );
    } catch (e) {
      toast.error(
        <div
          class={css({
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "flex-start",
          })}
        >
          <p class={css({ color: "white" })}>Error</p>
        </div>,
        { style: { background: "red" } }
      );
    }
  };

  const [showCreateWalletModal, setShowCreateWalletModal] = createSignal(false);
  const [showCreateTransactionModal, setShowCreateTransactionModal] = createSignal(false);
  const [selectedWallet, setSelectedWallet] = createSignal<`0x${string}`>();

  const [transactions, { refetch: refetchTransactions, mutate: mutateTransactions }] = createResource(
    () => ({ walletAddress: selectedWallet(), account: account() }),
    getTransactions
  );

  const [approvalStatuses, { mutate: mutateApprovalStatuses }] = createResource(
    () => ({ walletAddress: selectedWallet(), transactions: transactions(), account: account() }),
    getApprovalStatuses
  );

  const [owners] = createResource(selectedWallet, getOwners);
  const [balance, { refetch: refetchBalance, mutate: mutateBalance }] = createResource(selectedWallet, getBalance);
  const [requiredSigs] = createResource(selectedWallet, getRequiredSigs);

  createEffect(() => {
    if (account()) {
      setSelectedWallet(undefined);
      mutateBalance(undefined);
      mutateWallets(undefined);
    }
  });

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
                              color: wallet !== undefined && wallet === selectedWallet() ? "white" : "rose.600",
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
                              })]: wallet !== undefined && wallet === selectedWallet(),
                            }}
                          >
                            <button
                              class={css({
                                height: "100%",
                                width: "100%",
                                cursor: wallet !== selectedWallet() ? "pointer" : "initial",
                                color: "inherit",
                              })}
                              onClick={() =>
                                setSelectedWallet((prev) => {
                                  if (wallet === undefined) {
                                    return prev;
                                  }
                                  return wallet as `0x${string}`;
                                })
                              }
                            >
                              <span class={css({ color: "inherit" })}>{wallet as `0x${string}`}</span>
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
                        title={`Balance: ${balance()!.formatted}ETH`}
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
                                  height: "200px",
                                  width: "100%",
                                  listStyle: "none",
                                })}
                              >
                                <div
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
                                  <div class={css(txDetailRow)}>
                                    <div class={css(txDetailLabel)}>
                                      <p>EXECUTED</p>
                                    </div>
                                    <div class={css(txDetailInfo)}>
                                      <p class={css({ color: transaction[3] ? "sky.700" : "yellow.700" })}>
                                        {transaction[3] ? (
                                          <FaSolidCheck fill="#0369a1" />
                                        ) : (
                                          <FaSolidCircleXmark fill="#eab308" />
                                        )}
                                      </p>
                                    </div>
                                  </div>
                                  <div class={css(txDetailRow)}>
                                    <div class={css(txDetailLabel)}>
                                      <p>APPROVALS</p>
                                    </div>
                                    <div class={css(txDetailInfo)}>
                                      <p
                                        class={css({
                                          display: "flex",
                                          fontWeight: "bold",
                                        })}
                                        classList={{
                                          [css({ color: "yellow.600" })]:
                                            Number(transaction[4]) < Number(requiredSigs()!),
                                          [css({ color: "sky.700" })]: transaction[3],
                                          [css({ color: "emerald.700" })]:
                                            !transaction[3] && Number(transaction[4]) >= Number(requiredSigs()),
                                        }}
                                      >
                                        {transaction[4].toString()} /{"  "}
                                        <span>
                                          <Show
                                            when={requiredSigs() !== undefined}
                                            fallback={<Spinner width={20} height={20} />}
                                          >
                                            &nbsp;
                                            {requiredSigs()!.toString()}
                                          </Show>
                                        </span>
                                      </p>
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
                                    <div class={css(txDetailInfo)}>{formatEther(transaction[1])}&nbsp;ETH</div>
                                  </div>
                                  <div class={css(txDetailRow)}>
                                    <div class={css(txDetailLabel)}>
                                      <p>DATA</p>
                                    </div>
                                    <div class={css(txDetailInfo)}>"{hexToString(transaction[2])}"</div>
                                  </div>
                                  <div
                                    class={css({
                                      width: { base: "85%", mdToXl: "70%" },
                                      maxWidth: "600px",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "space-evenly",
                                    })}
                                  >
                                    <Switch>
                                      <Match when={transaction[3]}>
                                        <button
                                          class={css({
                                            ...txActionBtn,
                                            _disabled: {
                                              backgroundColor: "sky.300",
                                              borderColor: "sky.400",
                                              cursor: "not-allowed",
                                              _active: { transform: "none" },
                                            },
                                          })}
                                          disabled
                                        >
                                          <FaSolidEnvelopeCircleCheck fill="#fff" />
                                          Executed
                                        </button>
                                      </Match>
                                      <Match when={approvalStatuses.loading}>
                                        <Spinner />
                                      </Match>
                                      <Match when={approvalStatuses() !== undefined && approvalStatuses()![i()]}>
                                        <button
                                          class={css({
                                            ...txActionBtn,
                                            backgroundColor: "yellow.500",
                                            borderColor: "yellow.700",
                                            _hover: { backgroundColor: "yellow.600", borderColor: "yellow.800" },
                                          })}
                                          onClick={() => handleRevokeTx(i(), selectedWallet())}
                                        >
                                          <FaSolidThumbsDown fill="#fff" />
                                          Revoke
                                        </button>
                                        <button
                                          class={css({
                                            ...txActionBtn,
                                            backgroundColor: "sky.400",
                                            borderColor: "sky.600",
                                            _hover: { backgroundColor: "sky.600", borderColor: "sky.800" },
                                            _disabled: {
                                              backgroundColor: "gray.300",
                                              borderColor: "gray.400",
                                              cursor: "not-allowed",
                                              _hover: {
                                                backgroundColor: "gray.300",
                                                borderColor: "gray.400",
                                                cursor: "not-allowed",
                                              },
                                              _active: { transform: "none" },
                                            },
                                          })}
                                          onClick={() => handleExecute(i(), selectedWallet())}
                                          disabled={
                                            requiredSigs() !== undefined && Number(transaction[4]) < requiredSigs()!
                                          }
                                        >
                                          <FaSolidEnvelopeCircleCheck fill="#fff" />
                                          Execute
                                        </button>
                                      </Match>
                                      <Match when={approvalStatuses() !== undefined && !approvalStatuses()![i()]}>
                                        <button
                                          class={css({
                                            ...txActionBtn,
                                            backgroundColor: "emerald.400",
                                            borderColor: "emerald.600",
                                            _hover: { backgroundColor: "emerald.600", borderColor: "emerald.800" },
                                          })}
                                          onClick={() => handleApproveTx(i(), selectedWallet())}
                                        >
                                          <FaSolidThumbsUp fill="#fff" />
                                          Approve
                                        </button>
                                        <button
                                          class={css({
                                            ...txActionBtn,
                                            backgroundColor: "sky.400",
                                            borderColor: "sky.600",
                                            _hover: { backgroundColor: "sky.600", borderColor: "sky.800" },
                                            _disabled: {
                                              backgroundColor: "gray.300",
                                              borderColor: "gray.400",
                                              cursor: "not-allowed",
                                              _hover: {
                                                backgroundColor: "gray.300",
                                                borderColor: "gray.400",
                                                cursor: "not-allowed",
                                              },
                                              _active: { transform: "none" },
                                            },
                                          })}
                                          onClick={() => handleExecute(i(), selectedWallet())}
                                          disabled={
                                            requiredSigs() !== undefined && Number(transaction[4]) < requiredSigs()!
                                          }
                                        >
                                          <FaSolidEnvelopeCircleCheck fill="#fff" />
                                          Execute
                                        </button>
                                      </Match>
                                    </Switch>
                                  </div>
                                </div>
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

const txActionBtn: SystemStyleObject = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-evenly",
  width: "100px",
  backgroundColor: "rose.300",
  borderColor: "rose.600",
  borderWidth: "thin",
  color: "white",
  paddingX: "4",
  marginY: "2",
  borderRadius: "md",
  cursor: "pointer",
  transition: "all 0.15s ease 0s",
  _active: {
    transform: "translateY(4px)",
  },
};
