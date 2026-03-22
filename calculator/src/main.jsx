import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import Calculator from "./calculator.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <Calculator />
  </StrictMode>
);
