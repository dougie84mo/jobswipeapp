// ESLint flat config — https://docs.expo.dev/guides/using-eslint/
// Lints the Expo app (src/, config files). The Deno edge functions under
// supabase/ have their own deno lint (supabase/functions/deno.json), and the
// legacy CRA app is read-only reference — both are ignored here.
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: [
      'node_modules/**',
      'legacy/**',
      'supabase/**',
      'prompts/**',
      '.expo/**',
      'dist/**',
      'web-build/**',
      'web/**',
    ],
  },
]);
