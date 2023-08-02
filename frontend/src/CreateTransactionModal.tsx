import { Component, createSignal } from "solid-js";
import { styles } from "./styles";
import { css } from "../styled-system/css";
import { isAddress, toHex } from "viem";
import { waitForTransaction, writeContract } from "@wagmi/core";
import { WALLET_ABI } from "./constants";
import toast from "solid-toast";

type Props = {
  close: () => void;
  wallet: `0x${string}`;
  onCreate: (to: `0x${string}`, value: BigInt, data: `0x${string}`) => void;
};

export const CreateTransactionModal: Component<Props> = (props) => {
  const [toAddress, setToAddress] = createSignal("");
  const [value, setValue] = createSignal(BigInt(0));
  const [data, setData] = createSignal("");

  const handleSubmit = async () => {
    const TO = toAddress() as `0x${string}`;
    const VALUE = value();
    const DATA = toHex(data());

    const { hash } = await writeContract({
      address: props.wallet,
      abi: WALLET_ABI,
      functionName: "submit",
      args: [TO, VALUE, DATA],
    });
    await waitForTransaction({ hash });

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
        <p class={css({ color: "#065f46" })}>Transaction was submitted</p>
      </div>,
      { style: { background: "#d1fae5" } }
    );

    props.onCreate(TO, VALUE, DATA);
    props.close();
  };

  return (
    <div class={styles.modalContainer}>
      <div class={styles.modalContent}>
        <h2 class={styles.modalTitle}>Submit New Transaction</h2>
        <div
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
            <div class={css({ position: "relative" })}>
              {toAddress().length > 0 && !isAddress(toAddress()) && (
                <span class={css({ position: "absolute", bottom: "-5", color: "red.500", fontSize: "xs" })}>
                  Invalid Address
                </span>
              )}
              <input
                id="txTo"
                type="text"
                class={css({
                  borderRadius: "md",
                  borderWidth: "thin",
                  borderColor: "rose.300",
                  _focus: { outlineWidth: "medium", outlineColor: "rose.300" },
                  color: "rose.600",
                })}
                value={toAddress()}
                onInput={(e) => setToAddress(e.target.value.trim())}
                required
              />
            </div>
          </div>
          <div class={css({ color: "rose.400", width: "80%", display: "flex", justifyContent: "space-between" })}>
            <label for="txVal">VALUE</label>
            <div class={css({ position: "relative" })}>
              <input
                id="txVal"
                type="number"
                class={css({
                  borderRadius: "md",
                  borderWidth: "thin",
                  borderColor: "rose.300",
                  _focus: { outlineWidth: "medium", outlineColor: "rose.300" },
                  color: "rose.600",
                })}
                value={value().toString()}
                onInput={(e) => setValue(BigInt(e.target.value))}
                min={0}
              />
            </div>
          </div>
          <div class={css({ color: "rose.400", width: "80%", display: "flex", justifyContent: "space-between" })}>
            <label for="txData">DATA</label>
            <div class={css({ position: "relative" })}>
              <input
                id="txData"
                type="text"
                class={css({
                  borderRadius: "md",
                  borderWidth: "thin",
                  borderColor: "rose.300",
                  _focus: { outlineWidth: "medium", outlineColor: "rose.300" },
                  color: "rose.600",
                  _placeholder: {
                    color: "rose.300",
                  },
                })}
                value={data()}
                onInput={(e) => setData(e.target.value)}
                placeholder="  (optional)"
              />
            </div>
          </div>
        </div>
        <div class={styles.modalActionButtonsContainer}>
          <button class={styles.modalCancelButton} onClick={props.close}>
            Cancel
          </button>
          <button class={styles.modalCreateWalletButton} onClick={handleSubmit} disabled={!isAddress(toAddress())}>
            Submit Tx
          </button>
        </div>
      </div>
    </div>
  );
};
