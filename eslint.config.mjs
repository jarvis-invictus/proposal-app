import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Supabase CLI's local runtime cache — generated Deno bootstrap code, not source, not
    // even under version control. Without this it gets linted as if it were app code, which
    // is where the bulk of a `prefer-const`/`no-var` flood on one minified line comes from.
    "supabase/.temp/**",
  ]),
]);

export default eslintConfig;
