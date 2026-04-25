// Load .env from the Mobile folder so EXPO_PUBLIC_* is available to this file
const path = require("path");
try {
  require("dotenv").config({ path: path.join(__dirname, ".env") });
} catch {
  // dotenv optional; Expo may also load .env in newer SDKs
}

/** @type {import('expo/config').ExpoConfig} */
module.exports = {
  /** Do not set `owner` here unless it matches the Expo account that owns `extra.eas.projectId` (EAS will error otherwise). Google redirect uses `EXPO_PUBLIC_EXPO_AUTH_PROXY_PATH` or @anonymous/slug. */
  name: "Vaultly",
  slug: "vaultly",
  version: "1.0.0",
  orientation: "portrait",
  userInterfaceStyle: "dark",
  scheme: "vaultly",
  icon: "./assets/icon.png",
  platforms: ["ios", "android"],
  plugins: ["expo-asset", "expo-document-picker", "expo-web-browser"],
  splash: {
    image: "./assets/icon.png",
    backgroundColor: "#080D1A",
    resizeMode: "contain",
  },
  ios: {
    bundleIdentifier: "com.vaultly.app",
  },
  android: {
    package: "com.vaultly.app",
    adaptiveIcon: {
      foregroundImage: "./assets/icon.png",
      backgroundColor: "#080D1A",
    },
  },
  extra: {
    apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL ?? "",
    /** Web OAuth client ID (Google Cloud → Web client). Prefer EXPO_PUBLIC_*; GOOGLE_CLIENT_ID works if you copied server .env into Mobile/.env */
    googleWebClientId:
      (process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || process.env.GOOGLE_CLIENT_ID || "").trim(),
    /** Optional: `@yourExpoUsername/vaultly` for Expo Go Google redirect (https://auth.expo.io/...). If unset, `@anonymous/vaultly` is used. */
    expoAuthProxyPath: (process.env.EXPO_PUBLIC_EXPO_AUTH_PROXY_PATH || "").trim(),
    eas: {
      projectId: "46ca06fd-aaaf-4527-af4a-d638608df24c",
    },
  },
};
