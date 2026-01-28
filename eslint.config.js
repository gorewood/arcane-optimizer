import tseslint from "typescript-eslint";
import eslintComments from "@eslint-community/eslint-plugin-eslint-comments";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";

export default tseslint.config(
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  {
    files: ["src/**/*.ts", "src/**/*.tsx"],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      "@eslint-community/eslint-comments": eslintComments,
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      // === TYPE SAFETY (non-negotiable) ===
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unsafe-argument": "error",
      "@typescript-eslint/no-unsafe-assignment": "error",
      "@typescript-eslint/no-unsafe-call": "error",
      "@typescript-eslint/no-unsafe-member-access": "error",
      "@typescript-eslint/no-unsafe-return": "error",
      "@typescript-eslint/no-unsafe-type-assertion": "error",
      "@typescript-eslint/no-non-null-assertion": "error",

      // === PROMISES ===
      "@typescript-eslint/no-floating-promises": [
        "error",
        { ignoreVoid: true, ignoreIIFE: true },
      ],
      "@typescript-eslint/no-misused-promises": "error",
      "@typescript-eslint/require-await": "error",
      "@typescript-eslint/promise-function-async": "error",

      // === COMPLEXITY LIMITS ===
      complexity: ["error", { max: 10 }],
      "max-depth": ["error", 4],
      "max-lines-per-function": [
        "error",
        { max: 60, skipBlankLines: true, skipComments: true },
      ],
      "max-lines": [
        "error",
        { max: 400, skipBlankLines: true, skipComments: true },
      ],
      "max-params": ["error", 4],

      // === BLOCK DISABLING CRITICAL RULES ===
      "@eslint-community/eslint-comments/no-restricted-disable": [
        "error",
        "@typescript-eslint/no-explicit-any",
        "@typescript-eslint/no-unsafe-assignment",
        "@typescript-eslint/no-unsafe-argument",
        "@typescript-eslint/no-floating-promises",
        "complexity",
        "max-lines-per-function",
        "max-lines",
      ],
      "@eslint-community/eslint-comments/require-description": [
        "error",
        { ignore: ["eslint-enable"] },
      ],

      // === COMMENTS ===
      "@typescript-eslint/ban-ts-comment": [
        "error",
        {
          "ts-expect-error": "allow-with-description",
          "ts-ignore": true,
          "ts-nocheck": true,
          minimumDescriptionLength: 10,
        },
      ],

      // === CONSISTENCY ===
      "@typescript-eslint/explicit-module-boundary-types": "error",
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports" },
      ],
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],

      // === REACT ===
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
    },
  },
  // Relax for tests
  {
    files: ["**/*.test.ts", "**/*.test.tsx", "**/*.spec.ts", "**/*.spec.tsx"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "max-lines-per-function": "off",
      "max-lines": "off",
      complexity: "off",
      "@eslint-community/eslint-comments/no-restricted-disable": "off",
    },
  },
  {
    ignores: [
      "dist/",
      "node_modules/",
      "coverage/",
      "*.js",
      "*.cjs",
      "*.mjs",
      "public/",
    ],
  },
);
