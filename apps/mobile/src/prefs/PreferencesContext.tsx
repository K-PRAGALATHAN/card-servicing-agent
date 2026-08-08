import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { getItem, setItem } from "../auth/storage";
import { DICT, type Language, type Strings } from "../i18n";
import { darkColors, lightColors, type Palette } from "../theme";

export type ThemeMode = "light" | "dark";

const THEME_KEY = "cardservicing.theme";
const LANG_KEY = "cardservicing.language";

interface PreferencesValue {
  theme: ThemeMode;
  language: Language;
  colors: Palette;
  t: (key: keyof Strings) => string;
  setTheme: (mode: ThemeMode) => void;
  setLanguage: (lang: Language) => void;
}

const Ctx = createContext<PreferencesValue | undefined>(undefined);

export function PreferencesProvider({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  const [theme, setThemeState] = useState<ThemeMode>("light");
  const [language, setLanguageState] = useState<Language>("en");

  useEffect(() => {
    (async () => {
      const [savedTheme, savedLang] = await Promise.all([getItem(THEME_KEY), getItem(LANG_KEY)]);
      if (savedTheme === "dark" || savedTheme === "light") setThemeState(savedTheme);
      if (savedLang === "en" || savedLang === "ta") setLanguageState(savedLang);
    })();
  }, []);

  const setTheme = useCallback((mode: ThemeMode) => {
    setThemeState(mode);
    void setItem(THEME_KEY, mode);
  }, []);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    void setItem(LANG_KEY, lang);
  }, []);

  const value = useMemo<PreferencesValue>(() => {
    const colors = theme === "dark" ? darkColors : lightColors;
    const dict = DICT[language];
    return {
      theme,
      language,
      colors,
      t: (key) => dict[key] ?? DICT.en[key] ?? String(key),
      setTheme,
      setLanguage,
    };
  }, [theme, language, setTheme, setLanguage]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePreferences(): PreferencesValue {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("usePreferences must be used within PreferencesProvider");
  return ctx;
}

/** The active palette. */
export function useColors(): Palette {
  return usePreferences().colors;
}

/** The translator for the active language. */
export function useT(): (key: keyof Strings) => string {
  return usePreferences().t;
}
