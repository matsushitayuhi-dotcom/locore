import type { Config } from "tailwindcss";
import preset from "./src/tailwind-preset";

/**
 * This config exists so the package itself can be linted / type-checked
 * with Tailwind awareness. Apps should consume `./src/tailwind-preset`
 * via `@locore/ui/tailwind-preset` instead of importing this file.
 */
const config: Config = {
  presets: [preset as Config],
  content: ["./src/**/*.{ts,tsx}"],
};

export default config;
