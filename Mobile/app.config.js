// Load .env from the Mobile folder so EXPO_PUBLIC_* is available to this file
const path = require("path");
try {
  require("dotenv").config({ path: path.join(__dirname, ".env") });
} catch {
  /* */
}

/** @type {import('expo/config').ExpoConfig} */
module.exports = {
  name: "Arzo",
  slug: "arzo",
  version: "1.0.0",
  orientation: "portrait",
  userInterfaceStyle: "dark",
  scheme: "arzo",
  icon: "./assets/icon.png",
  platforms: ["ios", "android"],
  plugins: ["expo-asset", "expo-web-browser"],
  splash: {
    image: "./assets/icon.png",
    backgroundColor: "#F6F4EE",
    resizeMode: "contain",
  },
  ios: {
    bundleIdentifier: "com.arzo.app",
  },
  android: {
    package: "com.arzo.app",
    adaptiveIcon: {
      foregroundImage: "./assets/icon.png",
      backgroundColor: "#0C4A3E",
    },
  },
  extra: {
    apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL ?? "",
    googleWebClientId:
      (process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || process.env.GOOGLE_CLIENT_ID || "").trim(),
    expoAuthProxyPath: (process.env.EXPO_PUBLIC_EXPO_AUTH_PROXY_PATH || "").trim(),
    eas: {
      projectId: "46ca06fd-aaaf-4527-af4a-d638608df24c",
    },
  },
};
