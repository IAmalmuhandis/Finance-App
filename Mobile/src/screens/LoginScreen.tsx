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
import { Eye, EyeOff, UserPlus } from "lucide-react-native";
import { useAuth } from "../auth/AuthContext";
import { ArzoMark } from "../components/ArzoMark";
import { ARZO, THEME } from "../theme";
import * as api from "../lib/api";

type Mode = "signin" | "signup";

export default function LoginScreen() {
  const { signIn, signUp, error, email: savedEmail, isReady } = useAuth();
  const [mode, setMode] = useState<Mode>("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showServer, setShowServer] = useState(false);
  const [serverUrl, setServerUrl] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

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
        setLocalError("Enter the URL of your Arzo app (e.g. http://192.168.1.10:3000).");
        return;
      }
      await api.setApiBase(s);
      setShowServer(false);
      return;
    }
    if (!email.trim()) { setLocalError("Enter your email."); return; }
    if (!password) { setLocalError("Enter your password."); return; }
    if (mode === "signup") {
      if (password.length < 6) { setLocalError("Password must be at least 6 characters."); return; }
      if (password !== confirmPassword) { setLocalError("Passwords do not match."); return; }
    }
    setLoading(true);
    try {
      if (mode === "signup") {
        const ok = await signUp(email, password, name);
        if (!ok) { setPassword(""); setConfirmPassword(""); }
      } else {
        const ok = await signIn(email, password);
        if (!ok) setPassword("");
      }
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (next: Mode) => {
    setMode(next);
    setName("");
    setPassword("");
    setConfirmPassword("");
    setLocalError(null);
    if (next === "signin") setName("");
  };

  const primaryLabel = showServer ? "Save & continue" : mode === "signin" ? "Sign in" : "Create account";

  return (
    <SafeAreaView style={styles.wrap} edges={["top", "left", "right"]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.contentWrap}>
          <View style={styles.brand}>
            <View style={styles.brandRow}>
              <View style={styles.brandIcon}>
                <ArzoMark size={56} />
              </View>
              <View>
                <Text style={styles.brandName}>{ARZO.name}</Text>
                <Text style={styles.brandTag}>{ARZO.tagline}</Text>
              </View>
            </View>
            <Text style={styles.hint}>
              {mode === "signin"
                ? "Sign in with the same account you use on the web, or create a new one below."
                : "Create an Arzo account. You can use the same email on the web app as well."}
            </Text>
          </View>

          <View style={styles.form}>
            {showServer && (
              <>
                <Text style={styles.label}>Arzo server URL</Text>
                <Text style={styles.serverHelp}>
                  Same Wi-Fi as this phone. Use your computer LAN address and port (usually :3000), not localhost.
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
                onPress={() => switchMode("signin")}
                disabled={loading}
              >
                <Text style={[styles.modeText, mode === "signin" && styles.modeTextActive]}>Sign in</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modeBtn, mode === "signup" && styles.modeBtnActive]}
                onPress={() => switchMode("signup")}
                disabled={loading}
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
            <View style={styles.passwordWrap}>
              <TextInput
                style={styles.passwordInput}
                value={password}
                onChangeText={setPassword}
                placeholder="At least 6 characters"
                placeholderTextColor={THEME.colors.textMuted}
                secureTextEntry={!showPassword}
                onSubmitEditing={mode === "signin" ? onSubmit : undefined}
                editable={!loading}
              />
              <TouchableOpacity
                style={styles.eyeBtn}
                onPress={() => setShowPassword((v) => !v)}
                disabled={loading}
                hitSlop={10}
                accessibilityLabel={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={20} color={THEME.colors.textSecondary} /> : <Eye size={20} color={THEME.colors.textSecondary} />}
              </TouchableOpacity>
            </View>

            {mode === "signup" && (
              <>
                <Text style={styles.label}>Confirm password</Text>
                <View style={styles.passwordWrap}>
                  <TextInput
                    style={[
                      styles.passwordInput,
                      confirmPassword.length > 0 && password !== confirmPassword && styles.inputError,
                    ]}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    placeholder="Re-enter your password"
                    placeholderTextColor={THEME.colors.textMuted}
                    secureTextEntry={!showConfirm}
                    onSubmitEditing={onSubmit}
                    editable={!loading}
                  />
                  <TouchableOpacity
                    style={styles.eyeBtn}
                    onPress={() => setShowConfirm((v) => !v)}
                    disabled={loading}
                    hitSlop={10}
                    accessibilityLabel={showConfirm ? "Hide password" : "Show password"}
                  >
                    {showConfirm ? <EyeOff size={20} color={THEME.colors.textSecondary} /> : <Eye size={20} color={THEME.colors.textSecondary} />}
                  </TouchableOpacity>
                </View>
                {confirmPassword.length > 0 && password !== confirmPassword ? (
                  <Text style={styles.matchHint}>Passwords do not match</Text>
                ) : confirmPassword.length > 0 && password === confirmPassword ? (
                  <Text style={styles.matchOk}>Passwords match ✓</Text>
                ) : null}
              </>
            )}

            {localError ? <Text style={styles.err}>{localError}</Text> : null}
            {error ? <Text style={styles.err}>{error}</Text> : null}

            <TouchableOpacity
              style={[styles.btn, loading && { opacity: 0.55 }]}
              onPress={onSubmit}
              disabled={loading}
              activeOpacity={0.9}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.btnText}>{primaryLabel}</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={{ marginTop: 18, alignSelf: "center", paddingVertical: 8 }}
              onPress={() => switchMode(mode === "signin" ? "signup" : "signin")}
              disabled={loading}
            >
              <Text style={{ color: THEME.colors.textSecondary, fontSize: 14, textDecorationLine: "underline" }}>
                {mode === "signin" ? "New user? Register" : "Have an account? Sign in"}
              </Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.busyOverlay} pointerEvents="auto">
              <ActivityIndicator size="large" color={THEME.colors.primary} />
              <Text style={styles.busyTitle}>
                {mode === "signup" ? "Creating your account..." : "Signing you in..."}
              </Text>
              <Text style={styles.busySub}>This only takes a moment</Text>
            </View>
          ) : null}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: THEME.colors.background },
  flex: { flex: 1 },
  contentWrap: { flex: 1, position: "relative" },
  busyOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(246, 244, 238, 0.92)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 40,
    paddingHorizontal: 32,
  },
  busyTitle: {
    marginTop: 20,
    color: THEME.colors.text,
    fontSize: 16,
    fontFamily: THEME.fonts.uiSemibold,
    textAlign: "center",
  },
  busySub: { marginTop: 8, color: THEME.colors.textMuted, fontSize: 13, fontFamily: THEME.fonts.ui, textAlign: "center" },
  brand: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 20 },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 16 },
  brandIcon: { width: 56, height: 56, alignItems: "center", justifyContent: "center" },
  brandName: { fontSize: 32, fontFamily: THEME.fonts.display, color: THEME.colors.primary, letterSpacing: -0.5 },
  brandTag: { color: THEME.colors.gold, fontSize: 15, fontFamily: THEME.fonts.displayRegular, fontStyle: "italic", marginTop: 4 },
  hint: { color: THEME.colors.textMuted, fontSize: 14, lineHeight: 20, marginTop: 20 },
  form: { paddingHorizontal: 24, paddingBottom: 32, gap: 4 },
  modeRow: {
    flexDirection: "row",
    backgroundColor: THEME.colors.input,
    borderRadius: THEME.radius.input,
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
    borderRadius: THEME.radius.input,
    padding: 14,
    color: THEME.colors.text,
    fontSize: 16,
    fontFamily: THEME.fonts.ui,
  },
  inputError: { borderColor: THEME.colors.accentAlert },
  passwordWrap: { position: "relative", justifyContent: "center" },
  passwordInput: {
    backgroundColor: THEME.colors.input,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: THEME.radius.input,
    paddingVertical: 14,
    paddingLeft: 14,
    paddingRight: 52,
    color: THEME.colors.text,
    fontSize: 16,
  },
  eyeBtn: { position: "absolute", right: 4, top: 0, bottom: 0, justifyContent: "center", paddingHorizontal: 10 },
  matchHint: { color: THEME.colors.accentAlert, fontSize: 12, marginTop: 4, fontFamily: THEME.fonts.ui },
  matchOk: { color: THEME.colors.primary, fontSize: 12, marginTop: 4, fontFamily: THEME.fonts.ui },
  err: { color: THEME.colors.accentAlert, fontSize: 14, marginTop: 8, fontFamily: THEME.fonts.ui },
  btn: {
    backgroundColor: THEME.colors.primary,
    borderRadius: THEME.radius.button,
    padding: 16,
    alignItems: "center",
    marginTop: 20,
  },
  btnText: { color: THEME.colors.textOnJade, fontFamily: THEME.fonts.uiSemibold, fontSize: 16 },
});
