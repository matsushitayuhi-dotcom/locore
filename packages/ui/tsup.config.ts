import { defineConfig } from "tsup";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const sharedExternal = [
  "react",
  "react-dom",
  "tailwindcss",
  "@radix-ui/react-avatar",
  "@radix-ui/react-slider",
  "@radix-ui/react-slot",
  "class-variance-authority",
  "clsx",
  "lucide-react",
  "tailwind-merge",
  "tailwindcss-animate",
];

const sharedBuild = {
  format: ["esm"] as const,
  dts: true,
  sourcemap: true,
  treeshake: true,
  splitting: false,
  external: sharedExternal,
};

const USE_CLIENT = '"use client";\n';

/** Prepend "use client" to a bundled file if it isn't already there. */
function ensureUseClient(filePath: string): void {
  const target = resolve(filePath);
  const current = readFileSync(target, "utf8");
  if (current.startsWith(USE_CLIENT.trim())) return;
  writeFileSync(target, USE_CLIENT + current, "utf8");
}

export default defineConfig([
  // Components entry — needs "use client" directive for Next.js App Router
  {
    ...sharedBuild,
    entry: { index: "src/index.ts" },
    clean: true,
    onSuccess: async () => {
      ensureUseClient("dist/index.js");
    },
  },
  // Server-safe entries (tokens, tailwind preset, icon re-exports)
  {
    ...sharedBuild,
    entry: {
      "tailwind-preset": "src/tailwind-preset.ts",
      "tokens/index": "src/tokens/index.ts",
      "icons/index": "src/icons/index.ts",
    },
    clean: false,
  },
]);
