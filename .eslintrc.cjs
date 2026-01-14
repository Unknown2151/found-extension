module.exports = {
  root: true,
  env: {
    browser: true,
    es2021: true,
    node: true
  },
  parserOptions: {
    ecmaVersion: 2021,
    sourceType: 'module'
  },
  rules: {
    'no-unused-vars': ['warn'],
    'no-console': ['off']
  },
  ignorePatterns: ['dist/', 'node_modules/']
};
