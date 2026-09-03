import js from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import globals from "globals";

// Flat config (ESLint 9+). Two environments live in this repo: browser React code under
// src/, and plain Node scripts everywhere else (scripts/, server/, test/, config files) — kept
// as separate blocks below so each gets the right globals instead of false no-undef flags.
export default [
  { ignores: ["dist/**", "node_modules/**"] },

  js.configs.recommended,

  // Browser / React app code
  {
    files: ["src/**/*.{js,jsx}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: { ...globals.browser },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: { "react-hooks": reactHooks, "react-refresh": reactRefresh },
    rules: {
      // react-hooks v7's own "recommended" bundle pulls in a large set of React
      // Compiler-oriented rules (purity, immutability, preserve-manual-memoization,
      // static-components, ...) meant for codebases adopting that compiler — this
      // project doesn't use it, so those rules would just be noise unrelated to real
      // bugs. Cherry-pick the two classic rules everyone actually wants instead.
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      "react-refresh/only-export-components": "warn",
      "no-unused-vars": ["warn", { varsIgnorePattern: "^_", argsIgnorePattern: "^_" }],
    },
  },

  // Plain Node: headless harness, CLI scripts, the Press Box proxy server, config files
  {
    files: ["scripts/**/*.mjs", "server/**/*.mjs", "*.config.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: { ...globals.node },
    },
    rules: {
      "no-unused-vars": ["warn", { varsIgnorePattern: "^_", argsIgnorePattern: "^_" }],
    },
  },

  // Test files — Node's built-in test runner (node:test), same globals as plain Node
  {
    files: ["test/**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: { ...globals.node },
    },
    rules: {
      "no-unused-vars": ["warn", { varsIgnorePattern: "^_", argsIgnorePattern: "^_" }],
    },
  },
];
