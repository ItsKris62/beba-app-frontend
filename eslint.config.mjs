import nextConfig from "eslint-config-next";

const eslintConfig = [
  ...nextConfig,
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "e2e/**",
      "cypress/**",
      "playwright-report/**",
      "test-results/**",
    ],
  },
  {
    // eslint-plugin-react-hooks v7 (pulled in by eslint-config-next 16) ships
    // React Compiler readiness diagnostics as errors by default: they flag the
    // ordinary "fetch in useEffect, setState in the body" pattern used
    // throughout this codebase, plus a few compiler-memoization diagnostics
    // unrelated to correctness. This app does not opt into the React Compiler
    // (no babel-plugin-react-compiler / reactCompiler config in next.config.mjs),
    // so these are pre-existing, intentional, working patterns — not bugs.
    // Downgraded to warnings rather than silenced entirely so compiler adoption
    // later has a ready-made TODO list; `rules-of-hooks` and `exhaustive-deps`
    // (the correctness-relevant hooks rules) stay at their default severity.
    rules: {
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/immutability": "warn",
      "react-hooks/incompatible-library": "warn",
      "react-hooks/preserve-manual-memoization": "warn",
      "react-hooks/static-components": "warn",
      "react-hooks/error-boundaries": "warn",
    },
  },
];

export default eslintConfig;
