import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Switch,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  TrendingUp,
  Plus,
  AlertCircle,
  Save,
} from 'lucide-react-native';
import * as api from '../lib/api';

const THEME = {
  colors: {
    background: '#080D1A',
    surface: '#0F1624',
    elevated: '#182033',
    input: '#0D1220',
    border: '#1E2D45',
    primary: '#3B82F6',
    accentGreen: '#10B981',
    accentRed: '#EF4444',
    accentAmber: '#F59E0B',
    text: '#F1F5F9',
    textSecondary: '#94A3B8',
    textMuted: '#475569',
  },
};

interface Formula {
  stocks: number;
  emergency: number;
  obligations: number;
  food: number;
  flex: number;
}

interface CheckIn {
  date: string;
  score: string;
  answers: boolean[];
}

interface LogEntry {
  id: string;
  month: string;
  income: number;
  stocks: number;
  emergency: number;
  notes: string;
}

const DEFAULT_FORMULA: Formula = {
  stocks: 20,
  emergency: 10,
  obligations: 30,
  food: 25,
  flex: 15,
};

const CHECK_IN_QUESTIONS = [
  "Did I invest my stock allocation this week?",
  "Did I move money to my emergency fund?",
  "Did I stay within my obligations budget?",
  "Did I stay within my food budget?",
  "Did I avoid overspending my flex budget?",
  "Did I log this month's investment amount?",
];

export default function TrackerScreen() {
  const [income, setIncome] = useState<number>(0);
  const [formula, setFormula] = useState<Formula>(DEFAULT_FORMULA);
  const [editingFormula, setEditingFormula] = useState<Formula>(DEFAULT_FORMULA);
  const [isEditingFormula, setIsEditingFormula] = useState(false);
  const [checkins, setCheckins] = useState<CheckIn[]>([]);
  const [currentCheckin, setCurrentCheckin] = useState<boolean[]>(new Array(6).fill(false));
  const [monthlyLog, setMonthlyLog] = useState<LogEntry[]>([]);
  
  const [newEntry, setNewEntry] = useState<Partial<LogEntry>>({
    month: new Date().toLocaleString('default', { month: 'long', year: 'numeric' }),
    income: 0,
    stocks: 0,
    emergency: 0,
    notes: ""
  });

  const [syncNote, setSyncNote] = useState('');

  const cloudTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const allowCloudPush = useRef(false);

  const persistLocalFromState = async (
    incomeVal: number,
    formulaVal: Formula,
    checkinsVal: CheckIn[],
    logVal: LogEntry[]
  ) => {
    await AsyncStorage.setItem('financeIncome', incomeVal.toString());
    await AsyncStorage.setItem('financeFormula', JSON.stringify(formulaVal));
    await AsyncStorage.setItem('weeklyCheckins', JSON.stringify(checkinsVal));
    await AsyncStorage.setItem('monthlyLog', JSON.stringify(logVal));
  };

  const loadData = async () => {
    allowCloudPush.current = false;
    try {
      const token = await api.getToken();
      const savedIncome = await AsyncStorage.getItem('financeIncome');
      const savedFormula = await AsyncStorage.getItem('financeFormula');
      const savedCheckins = await AsyncStorage.getItem('weeklyCheckins');
      const savedLog = await AsyncStorage.getItem('monthlyLog');

      let localIncome = savedIncome ? Number(savedIncome) : 0;
      let localFormula: Formula = { ...DEFAULT_FORMULA };
      if (savedFormula) {
        try {
          localFormula = { ...DEFAULT_FORMULA, ...JSON.parse(savedFormula) };
        } catch { /* ignore */ }
      }
      let localCheckins: CheckIn[] = [];
      if (savedCheckins) {
        try {
          localCheckins = JSON.parse(savedCheckins);
        } catch { /* ignore */ }
      }
      let localLog: LogEntry[] = [];
      if (savedLog) {
        try {
          localLog = JSON.parse(savedLog);
        } catch { /* ignore */ }
      }

      const localHasData =
        localIncome > 0 ||
        localCheckins.length > 0 ||
        localLog.length > 0 ||
        JSON.stringify(localFormula) !== JSON.stringify(DEFAULT_FORMULA);

      if (token) {
        const remote = await api.fetchTrackerData();
        if (remote) {
          if (remote.persisted === false && localHasData) {
            setIncome(localIncome);
            setFormula(localFormula);
            setEditingFormula(localFormula);
            setCheckins(localCheckins);
            setMonthlyLog(localLog);
            setSyncNote('Saved to your account');
            await api.putTrackerData({
              income: localIncome,
              formula: localFormula,
              checkins: localCheckins,
              monthlyLog: localLog,
            });
          } else {
            const f = { ...DEFAULT_FORMULA, ...(remote.formula as Formula) };
            const inc = remote.income ?? 0;
            const chk = (remote.checkins || []) as CheckIn[];
            const log = (remote.monthlyLog || []) as LogEntry[];
            setIncome(inc);
            setFormula(f);
            setEditingFormula(f);
            setCheckins(chk);
            setMonthlyLog(log);
            setSyncNote('Loaded from your account');
            await persistLocalFromState(inc, f, chk, log);
          }
          return;
        }
        setSyncNote('Temporarily offline (using device storage)');
      }

      setIncome(localIncome);
      setFormula(localFormula);
      setEditingFormula(localFormula);
      setCheckins(localCheckins);
      setMonthlyLog(localLog);
    } catch (e) {
      console.error('Failed to load data', e);
    } finally {
      allowCloudPush.current = true;
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  useEffect(() => {
    if (!allowCloudPush.current) return;
    const run = async () => {
      const token = await api.getToken();
      if (!token) return;
      const ok = await api.putTrackerData({ income, formula, checkins, monthlyLog });
      if (ok) setSyncNote('Saved');
    };
    if (cloudTimer.current) clearTimeout(cloudTimer.current);
    cloudTimer.current = setTimeout(() => {
      void run();
    }, 1500);
    return () => {
      if (cloudTimer.current) clearTimeout(cloudTimer.current);
    };
  }, [income, formula, checkins, monthlyLog]);

  const saveData = async (key: string, value: any) => {
    try {
      await AsyncStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
    } catch (e) {
      console.error('Failed to save data', e);
    }
  };

  const formatNaira = (amount: number) => {
    return '₦' + amount.toLocaleString('en-NG');
  };

  const formulaSum = Object.values(editingFormula).reduce((a, b) => a + b, 0);
  const isValidFormula = formulaSum === 100;

  const allocations = [
    { label: "Stocks", percent: formula.stocks, color: THEME.colors.primary },
    { label: "Emergency", percent: formula.emergency, color: THEME.colors.accentGreen },
    { label: "Obligations", percent: formula.obligations, color: THEME.colors.accentAmber },
    { label: "Food", percent: formula.food, color: THEME.colors.accentRed },
    { label: "Flex", percent: formula.flex, color: THEME.colors.textSecondary },
  ];

  const handleSaveFormula = () => {
    if (!isValidFormula) return;
    setFormula(editingFormula);
    setIsEditingFormula(false);
    saveData('financeFormula', editingFormula);
  };

  const handleSaveCheckin = () => {
    const score = currentCheckin.filter(Boolean).length;
    const newCheckin: CheckIn = {
      date: new Date().toLocaleDateString(),
      score: `${score}/6`,
      answers: [...currentCheckin]
    };
    const updated = [newCheckin, ...checkins];
    setCheckins(updated);
    saveData('weeklyCheckins', updated);
    setCurrentCheckin(new Array(6).fill(false));
    Alert.alert("Success", "Check-in saved!");
  };

  const handleAddLogEntry = () => {
    const entry: LogEntry = {
      id: Math.random().toString(36).substr(2, 9),
      month: newEntry.month || "",
      income: newEntry.income || 0,
      stocks: newEntry.stocks || 0,
      emergency: newEntry.emergency || 0,
      notes: newEntry.notes || ""
    };
    const updated = [entry, ...monthlyLog];
    setMonthlyLog(updated);
    saveData('monthlyLog', updated);
    setNewEntry({
      month: new Date().toLocaleString('default', { month: 'long', year: 'numeric' }),
      income: 0,
      stocks: 0,
      emergency: 0,
      notes: ""
    });
  };

  const ytdStocks = monthlyLog.reduce((acc, curr) => acc + curr.stocks, 0);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View style={styles.headerTitle}>
          <TrendingUp color={THEME.colors.primary} size={24} />
          <Text style={styles.title}>Formula Tracker</Text>
        </View>
        <View style={styles.formulaBadge}>
          <Text style={styles.formulaBadgeText}>
            {formula.stocks}-{formula.emergency}-{formula.obligations}-{formula.food}-{formula.flex}
          </Text>
        </View>
      </View>

      {!!syncNote ? <Text style={styles.syncBar}>{syncNote}</Text> : null}

      {/* 1. CALCULATOR */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>1. FORMULA CALCULATOR</Text>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Income Input (₦)</Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            value={income.toString()}
            onChangeText={(text) => {
              const val = parseInt(text.replace(/[^0-9]/g, '')) || 0;
              setIncome(val);
              saveData('financeIncome', val.toString());
            }}
            placeholder="0"
            placeholderTextColor={THEME.colors.textMuted}
          />
        </View>

        <View style={styles.grid}>
          {allocations.map((item) => (
            <View key={item.label} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardLabel}>{item.label}</Text>
                <Text style={styles.cardPercent}>{item.percent}%</Text>
              </View>
              <Text style={styles.cardAmount}>{formatNaira((income * item.percent) / 100)}</Text>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${item.percent}%`, backgroundColor: item.color }]} />
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* 2. EDITOR */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>2. FORMULA EDITOR</Text>
          <TouchableOpacity onPress={() => setIsEditingFormula(!isEditingFormula)}>
            <Text style={styles.linkText}>{isEditingFormula ? 'Cancel' : 'Edit'}</Text>
          </TouchableOpacity>
        </View>

        {isEditingFormula ? (
          <View style={styles.editorContainer}>
            <View style={styles.editorGrid}>
              {Object.keys(editingFormula).map((key) => (
                <View key={key} style={styles.editorInputGroup}>
                  <Text style={styles.editorLabel}>{key} (%)</Text>
                  <TextInput
                    style={styles.smallInput}
                    keyboardType="numeric"
                    value={editingFormula[key as keyof Formula].toString()}
                    onChangeText={(text) => setEditingFormula({ ...editingFormula, [key]: parseInt(text) || 0 })}
                  />
                </View>
              ))}
            </View>
            {!isValidFormula && (
              <View style={styles.warningBox}>
                <AlertCircle size={16} color={THEME.colors.accentRed} />
                <Text style={styles.warningText}>Total must be 100% (Current: {formulaSum}%)</Text>
              </View>
            )}
            <TouchableOpacity 
              style={[styles.saveButton, !isValidFormula && { opacity: 0.5 }]} 
              disabled={!isValidFormula}
              onPress={handleSaveFormula}
            >
              <Save size={18} color="white" />
              <Text style={styles.saveButtonText}>Save Formula</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <Text style={styles.infoText}>Custom formula active. Tap Edit to change percentages.</Text>
        )}
      </View>

      {/* 3. CHECK-IN */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>3. WEEKLY CHECK-IN</Text>
        <View style={styles.questionsList}>
          {CHECK_IN_QUESTIONS.map((q, idx) => (
            <View key={idx} style={styles.questionItem}>
              <Text style={styles.questionText}>{q}</Text>
              <Switch
                value={currentCheckin[idx]}
                onValueChange={(val) => {
                  const next = [...currentCheckin];
                  next[idx] = val;
                  setCurrentCheckin(next);
                }}
                trackColor={{ false: THEME.colors.border, true: THEME.colors.primary }}
                thumbColor="white"
              />
            </View>
          ))}
        </View>
        <TouchableOpacity style={styles.submitButton} onPress={handleSaveCheckin}>
          <Text style={styles.submitButtonText}>Submit Check-in</Text>
        </TouchableOpacity>

        <Text style={styles.subHeader}>PAST CHECK-INS</Text>
        <View style={styles.historyList}>
          {checkins.map((item, idx) => (
            <View key={idx} style={styles.historyItem}>
              <Text style={styles.historyDate}>{item.date}</Text>
              <View style={[styles.scoreBadge, { backgroundColor: parseInt(item.score) >= 5 ? THEME.colors.accentGreen + '20' : THEME.colors.accentAmber + '20' }]}>
                <Text style={[styles.scoreText, { color: parseInt(item.score) >= 5 ? THEME.colors.accentGreen : THEME.colors.accentAmber }]}>
                  {item.score}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* 4. LOG */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>4. MONTHLY LOG</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHead, { width: 100 }]}>Month</Text>
              <Text style={[styles.tableHead, { width: 100 }]}>Income</Text>
              <Text style={[styles.tableHead, { width: 100 }]}>Stocks</Text>
            </View>
            {monthlyLog.map((entry) => (
              <View key={entry.id} style={styles.tableRow}>
                <Text style={[styles.tableCell, { width: 100 }]}>{entry.month}</Text>
                <Text style={[styles.tableCell, { width: 100 }]}>{formatNaira(entry.income)}</Text>
                <Text style={[styles.tableCell, { width: 100, color: THEME.colors.primary, fontWeight: 'bold' }]}>{formatNaira(entry.stocks)}</Text>
              </View>
            ))}
            <View style={styles.tableRow}>
              <TextInput
                style={[styles.tableInput, { width: 100 }]}
                value={newEntry.month}
                onChangeText={(t) => setNewEntry({...newEntry, month: t})}
                placeholder="Month"
              />
              <TextInput
                style={[styles.tableInput, { width: 100 }]}
                keyboardType="numeric"
                value={newEntry.income?.toString()}
                onChangeText={(t) => setNewEntry({...newEntry, income: parseInt(t) || 0})}
                placeholder="Income"
              />
              <TextInput
                style={[styles.tableInput, { width: 100 }]}
                keyboardType="numeric"
                value={newEntry.stocks?.toString()}
                onChangeText={(t) => setNewEntry({...newEntry, stocks: parseInt(t) || 0})}
                placeholder="Stocks"
              />
              <TouchableOpacity onPress={handleAddLogEntry} style={styles.addButton}>
                <Plus size={20} color="white" />
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
        <View style={styles.footer}>
          <Text style={styles.footerLabel}>YTD Stocks Invested:</Text>
          <Text style={styles.footerAmount}>{formatNaira(ytdStocks)}</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  headerTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: THEME.colors.text,
  },
  formulaBadge: {
    backgroundColor: THEME.colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  formulaBadgeText: {
    color: THEME.colors.textSecondary,
    fontSize: 12,
  },
  syncBar: {
    fontSize: 12,
    color: THEME.colors.accentGreen,
    marginBottom: 12,
  },
  section: {
    backgroundColor: THEME.colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: THEME.colors.textSecondary,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    color: THEME.colors.textSecondary,
    fontSize: 12,
    marginBottom: 8,
  },
  input: {
    backgroundColor: THEME.colors.input,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: 8,
    padding: 12,
    color: THEME.colors.text,
    fontSize: 16,
  },
  grid: {
    gap: 12,
  },
  card: {
    backgroundColor: THEME.colors.elevated,
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  cardLabel: {
    color: THEME.colors.textSecondary,
    fontSize: 10,
  },
  cardPercent: {
    color: THEME.colors.text,
    fontSize: 10,
    fontWeight: 'bold',
  },
  cardAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: THEME.colors.text,
    marginBottom: 8,
  },
  progressBar: {
    height: 3,
    backgroundColor: THEME.colors.input,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
  },
  linkText: {
    color: THEME.colors.primary,
    fontSize: 14,
  },
  editorContainer: {
    gap: 16,
  },
  editorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  editorInputGroup: {
    width: '30%',
  },
  editorLabel: {
    color: THEME.colors.textSecondary,
    fontSize: 10,
    marginBottom: 4,
    textTransform: 'capitalize',
  },
  smallInput: {
    backgroundColor: THEME.colors.input,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: 6,
    padding: 8,
    color: THEME.colors.text,
    fontSize: 14,
    textAlign: 'center',
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: THEME.colors.accentRed + '10',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: THEME.colors.accentRed + '20',
  },
  warningText: {
    color: THEME.colors.accentRed,
    fontSize: 12,
  },
  saveButton: {
    backgroundColor: THEME.colors.accentGreen,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 8,
  },
  saveButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  infoText: {
    color: THEME.colors.textSecondary,
    fontSize: 13,
    fontStyle: 'italic',
  },
  questionsList: {
    gap: 12,
    marginBottom: 16,
  },
  questionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: THEME.colors.input,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  questionText: {
    color: THEME.colors.text,
    fontSize: 13,
    flex: 1,
    marginRight: 12,
  },
  submitButton: {
    backgroundColor: THEME.colors.primary,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  subHeader: {
    fontSize: 10,
    fontWeight: 'bold',
    color: THEME.colors.textMuted,
    marginTop: 20,
    marginBottom: 12,
    letterSpacing: 1,
  },
  historyList: {
    gap: 8,
  },
  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: THEME.colors.elevated,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  historyDate: {
    color: THEME.colors.text,
    fontSize: 13,
  },
  scoreBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  scoreText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  table: {
    minWidth: 350,
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
    paddingBottom: 8,
    marginBottom: 8,
  },
  tableHead: {
    color: THEME.colors.textSecondary,
    fontSize: 10,
    fontWeight: 'bold',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
  },
  tableCell: {
    color: THEME.colors.text,
    fontSize: 13,
  },
  tableInput: {
    color: THEME.colors.text,
    fontSize: 13,
    padding: 4,
  },
  addButton: {
    backgroundColor: THEME.colors.primary,
    padding: 6,
    borderRadius: 6,
    marginLeft: 8,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 2,
    borderTopColor: THEME.colors.border,
  },
  footerLabel: {
    color: THEME.colors.text,
    fontWeight: 'bold',
    fontSize: 14,
  },
  footerAmount: {
    color: THEME.colors.primary,
    fontWeight: 'bold',
    fontSize: 18,
  },
});
