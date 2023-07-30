import { Component, Show, createSignal, JSX, For } from "solid-js";
import { styles } from "./styles";
import { css } from "../styled-system/css";
import { isAddress, trim } from "viem";
import { FaRegularTrashCan } from "solid-icons/fa";
import { waitForTransaction, writeContract } from "@wagmi/core";
import { CONTRACT_ADDRESS } from "./config";
import { FACTORY_ABI } from "./constants";

type Props = {
  close: () => void;
  onCreate: (newWalletAddress: `0x${string}`) => void;
};

export const CreateWalletModal: Component<Props> = (props) => {
  const [owners, setOwners] = createSignal<`0x${string}`[]>([]);
  const [disabled, setDisabled] = createSignal(true);
  const [requiredSigs, setRequiredSigs] = createSignal<string>("1");
  const [isDuplicate, setIsDuplicate] = createSignal(false);
  const [invalidAddress, setInvalidAddress] = createSignal(false);

  const sigInputVisible = () => owners().length > 0;

  const handleOwnerInput = (e: InputEvent & { target: HTMLInputElement; currentTarget: HTMLInputElement }) => {
    const trimmedInput = e.target.value.trim().toLowerCase();
    const isDuplicate = owners().some((owner) => owner.toLowerCase() === trimmedInput);
    switch (true) {
      case isAddress(trimmedInput) && isDuplicate:
        setDisabled(true);
        setInvalidAddress(false);
        setIsDuplicate(true);
        break;

      case isAddress(trimmedInput) && !isDuplicate:
        setDisabled(false);
        setInvalidAddress(false);
        setIsDuplicate(false);
        break;

      case !isAddress(trimmedInput) && !isDuplicate:
        setDisabled(true);
        setIsDuplicate(false);
        break;

      case !isAddress(trimmedInput):
        setDisabled(true);
        break;

      case isDuplicate:
        setDisabled(true);
        setInvalidAddress(false);
        setIsDuplicate(true);
        break;
    }
  };

  const handleAddOwner: JSX.EventHandler<HTMLFormElement, SubmitEvent> = (e) => {
    e.preventDefault();

    setOwners((prev) => {
      if (ownerInputRef !== undefined) {
        return [...prev, ownerInputRef.value.trim() as `0x${string}`];
      }
      return [...prev];
    });

    if (ownerInputRef !== undefined) {
      ownerInputRef.value = "";
    }

    if (Number(requiredSigs()) < 1) {
      setRequiredSigs("1");
    }

    setDisabled(true);
  };

  const handleOwnerInputBlur: JSX.EventHandler<HTMLInputElement, FocusEvent> = () => {
    if (ownerInputRef === undefined) {
      return;
    }

    const trimmedInput = ownerInputRef.value.trim().toLowerCase();
    const isDuplicate = owners().some((owner) => owner.toLowerCase() === trimmedInput);

    if (trimmedInput === "") {
      setInvalidAddress(false);
      setIsDuplicate(false);
      return;
    }

    if (!isAddress(trimmedInput)) {
      setInvalidAddress(true);
      return;
    }

    if (isDuplicate) {
      setIsDuplicate(true);
      return;
    }
  };

  const handleDeleteOwner =
    (owner: string): JSX.EventHandler<HTMLButtonElement, MouseEvent> =>
    () => {
      if (ownerInputRef === undefined) {
        return;
      }

      if (Number(requiredSigs()) === owners().length) {
        setRequiredSigs((prev) => `${Number(prev) - 1}`);
      }

      setOwners((prev) => prev.filter((el) => el !== owner));
    };

  const handleCreateWallet: JSX.EventHandler<HTMLButtonElement, MouseEvent> = async () => {
    try {
      const result = await writeContract({
        address: CONTRACT_ADDRESS,
        abi: FACTORY_ABI,
        functionName: "create",
        args: [owners(), BigInt(requiredSigs())],
      });

      const data = await waitForTransaction(result);
      const walletAddress = trim(data.logs[0].topics[1]!);

      props.onCreate(walletAddress);
      props.close();
    } catch (e) {
      console.error(e);
    }
  };

  let ownerInputRef: HTMLInputElement | undefined;

  return (
    <div class={styles.modalContainer}>
      <div class={styles.modalContent}>
        <h2 class={styles.modalTitle}>Create New Wallet</h2>
        <div class={styles.modalBody}>
          <div class={styles.ownersContent}>
            <Show when={owners().length} fallback={<h3 class={styles.ownersTitle}>Owners</h3>}>
              <h3 class={styles.ownersTitle}>
                {owners().length > 1 ? `(${owners().length}) owners` : `(${owners().length}) owner`}
              </h3>
            </Show>
            <Show when={owners().length} fallback={<h3 class={styles.ownersNoneText}>None!</h3>}>
              <ul class={styles.ownersListContainer}>
                <For each={owners()}>
                  {(owner) => (
                    <li
                      class={css({
                        color: "rose.600",
                        fontWeight: "bold",
                        display: "flex",
                        justifyContent: "space-around",
                        alignItems: "center",
                      })}
                    >
                      {owner}
                      <button class={css({ cursor: "pointer" })} onClick={handleDeleteOwner(owner)}>
                        <FaRegularTrashCan />
                      </button>
                    </li>
                  )}
                </For>
              </ul>
            </Show>
          </div>
          <div class={styles.addOwners}>
            <form onSubmit={handleAddOwner} class={css({ position: "relative" })}>
              {isDuplicate() && (
                <span class={css({ color: "rose.400", fontSize: "xs", position: "absolute", top: "-5" })}>
                  Duplicate owner not allowed
                </span>
              )}
              {invalidAddress() && (
                <span class={css({ color: "rose.400", fontSize: "xs", position: "absolute", top: "-5" })}>
                  Invalid address
                </span>
              )}
              <input
                ref={ownerInputRef}
                id="ownerInput"
                type="text"
                placeholder="Multisig owner address"
                class={styles.addOwnersInput}
                onInput={handleOwnerInput}
                onBlur={handleOwnerInputBlur}
              />
              <button type="submit" class={styles.addOwnersButton} disabled={disabled()}>
                Add Owner
              </button>
            </form>
          </div>
          <div class={styles.requiredSigs}>
            <Show when={sigInputVisible()} fallback={<div class={css({ height: "54px" })} />}>
              <label for="requiredSigs" class={styles.requiredSigsLabel}>
                # of Required Signatures
              </label>
              <input
                id="requiredSigs"
                type="number"
                value={requiredSigs()}
                onChange={(e) => setRequiredSigs(e.target.value)}
                class={styles.requiredSigsInput}
                min={1}
                max={owners().length || 1}
              />
            </Show>
          </div>
        </div>
        <div class={styles.modalActionButtonsContainer}>
          <button class={styles.modalCancelButton} onClick={props.close}>
            Cancel
          </button>
          <button
            onClick={handleCreateWallet}
            class={styles.modalCreateWalletButton}
            disabled={Boolean(owners().length === 0)}
          >
            Create Wallet
          </button>
        </div>
      </div>
    </div>
  );
};
