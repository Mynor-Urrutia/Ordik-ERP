import { useState, useEffect } from "react";

export function useTheme() {
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem("ordik-theme");
    if (saved) return saved === "dark";
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (dark) {
      root.classList.add("dark");
      localStorage.setItem("ordik-theme", "dark");
    } else {
      root.classList.remove("dark");
      localStorage.setItem("ordik-theme", "light");
    }
  }, [dark]);

  return { dark, toggle: () => setDark((d) => !d) };
}
