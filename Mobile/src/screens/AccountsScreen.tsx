import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { Building2, Plus, Trash2 } from "lucide-react-native";
import * as api from "../lib/api";
import { THEME } from "../theme";

const banks = [
  "GTBank",
  "Access Bank",
  "Zenith Bank",
  "First Bank",
  "UBA",
  "Opay",
  "Palmpay",
  "Kuda",
  "Wema Bank",
  "Fidelity Bank",
  "Sterling Bank",
  "Other",
];

const colors = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#A855F7", "#06B6D4"];

const fmt = (n: number) => "₦" + n.toLocaleString("en-NG", { maximumFractionDigits: 0 });

export default function AccountsScreen() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [list, setList] = useState<api.BankAccount[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    bankName: "",
    nickname: "",
    type: "PERSONAL" as "PERSONAL" | "BUSINESS",
    last4: "",
    currency: "NGN",
    color: colors[0],
  });

  const load = useCallback(async () => {
    setErr(null);
    setLoading(true);
    const { data, error, status } = await api.fetchAccounts();
    setLoading(false);
    if (error || !data) {
      setErr(error || `Failed (${status})`);
      return;
    }
    setList(data.accounts || []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const add = async () => {
    if (!form.bankName.trim() || !form.nickname.trim()) {
      setErr("Bank and nickname are required");
      return;
    }
    const { error } = await api.createAccount({ ...form, last4: form.last4 || undefined });
    if (error) {
      setErr(error);
      return;
    }
    setOpen(false);
    setForm({ ...form, bankName: "", nickname: "", last4: "" });
    void load();
  };

  const del = async (id: string) => {
    const { error } = await api.deleteAccount(id);
    if (error) {
      setErr(String(error));
      return;
    }
    void load();
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={load} tintColor={THEME.colors.primary} />
      }
    >
      {loading && !list.length ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={THEME.colors.primary} />
        </View>
      ) : null}
      {err ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{err}</Text>
        </View>
      ) : null}

      <View style={styles.headerRow}>
        <Building2 size={24} color={THEME.colors.primary} />
        <Text style={styles.h1}>My accounts</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setOpen(true)}>
          <Plus size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {list.map((a) => (
        <View
          key={a.id}
          style={[styles.card, { borderLeftColor: a.color || THEME.colors.primary, borderLeftWidth: 4 }]}
        >
          <View style={styles.cardTop}>
            <View>
              <Text style={styles.bank}>{a.bankName}</Text>
              <Text style={styles.nick}>{a.nickname}</Text>
              <Text style={styles.meta}>
                {a.type} · •••• {a.last4 || "----"} · {a.currency}
              </Text>
            </View>
            <TouchableOpacity onPress={() => void del(a.id)} hitSlop={12}>
              <Trash2 size={20} color={THEME.colors.textSecondary} />
            </TouchableOpacity>
          </View>
          <View style={styles.row3}>
            <View>
              <Text style={styles.subl}>Txns</Text>
              <Text style={styles.nums}>{a.transactionCount}</Text>
            </View>
            <View>
              <Text style={styles.subl}>In</Text>
              <Text style={[styles.nums, { color: THEME.colors.accentGreen }]}>{fmt(a.totalIn || 0)}</Text>
            </View>
            <View>
              <Text style={styles.subl}>Out</Text>
              <Text style={[styles.nums, { color: THEME.colors.accentRed }]}>{fmt(a.totalOut || 0)}</Text>
            </View>
          </View>
        </View>
      ))}

      {open ? (
        <View style={styles.modal}>
          <Text style={styles.h2}>Add account</Text>
          <TextInput
            style={styles.inp}
            placeholder="Bank name"
            placeholderTextColor={THEME.colors.textMuted}
            value={form.bankName}
            onChangeText={(t) => setForm((f) => ({ ...f, bankName: t }))}
          />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.banksChips}>
            {banks.map((b) => (
              <TouchableOpacity
                key={b}
                style={styles.chip}
                onPress={() => setForm((f) => ({ ...f, bankName: b }))}
              >
                <Text style={styles.chipText}>{b}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <TextInput
            style={styles.inp}
            placeholder="Nickname (e.g. Main)"
            placeholderTextColor={THEME.colors.textMuted}
            value={form.nickname}
            onChangeText={(t) => setForm((f) => ({ ...f, nickname: t }))}
          />
          <View style={styles.typeRow}>
            <TouchableOpacity
              style={[styles.typeBtn, form.type === "PERSONAL" && styles.typeBtnOn]}
              onPress={() => setForm((f) => ({ ...f, type: "PERSONAL" }))}
            >
              <Text style={form.type === "PERSONAL" ? styles.typeOn : styles.typeOff}>Personal</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.typeBtn, form.type === "BUSINESS" && styles.typeBtnOnB]}
              onPress={() => setForm((f) => ({ ...f, type: "BUSINESS" }))}
            >
              <Text style={form.type === "BUSINESS" ? styles.typeOn : styles.typeOff}>Business</Text>
            </TouchableOpacity>
          </View>
          <TextInput
            style={styles.inp}
            placeholder="Last 4 digits (optional)"
            placeholderTextColor={THEME.colors.textMuted}
            value={form.last4}
            maxLength={4}
            keyboardType="number-pad"
            onChangeText={(t) => setForm((f) => ({ ...f, last4: t }))}
          />
          <Text style={styles.label}>Card color</Text>
          <View style={styles.colorsRow}>
            {colors.map((c) => (
              <TouchableOpacity
                key={c}
                style={[
                  styles.cdot,
                  { backgroundColor: c },
                  form.color === c && { borderColor: "#fff", borderWidth: 2 },
                ]}
                onPress={() => setForm((f) => ({ ...f, color: c }))}
              />
            ))}
          </View>
          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.cancel} onPress={() => setOpen(false)}>
              <Text style={styles.cancelT}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.save} onPress={() => void add()}>
              <Text style={styles.saveT}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.colors.background },
  content: { padding: 16, paddingBottom: 32 },
  centered: { padding: 32, alignItems: "center" },
  errorBox: { padding: 12, borderRadius: 10, backgroundColor: "rgba(239,68,68,0.15)", marginBottom: 12 },
  errorText: { color: THEME.colors.accentRed, fontSize: 14 },
  headerRow: { flexDirection: "row", alignItems: "center", marginBottom: 16, gap: 10 },
  h1: { flex: 1, fontSize: 22, fontWeight: "700", color: THEME.colors.text },
  addBtn: { backgroundColor: THEME.colors.primary, borderRadius: 10, padding: 10 },
  h2: { fontSize: 18, fontWeight: "600", color: THEME.colors.text, marginBottom: 12 },
  card: { borderRadius: 12, backgroundColor: THEME.colors.surface, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: THEME.colors.border },
  cardTop: { flexDirection: "row", justifyContent: "space-between" },
  bank: { fontSize: 18, fontWeight: "700", color: THEME.colors.text },
  nick: { fontSize: 14, color: THEME.colors.textSecondary, marginTop: 2 },
  meta: { fontSize: 12, color: THEME.colors.textMuted, marginTop: 4 },
  row3: { flexDirection: "row", marginTop: 12, borderTopWidth: 1, borderTopColor: THEME.colors.border, paddingTop: 10 },
  subl: { fontSize: 11, color: THEME.colors.textMuted },
  nums: { fontSize: 15, fontWeight: "600", color: THEME.colors.text, marginTop: 2 },
  modal: { marginTop: 8, borderRadius: 12, backgroundColor: THEME.colors.surface, padding: 16, borderWidth: 1, borderColor: THEME.colors.border },
  inp: { borderWidth: 1, borderColor: THEME.colors.border, borderRadius: 10, padding: 12, color: THEME.colors.text, marginBottom: 10, backgroundColor: THEME.colors.background },
  label: { fontSize: 12, color: THEME.colors.textSecondary, marginBottom: 6 },
  banksChips: { maxHeight: 40, marginBottom: 8 },
  chip: { backgroundColor: THEME.colors.elevated, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, marginRight: 6 },
  chipText: { fontSize: 12, color: THEME.colors.textSecondary },
  typeRow: { flexDirection: "row", gap: 8, marginBottom: 10 },
  typeBtn: { flex: 1, padding: 10, borderRadius: 8, backgroundColor: THEME.colors.elevated, alignItems: "center" },
  typeBtnOn: { backgroundColor: THEME.colors.primary },
  typeBtnOnB: { backgroundColor: "#D97706" },
  typeOn: { color: "#fff", fontWeight: "600" },
  typeOff: { color: THEME.colors.textSecondary },
  colorsRow: { flexDirection: "row", gap: 10, marginBottom: 12 },
  cdot: { width: 32, height: 32, borderRadius: 16 },
  modalActions: { flexDirection: "row", justifyContent: "flex-end", gap: 12, marginTop: 8 },
  cancel: { padding: 12 },
  cancelT: { color: THEME.colors.textSecondary, fontSize: 16 },
  save: { backgroundColor: THEME.colors.primary, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 10 },
  saveT: { color: "#fff", fontWeight: "600", fontSize: 16 },
});
