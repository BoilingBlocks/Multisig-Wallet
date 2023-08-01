import { Component } from "solid-js";
import { styles } from "./styles";
import { css } from "../styled-system/css";

type Props = {
  close: () => void;
};

export const CreateTransactionModal: Component<Props> = (props) => {
  return (
    <div class={styles.modalContainer}>
      <div class={styles.modalContent}>
        <h2 class={styles.modalTitle}>Submit New Transaction</h2>
        <form
          class={css({
            height: "100%",
            width: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-evenly",
            alignItems: "center",
          })}
        >
          <div class={css({ color: "rose.400", width: "80%", display: "flex", justifyContent: "space-between" })}>
            <label for="txTo">TO</label>
            <input id="txTo" type="text" class={css({ borderRadius: "md" })} />
          </div>
          <div class={css({ color: "rose.400", width: "80%", display: "flex", justifyContent: "space-between" })}>
            <label for="txVal">VALUE</label>
            <input id="txVal" type="text" class={css({ borderRadius: "md" })} />
          </div>
          <div class={css({ color: "rose.400", width: "80%", display: "flex", justifyContent: "space-between" })}>
            <label for="txData">DATA</label>
            <input id="txData" type="text" class={css({ borderRadius: "md" })} />
          </div>
        </form>
        <div class={styles.modalActionButtonsContainer}>
          <button class={styles.modalCancelButton} onClick={props.close}>
            Cancel
          </button>
          <button class={styles.modalCreateWalletButton}>Submit Tx</button>
        </div>
      </div>
    </div>
  );
};
