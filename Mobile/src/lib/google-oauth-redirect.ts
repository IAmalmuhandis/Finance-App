import Constants from "expo-constants";
import * as AuthSession from "expo-auth-session";
import { Platform } from "react-native";

/**
 * HTTPS redirect Google accepts on a *Web* OAuth client. Custom schemes like
 * `com.googleusercontent.apps...:/oauth2redirect/google` are rejected there.
 */
function getExpoAuthProxyRedirectUri(): string {
  const slug = Constants.expoConfig?.slug ?? "vaultly";
  const extra = Constants.expoConfig?.extra as { expoAuthProxyPath?: string } | undefined;
  const custom = extra?.expoAuthProxyPath?.trim();
  if (custom?.startsWith("@")) {
    return `https://auth.expo.io/${custom}`;
  }
  return `https://auth.expo.io/@anonymous/${slug}`;
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
  const scheme = Array.isArray(schemeRaw) ? schemeRaw[0] : (schemeRaw ?? "vaultly");
  const uri = AuthSession.makeRedirectUri({ scheme });
  return Array.isArray(uri) ? uri[0] : uri;
}
