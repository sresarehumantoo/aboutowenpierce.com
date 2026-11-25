// Flat config for ESLint 9 + eslint-config-next 16.
// eslint-config-next now ships a native flat-config array, so the old
// @eslint/eslintrc FlatCompat bridge is no longer needed. `next lint` was
// removed in Next 16 — lint via the eslint CLI directly (see the "lint"
// script in package.json).
//
// Stay on ESLint 9. Re-tested against ESLint 10.9.1 + eslint-config-next
// 16.3.3 on 2026-08-29 and it still fails, for two independent reasons:
//   1. `eslint-config-next/parser` returns a ScopeManager without the
//      `addGlobals` method ESLint 10 calls from SourceCode.finalize()
//      ("scopeManager.addGlobals is not a function").
//   2. The bundled eslint-plugin-react@7.37.5 peers `eslint <= ^9.7` and
//      calls the removed legacy rule-context API
//      ("contextOrFilename.getFilename is not a function"). 7.37.5 is the
//      newest release upstream — there is no ESLint 10 build yet.
// Revisit when the Next toolchain ships ESLint-10-ready deps.
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";

const eslintConfig = [
  { ignores: [".next/**", "out/**", "node_modules/**"] },
  ...nextCoreWebVitals,
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
];

export default eslintConfig;
