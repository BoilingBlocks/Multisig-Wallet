import { Component } from "solid-js";
import { css } from "../styled-system/css";
import { Card } from "./Card";

const App: Component = () => {
  return (
    <>
      <Card title="Wallets">
        <div class={css({ height: "calc(100% - 50px)", backgroundColor: "red.100" })}></div>
      </Card>
      <Card title="Transactions">
        <div class={css({ height: "calc(100% - 50px)", backgroundColor: "red.100" })}></div>
      </Card>
    </>
  );
};

export default App;
