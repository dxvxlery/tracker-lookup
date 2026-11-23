import tseslint from "typescript-eslint";
import prettier from "eslint-config-prettier";

const noComments = {
  meta: { type: "suggestion", messages: { comment: "Comments are not allowed in this codebase." } },
  create(context) {
    return {
      Program() {
        for (const c of context.sourceCode.getAllComments()) context.report({ loc: c.loc, messageId: "comment" });
      },
    };
  },
};

export default tseslint.config({ ignores: ["dist/", "node_modules/", ".test-out/"] }, ...tseslint.configs.recommended, prettier, {
  plugins: { local: { rules: { "no-comments": noComments } } },
  rules: {
    "local/no-comments": "error",
    "@typescript-eslint/no-explicit-any": "off",
    "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrors: "none" }],
    "@typescript-eslint/no-unused-expressions": ["error", { allowShortCircuit: true, allowTernary: true }],
    "@typescript-eslint/no-require-imports": "off",
    "no-empty": ["error", { allowEmptyCatch: true }],
    eqeqeq: ["error", "smart"],
    "prefer-const": "error",
  },
});
