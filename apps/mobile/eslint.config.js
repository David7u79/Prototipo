const expoConfig = require('eslint-config-expo/flat');

module.exports = [
  ...expoConfig,
  {
    ignores: ['dist/**', '.expo/**', '.export-check/**'],
    rules: {
      // CommonJS is required by Expo's flat-config loader.
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
];
