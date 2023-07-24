import { ParentComponent, children } from "solid-js";
import { css } from "../styled-system/css";

type Props = {
  title: string;
};

export const Card: ParentComponent<Props> = (props) => {
  const c = children(() => props.children);

  return (
    <div
      class={css({
        margin: { base: "6" },
        borderRadius: "lg",
        borderColor: "rose.200",
        borderWidth: "medium",
        height: { base: "md" },
        overflow: "auto",
      })}
    >
      <h1
        class={css({
          fontSize: { base: "3xl" },
          color: "red.400",
          textAlign: { base: "center" },
          height: { base: "50px" },
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
