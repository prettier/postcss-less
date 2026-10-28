import eslintPluginJs from '@eslint/js';
import eslintConfigPrettier from 'eslint-config-prettier';
import globals from 'globals';

export default [
  eslintPluginJs.configs.recommended,
  {
    languageOptions: {
      globals: {
        ...globals.builtin,
        ...globals.node,
      },
    },
    rules: {},
  },
  eslintConfigPrettier,
  {
    ignores: [],
  },
];
