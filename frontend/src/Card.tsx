import { ParentComponent, children } from "solid-js";
import { css } from "../styled-system/css";
import { CARD_TITLE_HEIGHT } from "./constants";

type Props = {
  title: string;
};

export const Card: ParentComponent<Props> = (props) => {
  const c = children(() => props.children);

  return (
    <div
      class={css({
        display: "flex",
        flexDirection: "column",
        margin: { base: "6" },
        borderRadius: "lg",
        borderColor: "rose.200",
        borderWidth: "medium",
        height: { base: "md", md: "100%" },
        md: { width: "50%" },
        overflow: "auto",
        position: "relative",
      })}
    >
      <h1
        class={css({
          fontSize: { base: "3xl" },
          color: "red.400",
          textAlign: { base: "center" },
          height: { base: CARD_TITLE_HEIGHT },
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        })}
      >
        {props.title}
      </h1>
      {c()}
    </div>
  );
};
