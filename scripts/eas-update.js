#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const devModePath = path.join(__dirname, "..", "constants", "devMode.ts");
let content;

try {
  content = fs.readFileSync(devModePath, "utf8");
} catch (error) {
  console.error(
    `❌ Failed to read ${devModePath}: ${error instanceof Error ? error.message : String(error)}`,
  );
  process.exit(1);
}

const cleanedContent = content
  .replace(/\/\/.*$/gm, "")
  .replace(/\/\*[\s\S]*?\*\//g, "");

const hasHardcodedTrue =
  /^\s*(?:export\s+)?(?:const|let|var)\s+DEV_MODE\s*=\s*true\b/m.test(
    cleanedContent,
  );
const usesExplicitDevFlag = /process\.env\.EXPO_PUBLIC_DEV_MODE/.test(
  cleanedContent,
);
const usesNodeEnvCheck = /process\.env\.NODE_ENV/.test(cleanedContent);
const devModeEnabled =
  hasHardcodedTrue ||
  (usesExplicitDevFlag && process.env.EXPO_PUBLIC_DEV_MODE === "true") ||
  (usesNodeEnvCheck && process.env.NODE_ENV !== "production");

if (devModeEnabled) {
  console.error("\n❌  DEV_MODE is still enabled in constants/devMode.ts");
  console.error(
    "   Set EXPO_PUBLIC_DEV_MODE=false before publishing an OTA update.\n",
  );
  process.exit(1);
}

console.log("✅  DEV_MODE is disabled — proceeding with EAS update...");
