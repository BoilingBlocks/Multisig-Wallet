import { Component, Show, createSignal, JSX, Index } from "solid-js";
import { styles } from "./styles";
import { css } from "../styled-system/css";

type Props = {
  onCancel: () => void;
};

export const CreateWalletModal: Component<Props> = (props) => {
  const [owners, setOwners] = createSignal<string[]>([]);
  const [disabled, setDisabled] = createSignal(true);
  const [requiredSigs, setRequiredSigs] = createSignal<string>("1");
  const sigInputVisible = () => owners().length > 0;

  const handleOwnerInput = (e: InputEvent & { target: HTMLInputElement; currentTarget: HTMLInputElement }) => {
    if (e.target.value.trim() === "") {
      setDisabled(true);
      return;
    }

    setDisabled(false);
  };

  const handleAddOwner: JSX.EventHandler<HTMLFormElement, SubmitEvent> = (e) => {
    e.preventDefault();

    setOwners((prev) => {
      if (ownerInputRef !== undefined) {
        return [...prev, ownerInputRef.value];
      }
      return [...prev];
    });

    if (ownerInputRef !== undefined) {
      ownerInputRef.value = "";
    }

    if (ownersListRef !== undefined) {
      ownersListRef.scrollTop = ownersListRef.scrollHeight;
    }
  };

  let ownerInputRef: HTMLInputElement | undefined;
  let ownersListRef: HTMLUListElement | undefined;

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
              <ul class={styles.ownersListContainer} ref={ownersListRef}>
                <Index each={owners()}>
                  {(owner) => <li class={css({ color: "rose.600", fontWeight: "bold" })}>{owner()}</li>}
                </Index>
              </ul>
            </Show>
          </div>
          <div class={styles.addOwners}>
            <form onSubmit={handleAddOwner}>
              <input
                ref={ownerInputRef}
                id="ownerInput"
                type="text"
                placeholder="Multisig owner address"
                class={styles.addOwnersInput}
                onInput={handleOwnerInput}
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
          <button class={styles.modalCancelButton} onClick={props.onCancel}>
            Cancel
          </button>
          <button class={styles.modalCreateWalletButton} disabled={Boolean(owners().length === 0)}>
            Create Wallet
          </button>
        </div>
      </div>
    </div>
  );
};
