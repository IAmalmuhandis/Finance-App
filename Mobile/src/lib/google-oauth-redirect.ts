import Constants from "expo-constants";
import * as AuthSession from "expo-auth-session";
import { Platform } from "react-native";

/**
 * HTTPS redirect Google accepts on a *Web* OAuth client. Custom schemes like
 * `com.googleusercontent.apps...:/oauth2redirect/google` are rejected there.
 */
const EXPO_AUTH_PROXY_ORIGIN = "https://auth.expo.io";

/**
 * `@account/slug` baked into the binary for this Expo/EAS project (e.g. `@northino/vaultly`).
 * Must match auth.expo.io redirect — using a different @user in .env causes "Something went wrong" after Google.
 */
function getExpoOriginalFullName(): string | null {
  const cfg = Constants.expoConfig as { originalFullName?: string } | null | undefined;
  const full = cfg?.originalFullName?.trim();
  if (full?.startsWith("@")) return full.replace(/\/+$/, "");
  const m2 = Constants.manifest2 as { extra?: { expoClient?: { originalFullName?: string } } } | undefined;
  const full2 = m2?.extra?.expoClient?.originalFullName?.trim();
  if (full2?.startsWith("@")) return full2.replace(/\/+$/, "");
  return null;
}

/**
 * Resolves Expo proxy URL for Google `redirect_uri`.
 * Prefer embedded `originalFullName` (correct for EAS builds). Else `EXPO_PUBLIC_EXPO_AUTH_PROXY_PATH`, else @anonymous/slug.
 */
function getExpoAuthProxyRedirectUri(): string {
  const slug = Constants.expoConfig?.slug ?? "arzo";
  const fromBuild = getExpoOriginalFullName();
  if (fromBuild) {
    return `${EXPO_AUTH_PROXY_ORIGIN}/${fromBuild}`;
  }
  const extra = Constants.expoConfig?.extra as { expoAuthProxyPath?: string } | undefined;
  let custom = (extra?.expoAuthProxyPath || "").trim();
  if (!custom) {
    const ownerRaw = (Constants.expoConfig as { owner?: string } | null | undefined)?.owner;
    const owner = typeof ownerRaw === "string" ? ownerRaw.replace(/^@/, "").trim() : "";
    if (owner) {
      return `${EXPO_AUTH_PROXY_ORIGIN}/@${owner}/${slug}`;
    }
    return `${EXPO_AUTH_PROXY_ORIGIN}/@anonymous/${slug}`;
  }
  const lower = custom.toLowerCase();
  if (lower.startsWith(`${EXPO_AUTH_PROXY_ORIGIN}/`)) {
    custom = custom.slice(EXPO_AUTH_PROXY_ORIGIN.length + 1);
  }
  if (!custom.startsWith("@")) {
    custom = `@${custom}`;
  }
  return `${EXPO_AUTH_PROXY_ORIGIN}/${custom}`;
}

/**
 * Redirect URI sent to Google. Native (Expo Go, dev client, standalone) must use
 * an https URL registered on the Web client — Expo's auth proxy handles the return to the app.
 */
export function getGoogleOAuthRedirectUri(_webClientId: string): string {
  if (Platform.OS !== "web") {
    return getExpoAuthProxyRedirectUri();
  }

  const schemeRaw = Constants.expoConfig?.scheme;
  const scheme = Array.isArray(schemeRaw) ? schemeRaw[0] : (schemeRaw ?? "arzo");
  const uri = AuthSession.makeRedirectUri({ scheme });
  return Array.isArray(uri) ? uri[0] : uri;
}
