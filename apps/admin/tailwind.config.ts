import type { Config } from "tailwindcss";
import tailwindPreset from "@bbspos/config/tailwind";

const config: Config = {
  presets: [tailwindPreset],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "../../packages/ui/src/**/*.{ts,tsx}",
  ],
};

export default config;
