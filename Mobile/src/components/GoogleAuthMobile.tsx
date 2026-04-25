import React, { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import * as Google from "expo-auth-session/providers/google";
import { THEME } from "../theme";
import { getGoogleWebClientId } from "../lib/google-config";
import { getGoogleOAuthRedirectUri } from "../lib/google-oauth-redirect";
import { fetchSocialAuthConfig, getApiBase, setApiBase } from "../lib/api";

type Props = {
  disabled: boolean;
  busy: boolean;
  setBusy: (v: boolean) => void;
  onIdToken: (idToken: string) => Promise<boolean>;
  onMessage: (msg: string | null) => void;
  /** Server URL being typed before "Save" — used to load `webClientId` from `/api/auth/social-config`. */
  pendingBaseUrl?: string;
};

function resolveBaseForConfig(pending: string | undefined): string {
  return (pending || "").trim().replace(/\/$/, "");
}

/**
 * Google sign-in for Expo Go / dev builds. Client ID from `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` or from the server
 * `GET /api/auth/social-config` (`webClientId`). Add `https://auth.expo.io/@anonymous/<slug>` to the Google Web client redirect URIs.
 */
export function GoogleAuthMobile({ disabled, busy, setBusy, onIdToken, onMessage, pendingBaseUrl }: Props) {
  const baked = getGoogleWebClientId();
  const [remoteClientId, setRemoteClientId] = useState("");
  const [configLoading, setConfigLoading] = useState(true);
  const [configError, setConfigError] = useState<string | null>(null);
  const [serverHadBaseButNoId, setServerHadBaseButNoId] = useState(false);

  const loadConfig = useCallback(async () => {
    setConfigLoading(true);
    setConfigError(null);
    setServerHadBaseButNoId(false);
    try {
      const stored = (await getApiBase()).trim().replace(/\/$/, "");
      const pending = resolveBaseForConfig(pendingBaseUrl);
      const base = stored || pending;
      if (!base) {
        setRemoteClientId("");
        return;
      }
      const cfg = await fetchSocialAuthConfig(base);
      if (cfg.fetchError) {
        setConfigError(cfg.fetchError);
        setRemoteClientId("");
        return;
      }
      if (cfg.webClientId) {
        setRemoteClientId(cfg.webClientId);
        return;
      }
      setRemoteClientId("");
      if (cfg.httpStatus === 200) {
        setServerHadBaseButNoId(true);
      }
    } catch {
      setConfigError("Could not load Google settings from server.");
      setRemoteClientId("");
    } finally {
      setConfigLoading(false);
    }
  }, [pendingBaseUrl]);

  useEffect(() => {
    void loadConfig();
  }, [loadConfig]);

  const effectiveId = baked || remoteClientId;

  if (configLoading) {
    return (
      <View style={styles.wrap}>
        <View style={styles.dividerRow}>
          <View style={styles.divider} />
          <Text style={styles.dividerText}>Or continue with</Text>
          <View style={styles.divider} />
        </View>
        <ActivityIndicator color={THEME.colors.textMuted} style={{ marginVertical: 12 }} />
      </View>
    );
  }

  if (!effectiveId) {
    return (
      <View style={styles.wrap}>
        <View style={styles.dividerRow}>
          <View style={styles.divider} />
          <Text style={styles.dividerText}>Or continue with</Text>
          <View style={styles.divider} />
        </View>
        <Text style={styles.hintMuted}>
          {configError ||
            (serverHadBaseButNoId
              ? "Server has no Google Web client ID (set GOOGLE_CLIENT_ID in frontend/.env.local and restart Next.js), or add EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID to Mobile/.env and restart Expo with --clear."
              : "Set your Vaultly server URL first, then try again. Or add EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID (or GOOGLE_CLIENT_ID) to Mobile/.env and run: npx expo start --clear")}
        </Text>
      </View>
    );
  }

  return (
    <GoogleAuthMobileInner
      clientId={effectiveId}
      disabled={disabled}
      busy={busy}
      setBusy={setBusy}
      onIdToken={onIdToken}
      onMessage={onMessage}
      pendingBaseUrl={pendingBaseUrl}
    />
  );
}

function GoogleAuthMobileInner({
  clientId,
  disabled,
  busy,
  setBusy,
  onIdToken,
  onMessage,
  pendingBaseUrl,
}: Props & { clientId: string }) {
  const redirectUri = getGoogleOAuthRedirectUri(clientId);

  const [, response, promptAsync] = Google.useIdTokenAuthRequest({
    webClientId: clientId,
    iosClientId: clientId,
    androidClientId: clientId,
    redirectUri,
  });

  const lastKey = useRef<string | null>(null);

  useEffect(() => {
    if (!response) return;

    if (response.type === "cancel" || response.type === "dismiss") {
      setBusy(false);
      return;
    }

    if (response.type === "error") {
      setBusy(false);
      const err = response.error as { message?: string } | undefined;
      const msg =
        err?.message ||
        (response.params?.error_description as string) ||
        (response.params?.error as string) ||
        "Google sign-in failed";
      onMessage(msg);
      return;
    }

    if (response.type !== "success") return;

    const idToken =
      (response.params?.id_token as string | undefined) ||
      (response.authentication?.idToken as string | undefined);
    const key = `${response.url || ""}|${idToken?.slice(0, 24) || ""}`;
    if (lastKey.current === key) return;
    lastKey.current = key;

    if (!idToken) {
      setBusy(false);
      onMessage(
        "No ID token from Google. In Google Cloud Console, add authorized redirect URIs for Expo (see Expo Google auth docs)."
      );
      return;
    }

    void (async () => {
      await onIdToken(idToken);
      setBusy(false);
    })();
  }, [response, onIdToken, onMessage, setBusy]);

  const open = async () => {
    lastKey.current = null;
    onMessage(null);
    let base = (await getApiBase()).trim().replace(/\/$/, "");
    const pending = resolveBaseForConfig(pendingBaseUrl);
    if (!base && pending) {
      await setApiBase(pending);
      base = pending;
    }
    if (!base) {
      onMessage("Save your Vaultly server URL first (use the main button above), then try Google.");
      return;
    }
    setBusy(true);
    void promptAsync({ showInRecents: true });
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.dividerRow}>
        <View style={styles.divider} />
        <Text style={styles.dividerText}>Or continue with</Text>
        <View style={styles.divider} />
      </View>
      <TouchableOpacity
        style={[styles.btn, (disabled || busy) && styles.btnDisabled]}
        onPress={() => void open()}
        disabled={disabled || busy}
        activeOpacity={0.9}
      >
        {busy ? <ActivityIndicator color={THEME.colors.text} /> : <Text style={styles.btnText}>Google</Text>}
      </TouchableOpacity>
      <Text style={styles.hint}>Uses the same Google account as the Vaultly website.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 16, paddingHorizontal: 24 },
  dividerRow: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  divider: { flex: 1, height: 1, backgroundColor: THEME.colors.border },
  dividerText: {
    marginHorizontal: 10,
    fontSize: 11,
    fontWeight: "600",
    color: THEME.colors.textMuted,
    textTransform: "uppercase",
  },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: THEME.colors.input,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: 10,
    paddingVertical: 14,
  },
  btnDisabled: { opacity: 0.55 },
  btnText: { color: THEME.colors.text, fontSize: 16, fontWeight: "600" },
  hint: { marginTop: 8, fontSize: 11, color: THEME.colors.textMuted, textAlign: "center", lineHeight: 16 },
  hintMuted: { marginTop: 4, fontSize: 11, color: THEME.colors.textMuted, textAlign: "center", lineHeight: 16 },
});
