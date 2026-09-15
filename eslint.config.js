// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const eslintConfigPrettier = require('eslint-config-prettier');

module.exports = defineConfig([
  expoConfig,
  eslintConfigPrettier,
  {
    // Deno edge functions (supabase/functions/**) resolve remote `https://esm.sh/...`
    // imports at deploy time, not via this project's Node/TS module resolution —
    // same reason they're excluded from tsconfig.json's `exclude` (see 9e6aa8b).
    ignores: ['dist/*', 'node_modules/*', '.expo/*', 'supabase/functions/**'],
  },
]);
