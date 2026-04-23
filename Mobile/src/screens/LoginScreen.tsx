import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { UserPlus, Wallet } from "lucide-react-native";
import { useAuth } from "../auth/AuthContext";
import { VAULTLY, THEME } from "../theme";
import * as api from "../lib/api";

type Mode = "signin" | "signup";

export default function LoginScreen() {
  const { signIn, signUp, error, email: savedEmail, isReady } = useAuth();
  const [mode, setMode] = useState<Mode>("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showServer, setShowServer] = useState(false);
  const [serverUrl, setServerUrl] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (!isReady) return;
    if (savedEmail) setEmail(savedEmail);
  }, [isReady, savedEmail]);

  useEffect(() => {
    (async () => {
      if (!isReady) return;
      const stored = await api.getApiBase();
      const fromBuild = api.getConfiguredApiBase();
      if (fromBuild || stored) {
        setShowServer(false);
        if (stored) setServerUrl(stored);
        else if (fromBuild) setServerUrl(fromBuild);
        return;
      }
      setShowServer(true);
    })();
  }, [isReady]);

  const onSubmit = async () => {
    setLocalError(null);
    if (showServer) {
      const s = serverUrl.trim().replace(/\/$/, "");
      if (!s) {
        setLocalError("Enter the URL of your Vaultly app (e.g. http://192.168.1.10:3000).");
        return;
      }
      await api.setApiBase(s);
      setShowServer(false);
    }
    setLoading(true);
    try {
      if (mode === "signup") {
        const ok = await signUp(email, password, name);
        if (!ok) setPassword("");
      } else {
        const ok = await signIn(email, password);
        if (!ok) setPassword("");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.wrap} edges={["top", "left", "right"]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.brand}>
          <View style={styles.brandRow}>
            <View style={styles.brandIcon}>
              <Wallet size={32} color={THEME.colors.primary} />
            </View>
            <View>
              <Text style={styles.brandName}>{VAULTLY.name}</Text>
              <Text style={styles.brandTag}>{VAULTLY.tagline}</Text>
            </View>
          </View>
          <Text style={styles.hint}>
            {mode === "signin"
              ? "Sign in with the same account you use on the web, or create a new one below."
              : "Create a Vaultly account. You can use the same email on the web app as well."}
          </Text>
        </View>

        <View style={styles.form}>
          {showServer && (
            <>
              <Text style={styles.label}>Vaultly web app URL</Text>
              <Text style={styles.serverHelp}>
                Same Wi-Fi as this phone. Use your computer’s LAN address and port (usually :3000), not localhost.
              </Text>
              <TextInput
                style={styles.input}
                value={serverUrl}
                onChangeText={setServerUrl}
                placeholder="http://192.168.x.x:3000"
                placeholderTextColor={THEME.colors.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                editable={!loading}
              />
            </>
          )}

          <View style={styles.modeRow}>
            <TouchableOpacity
              style={[styles.modeBtn, mode === "signin" && styles.modeBtnActive]}
              onPress={() => {
                setMode("signin");
                setName("");
              }}
            >
              <Text style={[styles.modeText, mode === "signin" && styles.modeTextActive]}>Sign in</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeBtn, mode === "signup" && styles.modeBtnActive]}
              onPress={() => setMode("signup")}
            >
              <View style={styles.modeInner}>
                <UserPlus size={16} color={mode === "signup" ? THEME.colors.text : THEME.colors.textMuted} />
                <Text style={[styles.modeText, mode === "signup" && styles.modeTextActive]}>Sign up</Text>
              </View>
            </TouchableOpacity>
          </View>

          {mode === "signup" && (
            <>
              <Text style={styles.label}>Name (optional)</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Your name"
                placeholderTextColor={THEME.colors.textMuted}
                autoCapitalize="words"
                editable={!loading}
              />
            </>
          )}

          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            placeholderTextColor={THEME.colors.textMuted}
            autoCapitalize="none"
            keyboardType="email-address"
            editable={!loading}
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="At least 6 characters"
            placeholderTextColor={THEME.colors.textMuted}
            secureTextEntry
            onSubmitEditing={onSubmit}
            editable={!loading}
          />

          {localError ? <Text style={styles.err}>{localError}</Text> : null}
          {error ? <Text style={styles.err}>{error}</Text> : null}

          <TouchableOpacity
            style={[styles.btn, loading && { opacity: 0.6 }]}
            onPress={onSubmit}
            disabled={loading}
            activeOpacity={0.9}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnText}>{mode === "signin" ? "Sign in" : "Create account"}</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: THEME.colors.background },
  flex: { flex: 1 },
  brand: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 20 },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 16 },
  brandIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: THEME.colors.surface,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  brandName: { fontSize: 30, fontWeight: "800", color: THEME.colors.text, letterSpacing: -0.5 },
  brandTag: { color: THEME.colors.textSecondary, fontSize: 16, marginTop: 2 },
  hint: { color: THEME.colors.textMuted, fontSize: 14, lineHeight: 20, marginTop: 20 },
  form: { paddingHorizontal: 24, paddingBottom: 32, gap: 4 },
  modeRow: {
    flexDirection: "row",
    backgroundColor: THEME.colors.input,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    marginBottom: 8,
  },
  modeBtn: { flex: 1, paddingVertical: 12, alignItems: "center", justifyContent: "center" },
  modeBtnActive: { borderBottomWidth: 2, borderBottomColor: THEME.colors.primary, marginBottom: -1 },
  modeInner: { flexDirection: "row", alignItems: "center", gap: 6 },
  modeText: { color: THEME.colors.textMuted, fontSize: 15, fontWeight: "600" },
  modeTextActive: { color: THEME.colors.text },
  label: { color: THEME.colors.textSecondary, fontSize: 12, marginTop: 10, marginBottom: 6 },
  serverHelp: { color: THEME.colors.textMuted, fontSize: 12, lineHeight: 18, marginBottom: 6 },
  input: {
    backgroundColor: THEME.colors.input,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: 10,
    padding: 14,
    color: THEME.colors.text,
    fontSize: 16,
  },
  err: { color: THEME.colors.accentRed, fontSize: 14, marginTop: 8 },
  btn: {
    backgroundColor: THEME.colors.primary,
    borderRadius: 10,
    padding: 16,
    alignItems: "center",
    marginTop: 20,
  },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
