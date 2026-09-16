const expoConfig = require('eslint-config-expo/flat');
const reactPlugin = require('eslint-plugin-react');

const disabledReactRules = Object.fromEntries(
  Object.keys(reactPlugin.rules).map(ruleName => [`react/${ruleName}`, 'off']),
);

module.exports = [
  ...expoConfig,
  {
    ignores: ['dist/**', '.expo/**', '.export-check/**'],
    // eslint-config-expo 57 bundles React plugin 7, not compatible with ESLint 10.
    rules: {
      ...disabledReactRules,
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
];
