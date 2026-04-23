import React, { useCallback, useEffect, useState } from "react";
import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, ListRenderItem } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { Upload } from "lucide-react-native";
import * as api from "../lib/api";
import { THEME } from "../theme";

type ParsedRow = {
  date: string;
  description: string;
  amount: number;
  type: string;
  category?: string;
};

export default function UploadScreen() {
  const [accounts, setAccounts] = useState<api.BankAccount[]>([]);
  const [accountId, setAccountId] = useState("");
  const [month, setMonth] = useState("");
  const [file, setFile] = useState<{ uri: string; name: string; mimeType?: string | null } | null>(null);
  const [parsed, setParsed] = useState<ParsedRow[]>([]);
  const [summary, setSummary] = useState<api.UploadParseResponse["summary"] | null>(null);
  const [statementDocument, setStatementDocument] = useState<unknown>(null);
  const [working, setWorking] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [loadAcc, setLoadAcc] = useState(true);

  const load = useCallback(async () => {
    setLoadAcc(true);
    const { data } = await api.fetchAccounts();
    setLoadAcc(false);
    if (data?.accounts?.length) {
      setAccounts(data.accounts);
      setAccountId((id) => id || data!.accounts[0]!.id);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const pick = async () => {
    setErr(null);
    const r = await DocumentPicker.getDocumentAsync({
      type: [
        "application/pdf",
        "text/csv",
        "text/comma-separated-values",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/vnd.ms-excel",
      ],
      copyToCacheDirectory: true,
    });
    if (r.canceled || !r.assets?.[0]) return;
    const a = r.assets[0];
    setFile({ uri: a.uri, name: a.name, mimeType: a.mimeType });
    setParsed([]);
    setSummary(null);
    setStatementDocument(null);
  };

  const runUpload = async () => {
    if (!file || !accountId) {
      setErr("Pick a file and account first");
      return;
    }
    setErr(null);
    setWorking(true);
    const { data, error, status } = await api.postStatementUpload(accountId, file, month || undefined);
    setWorking(false);
    if (error || !data) {
      setErr(error || `Parse failed (${status})`);
      return;
    }
    if (data.error) {
      setErr(data.error);
      return;
    }
    setParsed((data.transactions || []) as ParsedRow[]);
    setSummary(data.summary || null);
    setStatementDocument(data.statementDocument ?? null);
  };

  const confirm = async () => {
    if (!parsed.length || !accountId) return;
    setErr(null);
    setWorking(true);
    const { data, error, status } = await api.postStatementConfirm({
      transactions: parsed,
      accountId,
      month,
      sourceFileName: file?.name || "upload",
      statementDocument: statementDocument ?? null,
    });
    setWorking(false);
    if (error || !data) {
      setErr(error || `Save failed (${status})`);
      return;
    }
    Alert.alert("Saved", "Transactions stored. Open the Reports tab to run a financial audit.", [{ text: "OK" }]);
    setParsed([]);
    setSummary(null);
    setStatementDocument(null);
    setFile(null);
    void load();
  };

  const setCat = (i: number, category: string) => {
    setParsed((p) => p.map((x, idx) => (idx === i ? { ...x, category } : x)));
  };

  if (loadAcc) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={THEME.colors.primary} />
      </View>
    );
  }

  if (!accounts.length) {
    return (
      <View style={styles.container}>
        <Text style={styles.hint}>Add an account in the Accounts tab before uploading a statement.</Text>
      </View>
    );
  }

  const net = summary && typeof summary.net === "number" ? summary.net : (Number(summary?.totalCredit || 0) - Number(summary?.totalDebit || 0));
  const dateLine =
    summary?.dateFrom && summary?.dateTo
      ? `${summary.dateFrom} → ${summary.dateTo}`
      : null;

  const renderRow: ListRenderItem<ParsedRow> = ({ item, index }) => (
    <View style={styles.row}>
      <View style={styles.rowMain}>
        <Text style={styles.d}>{item.date}</Text>
        <Text style={styles.dsc} numberOfLines={2}>
          {item.description}
        </Text>
        <Text style={styles.amt}>
          {item.type} {item.amount}
        </Text>
      </View>
      <TextInput
        style={styles.cat}
        value={item.category || ""}
        onChangeText={(c) => setCat(index, c)}
        placeholder="Category"
        placeholderTextColor={THEME.colors.textMuted}
      />
    </View>
  );

  const listHeader = (
    <>
      <View style={styles.titleRow}>
        <Upload size={24} color={THEME.colors.primary} />
        <Text style={styles.h1}>Upload statement</Text>
      </View>
      {err ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{err}</Text>
        </View>
      ) : null}

      <Text style={styles.label}>Account</Text>
      <View style={styles.pickerBox}>
        {accounts.map((a) => (
          <TouchableOpacity
            key={a.id}
            style={[styles.chip, accountId === a.id && styles.chipOn]}
            onPress={() => setAccountId(a.id)}
          >
            <Text style={[styles.chipT, accountId === a.id && styles.chipTOn]}>
              {a.bankName} — {a.nickname}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Statement month (optional — tags import; each row still uses its own date month)</Text>
      <TextInput
        style={styles.inp}
        placeholder="e.g. 2026-04"
        placeholderTextColor={THEME.colors.textMuted}
        value={month}
        onChangeText={setMonth}
      />

      <TouchableOpacity style={styles.fileBtn} onPress={() => void pick()}>
        <Text style={styles.fileBtnT}>{file ? file.name : "Choose PDF or CSV / Excel"}</Text>
        <Text style={styles.sub}>Tap to pick a file from your device</Text>
      </TouchableOpacity>

      {file ? (
        <TouchableOpacity style={styles.runBtn} onPress={() => void runUpload()} disabled={working}>
          {working ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.runBtnT}>Parse file</Text>
          )}
        </TouchableOpacity>
      ) : null}

      {summary ? (
        <View style={styles.sumBox}>
          <Text style={styles.sum}>
            {summary.count} rows — in ₦{Number(summary.totalCredit || 0).toLocaleString()} · out ₦{Number(summary.totalDebit || 0).toLocaleString()} ·
            net ₦{net.toLocaleString()}
          </Text>
          {dateLine ? <Text style={styles.sub}>Dates in file: {dateLine}</Text> : null}
        </View>
      ) : null}

      {parsed.length > 0 ? <Text style={styles.h2}>Review & edit categories (all {parsed.length} rows save)</Text> : null}
    </>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={parsed}
        keyExtractor={(_, i) => `r-${i}`}
        ListHeaderComponent={listHeader}
        ListFooterComponent={
          parsed.length > 0 ? (
            <TouchableOpacity style={styles.runBtn} onPress={() => void confirm()} disabled={working}>
              {working ? <ActivityIndicator color="#fff" /> : <Text style={styles.runBtnT}>Save {parsed.length} to server</Text>}
            </TouchableOpacity>
          ) : null
        }
        renderItem={renderRow}
        contentContainerStyle={styles.content}
        style={styles.list}
        initialNumToRender={24}
        windowSize={7}
        keyboardShouldPersistTaps="handled"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  center: { justifyContent: "center" },
  container: { flex: 1, backgroundColor: THEME.colors.background },
  list: { flex: 1 },
  content: { padding: 16, paddingBottom: 40, flexGrow: 1 },
  h1: { fontSize: 20, fontWeight: "700", color: THEME.colors.text, marginLeft: 8 },
  titleRow: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  hint: { color: THEME.colors.textSecondary, padding: 20, fontSize: 15 },
  h2: { color: THEME.colors.text, fontSize: 16, fontWeight: "600", marginTop: 16, marginBottom: 8 },
  errorBox: { backgroundColor: "rgba(239,68,68,0.12)", padding: 10, borderRadius: 8, marginBottom: 10 },
  errorText: { color: THEME.colors.accentRed, fontSize: 14 },
  label: { color: THEME.colors.textSecondary, fontSize: 12, marginBottom: 4, marginTop: 8 },
  inp: { borderWidth: 1, borderColor: THEME.colors.border, borderRadius: 10, padding: 12, color: THEME.colors.text, backgroundColor: THEME.colors.surface },
  pickerBox: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 8 },
  chip: { borderWidth: 1, borderColor: THEME.colors.border, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  chipOn: { borderColor: THEME.colors.primary, backgroundColor: "rgba(59,130,246,0.2)" },
  chipT: { color: THEME.colors.textSecondary, fontSize: 12 },
  chipTOn: { color: THEME.colors.text, fontWeight: "600" },
  fileBtn: { marginTop: 10, borderStyle: "dashed", borderWidth: 1, borderColor: THEME.colors.border, borderRadius: 12, padding: 20, alignItems: "center" },
  fileBtnT: { color: THEME.colors.primary, fontSize: 15, fontWeight: "600" },
  sub: { color: THEME.colors.textMuted, fontSize: 12, marginTop: 4 },
  runBtn: { marginTop: 12, backgroundColor: THEME.colors.primary, borderRadius: 10, padding: 14, alignItems: "center" },
  runBtnT: { color: "#fff", fontWeight: "600", fontSize: 16 },
  sum: { color: THEME.colors.textSecondary, fontSize: 14, marginTop: 0 },
  sumBox: { marginTop: 8, marginBottom: 4 },
  row: { borderBottomWidth: 1, borderBottomColor: THEME.colors.border, paddingVertical: 6 },
  rowMain: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 4 },
  d: { color: THEME.colors.textMuted, fontSize: 11, width: 88 },
  dsc: { flex: 1, minWidth: 100, color: THEME.colors.text, fontSize: 12 },
  amt: { color: THEME.colors.textSecondary, fontSize: 11, width: 64, textAlign: "right" },
  cat: { borderWidth: 1, borderColor: THEME.colors.border, borderRadius: 6, marginTop: 4, padding: 6, color: THEME.colors.text, fontSize: 12, backgroundColor: THEME.colors.surface },
});
