// ⚠️  DEV MODE — bypasses Google auth and uses mock data for UI testing.
// MUST be false before publishing. Use `npm run eas:update` to auto-check.
const explicitDevMode = process.env.EXPO_PUBLIC_DEV_MODE;
export const DEV_MODE =
  explicitDevMode === undefined ? false : explicitDevMode === "true";
