import eslintPluginJs from '@eslint/js';
import eslintPluginUnicorn from 'eslint-plugin-unicorn';
import eslintConfigPrettier from 'eslint-config-prettier';
import globals from 'globals';

export default [
  eslintPluginJs.configs.recommended,
  eslintConfigPrettier,
  {
    plugins: {
      unicorn: eslintPluginUnicorn,
    },
    languageOptions: {
      globals: {
        ...globals.builtin,
        ...globals.node,
      },
    },
    rules: {
      curly: 'error',
      'unicorn/template-indent': 'error',
    },
  },
  {
    ignores: [],
  },
];
