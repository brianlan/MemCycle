import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
const setDarkMode = (isDark: boolean) => {
  document.documentElement.classList.toggle("dark", isDark);
};
setDarkMode(mediaQuery.matches);
mediaQuery.addEventListener("change", (e) => setDarkMode(e.matches));

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
