// @ts-check
import eslint from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import globals from "globals";
import tseslint from "typescript-eslint";

// Raw palette scales and hex literals do not follow the theme, so every one is
// a dark-mode bug. See .claude/rules/frontend-conventions.md.
const PALETTE =
  "red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|slate|gray|zinc|neutral|stone";
const PREFIX = "bg|text|border|ring|divide|from|via|to|outline|decoration|shadow|accent|caret|fill|stroke";

export default tseslint.config(
  {
    ignores: ["dist", "src/routeTree.gen.ts", "eslint.config.mjs"],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
      parserOptions: {
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      // Warn matches the plugin's own default; these need judgement per case.
      "react-hooks/exhaustive-deps": "warn",
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "no-restricted-syntax": [
        "warn",
        {
          selector: `Literal[value=/\\b(${PREFIX})-(${PALETTE})-\\d{2,3}\\b/]`,
          message:
            "Raw Tailwind palette color. Use a theme token (text-muted-foreground, bg-muted, border-border, text-destructive).",
        },
        {
          selector: `Literal[value=/\\b(bg|text|border|ring|divide|fill|stroke)-white\\b/]`,
          message:
            "Use bg-card / bg-background / text-primary-foreground instead of a literal white.",
        },
        {
          selector: `Literal[value=/-\\[#[0-9a-fA-F]{3,8}\\]/]`,
          message:
            "Hex literal in a class. Add a token to styles.css and use it (bg-brand, bg-table-header).",
        },
      ],
    },
  },
  {
    // Route files must export a non-component Route, so the rule can never pass.
    files: ["src/routes/**/*.tsx"],
    rules: {
      "react-refresh/only-export-components": "off",
    },
  },
  {
    files: ["**/*.config.{ts,mts,js,mjs}", "vite.config.ts", "scripts/**/*.mjs"],
    languageOptions: {
      globals: globals.node,
    },
    rules: {
      // Build-time scripts report through stdout; that is their whole output.
      "no-console": "off",
    },
  }
);
