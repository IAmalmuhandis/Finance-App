import Constants from "expo-constants";

/**
 * Web OAuth client ID (same value as server `GOOGLE_CLIENT_ID`).
 * Sources: `app.config.js` extra (from dotenv at config time), then Metro-inlined `EXPO_PUBLIC_*` in JS.
 */
export function getGoogleWebClientId(): string {
  const extra = Constants.expoConfig?.extra as { googleWebClientId?: string } | undefined;
  const fromExtra = (extra?.googleWebClientId || "").trim();
  if (fromExtra) return fromExtra;
  if (typeof process !== "undefined" && process.env?.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID) {
    return String(process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID).trim();
  }
  return "";
}

export function getGoogleAndroidClientId(): string {
  const extra = Constants.expoConfig?.extra as { googleAndroidClientId?: string } | undefined;
  const fromExtra = (extra?.googleAndroidClientId || "").trim();
  if (fromExtra) return fromExtra;
  if (typeof process !== "undefined" && process.env?.EXPO_PUBLIC_ANDROID_GOOGLE_CLIENT_ID) {
    return String(process.env.EXPO_PUBLIC_ANDROID_GOOGLE_CLIENT_ID).trim();
  }
  return "";
}
