import { Component } from "solid-js";
import { css } from "../styled-system/css";

type Props = {
  onConnectWallet(): Promise<void>;
};

export const AuthOverlay: Component<Props> = (props) => {
  return (
    <div
      class={css({
        zIndex: 2,
        position: "absolute",
        backgroundColor: "rgba(255, 255, 255, 0.85)",
        height: "100%",
        width: "100%",
        margin: 0,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "column",
      })}
    >
      <h1 class={css({ fontSize: "2xl", color: "rose.600" })}>Your wallet is not connected!</h1>
      <button
        class={css({
          margin: "4",
          backgroundColor: "rose.400",
          padding: "3",
          borderRadius: "3xl",
          color: "beige",
          cursor: "pointer",
          borderWidth: "thin",
          borderColor: "rose.600",
          boxShadow: "0px 4px 12px rgba(0, 0, 0, 0.4)",
          transition: "all 0.15s ease 0s",
          _hover: {
            backgroundColor: "rose.500",
          },
          _active: {
            transform: "translateY(7px)",
          },
        })}
        onClick={props.onConnectWallet}
      >
        Connect Wallet
      </button>
    </div>
  );
};
