import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import Constants from "expo-constants";
import { THEME } from "../theme";
import { getGoogleWebClientId, getGoogleAndroidClientId } from "../lib/google-config";
import { fetchSocialAuthConfig, getApiBase, setApiBase } from "../lib/api";

WebBrowser.maybeCompleteAuthSession();

// In Expo Go, Constants.appOwnership === "expo". In a standalone APK it's null/"standalone".
const isExpoGo = Constants.appOwnership === "expo";

type Props = {
  disabled: boolean;
  busy: boolean;
  setBusy: (v: boolean) => void;
  onIdToken: (idToken: string) => Promise<boolean>;
  onMessage: (msg: string | null) => void;
  pendingBaseUrl?: string;
};

export function GoogleAuthMobile({ disabled, busy, setBusy, onIdToken, onMessage, pendingBaseUrl }: Props) {
  const webClientId = getGoogleWebClientId();
  const androidClientId = getGoogleAndroidClientId();

  // In Expo Go, native Google OAuth doesn't work — show a clear message instead.
  if (isExpoGo) {
    return (
      <View style={styles.wrap}>
        <View style={styles.dividerRow}>
          <View style={styles.divider} />
          <Text style={styles.dividerText}>Or continue with</Text>
          <View style={styles.divider} />
        </View>
        <Text style={styles.hintMuted}>
          Google sign-in is available in the full app (APK). Use email & password to test in Expo Go.
        </Text>
      </View>
    );
  }

  if (!androidClientId || !webClientId) {
    return (
      <View style={styles.wrap}>
        <View style={styles.dividerRow}>
          <View style={styles.divider} />
          <Text style={styles.dividerText}>Or continue with</Text>
          <View style={styles.divider} />
        </View>
        <Text style={styles.hintMuted}>
          Google sign-in is not configured. Set EXPO_PUBLIC_ANDROID_GOOGLE_CLIENT_ID in Mobile/.env and rebuild.
        </Text>
      </View>
    );
  }

  return (
    <GoogleAuthNative
      webClientId={webClientId}
      androidClientId={androidClientId}
      disabled={disabled}
      busy={busy}
      setBusy={setBusy}
      onIdToken={onIdToken}
      onMessage={onMessage}
      pendingBaseUrl={pendingBaseUrl}
    />
  );
}

type NativeProps = Props & { webClientId: string; androidClientId: string };

function GoogleAuthNative({ webClientId, androidClientId, disabled, busy, setBusy, onIdToken, onMessage, pendingBaseUrl }: NativeProps) {
  // Using androidClientId + webClientId together causes Google to include an id_token
  // with aud=webClientId — exactly what the server's /api/mobile/google expects.
  const [, response, promptAsync] = Google.useAuthRequest({
    androidClientId,
    webClientId,
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
      const msg = (response.error as { message?: string } | undefined)?.message || "Google sign-in failed";
      onMessage(msg);
      return;
    }

    if (response.type !== "success") return;

    const idToken = response.authentication?.idToken;
    const key = idToken?.slice(0, 32) ?? null;
    if (lastKey.current === key) return;
    lastKey.current = key;

    if (!idToken) {
      setBusy(false);
      onMessage("No ID token received from Google. Try again.");
      return;
    }

    void (async () => {
      try {
        await onIdToken(idToken);
      } catch {
        onMessage("Google sign-in failed unexpectedly. Try again.");
      } finally {
        setBusy(false);
      }
    })();
  }, [response, onIdToken, onMessage, setBusy]);

  const open = async () => {
    lastKey.current = null;
    onMessage(null);
    setBusy(true);

    let opened = false;
    try {
      // Verify server is reachable and has Google configured
      let base = (await getApiBase()).trim().replace(/\/$/, "");
      const pending = (pendingBaseUrl || "").trim().replace(/\/$/, "");
      if (!base && pending) {
        await setApiBase(pending);
        base = pending;
      }
      if (!base) {
        onMessage("Save your Arzo server URL first, then try Google.");
        return;
      }
      const gate = await fetchSocialAuthConfig(base);
      if (gate.fetchError) { onMessage(gate.fetchError); return; }
      if (!gate.googleMobile) {
        onMessage("Google sign-in is not configured on the server. Check GOOGLE_CLIENT_ID and NEXTAUTH_SECRET.");
        return;
      }

      opened = true;
      void promptAsync().catch(() => {
        setBusy(false);
        onMessage("Could not open Google sign-in. Try again.");
      });
    } finally {
      if (!opened) setBusy(false);
    }
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
      <Text style={styles.hint}>Uses the same Google account as the Arzo website.</Text>
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
