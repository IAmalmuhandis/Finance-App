// Load .env from the Mobile folder so EXPO_PUBLIC_* is available to this file
const path = require("path");
try {
  require("dotenv").config({ path: path.join(__dirname, ".env") });
} catch {
  // dotenv optional; Expo may also load .env in newer SDKs
}

/** @type {import('expo/config').ExpoConfig} */
module.exports = {
  name: "Vaultly",
  slug: "vaultly",
  version: "1.0.0",
  orientation: "portrait",
  userInterfaceStyle: "dark",
  scheme: "vaultly",
  icon: "./assets/icon.png",
  platforms: ["ios", "android"],
  plugins: ["expo-asset", "expo-document-picker"],
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
    eas: {
      projectId: "46ca06fd-aaaf-4527-af4a-d638608df24c",
    },
  },
};
