/** @type {import("eslint").Linter.Config} */
module.exports = {
  root: true,
  extends: ["eslint:recommended"],
  ignorePatterns: [
    "packages/*/dist/**",
    "packages/*/build/**",
    "packages/*/.next/**",
    "packages/*/node_modules/**",
    "node_modules/**",
    "*.config.js",
    "*.config.ts",
  ],
};