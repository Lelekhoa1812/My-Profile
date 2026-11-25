"use client";

import { Moon, Sun } from "lucide-react";
import { useLayoutEffect, useState } from "react";

const KEY = "profile.theme";
type Theme = "dark" | "light";

function readTheme(): Theme {
  return document.documentElement.dataset.theme === "light" ? "light" : "dark";
}

function paintTheme(theme: Theme) {
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.style.colorScheme = theme;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", theme === "light" ? "#f3f4f0" : "#000000");
  try {
    localStorage.setItem(KEY, theme);
  } catch {
    // Private mode can block storage. The choice still applies for this visit.
  }
}

export function ThemeSwitch() {
  const [theme, setTheme] = useState<Theme>("dark");

  useLayoutEffect(() => {
    setTheme(readTheme());
  }, []);

  const light = theme === "light";

  return (
    <button
      type="button"
      aria-pressed={light}
      aria-label={light ? "Use dark mode" : "Use light mode"}
      onClick={() => {
        const next: Theme = light ? "dark" : "light";
        paintTheme(next);
        setTheme(next);
      }}
      className="grid h-11 w-11 shrink-0 place-items-center border border-white/30 text-ink transition-colors hover:bg-white hover:text-black lg:h-9 lg:w-9"
    >
      {light ? <Moon aria-hidden className="h-4 w-4 lg:h-3.5 lg:w-3.5" strokeWidth={1.5} /> : <Sun aria-hidden className="h-4 w-4 lg:h-3.5 lg:w-3.5" strokeWidth={1.5} />}
    </button>
  );
}
