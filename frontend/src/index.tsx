/* @refresh reload */
import { render } from "solid-js/web";
import "./index.css";

import App from "./App";
import { Toaster } from "solid-toast";

const root = document.getElementById("root");

render(
  () => (
    <>
      <App />
      <Toaster />
    </>
  ),
  root!
);
