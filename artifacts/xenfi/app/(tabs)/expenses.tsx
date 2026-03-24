import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Pressable, Platform, Modal,
  TextInput, Alert, Dimensions, KeyboardAvoidingView,
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Colors from '@/constants/colors';
import { useApi } from '@/hooks/useApi';

const { width: SCREEN_W } = Dimensions.get('window');
const CHART_RADIUS = Math.min(SCREEN_W * 0.26, 100);
const STROKE = 26;
const ICON_ORBIT = CHART_RADIUS + STROKE / 2 + 54;

type Period = 'day' | 'week' | 'month' | 'year' | 'all';

interface Expense {
  id: number;
  txType: string;
  amount: number;
  category: string;
  currency: string;
  description: string;
  date: string;
}

interface CustomCategory { id: number; name: string; icon: string; color: string; txType: string }
interface CurrencyRow { id: number; code: string; symbol: string; name: string; isDefault: boolean }

const PRESET_CATEGORIES = [
  { id: 'car', name: 'Car', icon: 'truck', color: '#5B8DB8', txType: 'expense' },
  { id: 'gift', name: 'Gift', icon: 'gift', color: '#E8A0C0', txType: 'expense' },
  { id: 'food', name: 'Food', icon: 'coffee', color: '#88C870', txType: 'expense' },
  { id: 'home', name: 'Home', icon: 'home', color: '#7AB8E8', txType: 'expense' },
  { id: 'taxi', name: 'Taxi', icon: 'navigation', color: '#F0C060', txType: 'expense' },
  { id: 'fun', name: 'Fun', icon: 'film', color: '#E8A070', txType: 'expense' },
  { id: 'shopping', name: 'Shopping', icon: 'shopping-bag', color: '#C8A0E8', txType: 'expense' },
  { id: 'bills', name: 'Bills', icon: 'file-text', color: '#F0B040', txType: 'expense' },
  { id: 'phone', name: 'Phone', icon: 'phone', color: '#9090C8', txType: 'expense' },
  { id: 'transit', name: 'Transit', icon: 'map', color: '#C87070', txType: 'expense' },
  { id: 'pet', name: 'Pet', icon: 'heart', color: '#88D888', txType: 'expense' },
  { id: 'health', name: 'Health', icon: 'activity', color: '#E87070', txType: 'expense' },
  { id: 'dining', name: 'Dining', icon: 'coffee', color: '#F09050', txType: 'expense' },
  { id: 'beauty', name: 'Beauty', icon: 'eye', color: '#E888B8', txType: 'expense' },
  { id: 'sport', name: 'Sport', icon: 'zap', color: '#70C8A0', txType: 'expense' },
  { id: 'wear', name: 'Clothing', icon: 'tag', color: '#B870C8', txType: 'expense' },
  { id: 'salary', name: 'Salary', icon: 'dollar-sign', color: '#50C878', txType: 'income' },
  { id: 'savings', name: 'Savings', icon: 'archive', color: '#4090D8', txType: 'income' },
  { id: 'returns', name: 'Returns', icon: 'trending-up', color: '#50B8D8', txType: 'income' },
  { id: 'business', name: 'Business', icon: 'briefcase', color: '#8058C8', txType: 'income' },
];

const PRESET_CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'BDT', symbol: '৳', name: 'Bangladeshi Taka' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'CAD', symbol: 'CA$', name: 'Canadian Dollar' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'CHF', symbol: 'Fr', name: 'Swiss Franc' },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan' },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar' },
];

const COLOR_PALETTE = ['#5B8DB8','#E8A0C0','#88C870','#7AB8E8','#F0C060','#E8A070','#C8A0E8','#F0B040','#9090C8','#C87070','#88D888','#E87070','#F09050','#E888B8','#70C8A0','#B870C8','#D4AF37','#50C878','#4090D8'];

function DonutChart({ income, expense, data, symbol }: { income: number; expense: number; data: { value: number; color: string }[]; symbol: string }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const sz = CHART_RADIUS * 2 + STROKE;
  const cx = sz / 2;
  const circ = 2 * Math.PI * CHART_RADIUS;
  let off = 0;
  const segs = data.map((d) => {
    const dash = total > 0 ? (d.value / total) * circ : 0;
    const seg = { dash, offset: circ - off, color: d.color };
    off += dash;
    return seg;
  });
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={sz} height={sz}>
        <Circle cx={cx} cy={cx} r={CHART_RADIUS} fill="none" stroke={Colors.backgroundTertiary} strokeWidth={STROKE} />
        {total === 0 ? (
          <Circle cx={cx} cy={cx} r={CHART_RADIUS} fill="none" stroke="#2A3F5A" strokeWidth={STROKE}
            strokeDasharray={`${circ * 0.97} ${circ * 0.03}`} strokeDashoffset={circ * 0.25} strokeLinecap="round" />
        ) : segs.map((seg, i) => seg.dash > 1 ? (
          <Circle key={i} cx={cx} cy={cx} r={CHART_RADIUS} fill="none" stroke={seg.color} strokeWidth={STROKE}
            strokeDasharray={`${seg.dash - 2} ${circ - seg.dash + 2}`}
            strokeDashoffset={seg.offset}
            strokeLinecap="round" rotation="-90" origin={`${cx},${cx}`} />
        ) : null)}
      </Svg>
      <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
        <Text style={styles.chartIncome}>{symbol}{income.toLocaleString('en-US', { minimumFractionDigits: 2 })}</Text>
        <Text style={styles.chartExpense}>{symbol}{expense.toLocaleString('en-US', { minimumFractionDigits: 2 })}</Text>
      </View>
    </View>
  );
}

function CatIcon({ name, icon, color, pct, selected, onPress }: { name: string; icon: string; color: string; pct?: number; selected?: boolean; onPress?: () => void }) {
  return (
    <Pressable style={[styles.catWrap, selected && { borderRadius: 14, backgroundColor: color + '22' }]} onPress={onPress}>
      <View style={[styles.catCircle, { borderColor: color, backgroundColor: color + '1A' }]}>
        <Feather name={icon as any} size={18} color={color} />
      </View>
      <Text style={styles.catName} numberOfLines={1}>{name}</Text>
      {pct !== undefined && pct > 0 && <Text style={[styles.catPct, { color }]}>{pct}%</Text>}
    </Pressable>
  );
}

export default function ExpensesScreen() {
  const insets = useSafeAreaInsets();
  const { apiFetch } = useApi();
  const qc = useQueryClient();
  const webTopPad = Platform.OS === 'web' ? 67 : insets.top;
  const webBottomPad = Platform.OS === 'web' ? 34 : insets.bottom;

  const [period, setPeriod] = useState<Period>('month');
  const [curDate, setCurDate] = useState(new Date());
  const [view, setView] = useState<'chart' | 'list'>('chart');
  const [selCat, setSelCat] = useState<string | null>(null);

  const [showAdd, setShowAdd] = useState(false);
  const [addType, setAddType] = useState<'income' | 'expense'>('expense');
  const [addAmt, setAddAmt] = useState('');
  const [addCat, setAddCat] = useState('');
  const [addDesc, setAddDesc] = useState('');
  const [addDate, setAddDate] = useState(new Date().toISOString().slice(0, 10));

  const [showCatMgr, setShowCatMgr] = useState(false);
  const [showCurrMgr, setShowCurrMgr] = useState(false);
  const [showPeriodPicker, setShowPeriodPicker] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);

  const [newCatName, setNewCatName] = useState('');
  const [newCatIcon, setNewCatIcon] = useState('tag');
  const [newCatColor, setNewCatColor] = useState('#D4AF37');
  const [newCatType, setNewCatType] = useState<'expense' | 'income'>('expense');

  const [newCurrCode, setNewCurrCode] = useState('');
  const [newCurrSym, setNewCurrSym] = useState('');
  const [newCurrName, setNewCurrName] = useState('');
  const [defSym, setDefSym] = useState('$');
  const [defCode, setDefCode] = useState('USD');

  const { data: expenses = [] } = useQuery<Expense[]>({ queryKey: ['expenses'], queryFn: () => apiFetch('/expenses') });
  const { data: customCats = [] } = useQuery<CustomCategory[]>({ queryKey: ['categories'], queryFn: () => apiFetch('/categories') });
  const { data: currencies = [] } = useQuery<CurrencyRow[]>({ queryKey: ['currencies'], queryFn: () => apiFetch('/currencies') });

  useEffect(() => {
    const def = currencies.find((c) => c.isDefault);
    if (def) { setDefSym(def.symbol); setDefCode(def.code); }
    else AsyncStorage.getItem('xenfi_currency').then((v) => { if (v) { const c = JSON.parse(v); setDefSym(c.symbol); setDefCode(c.code); } });
  }, [currencies]);

  const allCats = useMemo(() => {
    const mapped = customCats.map((c) => ({ ...c, id: String(c.id) }));
    return [...PRESET_CATEGORIES, ...mapped];
  }, [customCats]);

  const filtered = useMemo(() => expenses.filter((e) => {
    if (period === 'all') return true;
    const d = new Date(e.date), n = curDate;
    if (period === 'day') return d.toDateString() === n.toDateString();
    if (period === 'week') {
      const s = new Date(n); s.setDate(n.getDate() - n.getDay()); s.setHours(0, 0, 0, 0);
      const en = new Date(s); en.setDate(s.getDate() + 6); en.setHours(23, 59, 59, 999);
      return d >= s && d <= en;
    }
    if (period === 'month') return d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear();
    if (period === 'year') return d.getFullYear() === n.getFullYear();
    return true;
  }), [expenses, period, curDate]);

  const totalIncome = useMemo(() => filtered.filter((e) => e.txType === 'income').reduce((s, e) => s + e.amount, 0), [filtered]);
  const totalExp = useMemo(() => filtered.filter((e) => e.txType === 'expense').reduce((s, e) => s + e.amount, 0), [filtered]);
  const balance = totalIncome - totalExp;

  const catTotals = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.filter((e) => e.txType === 'expense').forEach((e) => { map[e.category] = (map[e.category] || 0) + e.amount; });
    return map;
  }, [filtered]);

  const chartData = useMemo(() =>
    Object.entries(catTotals).map(([cat, val]) => {
      const found = allCats.find((c) => c.name.toLowerCase() === cat.toLowerCase());
      return { value: val, color: found?.color || '#888' };
    }), [catTotals, allCats]);

  const expenseCats = useMemo(() => allCats.filter((c) => c.txType === 'expense'), [allCats]);
  const addModeCats = useMemo(() => allCats.filter((c) => c.txType === addType), [allCats, addType]);

  const catGroups = useMemo(() => {
    const map: Record<string, Expense[]> = {};
    filtered.forEach((e) => { if (!map[e.category]) map[e.category] = []; map[e.category].push(e); });
    return Object.entries(map).sort(([, a], [, b]) => b.reduce((s, x) => s + x.amount, 0) - a.reduce((s, x) => s + x.amount, 0));
  }, [filtered]);

  function navPeriod(d: number) {
    const dt = new Date(curDate);
    if (period === 'day') dt.setDate(dt.getDate() + d);
    else if (period === 'week') dt.setDate(dt.getDate() + d * 7);
    else if (period === 'month') dt.setMonth(dt.getMonth() + d);
    else if (period === 'year') dt.setFullYear(dt.getFullYear() + d);
    setCurDate(dt);
  }

  function periodLabel() {
    if (period === 'all') return 'All Time';
    const o: Intl.DateTimeFormatOptions = period === 'day' ? { weekday: 'short', day: 'numeric', month: 'short' } : period === 'week' ? { day: 'numeric', month: 'short' } : period === 'month' ? { month: 'long', year: 'numeric' } : { year: 'numeric' };
    return curDate.toLocaleDateString('en-US', o);
  }

  const addMut = useMutation({
    mutationFn: (d: object) => apiFetch('/expenses', { method: 'POST', body: JSON.stringify(d) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['expenses'] }); qc.invalidateQueries({ queryKey: ['insights'] }); setShowAdd(false); setAddAmt(''); setAddCat(''); setAddDesc(''); setAddDate(new Date().toISOString().slice(0, 10)); },
    onError: (e: any) => Alert.alert('Error', e.message),
  });

  const delMut = useMutation({
    mutationFn: (id: number) => apiFetch(`/expenses/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['expenses'] }),
  });

  const addCatMut = useMutation({
    mutationFn: (d: object) => apiFetch('/categories', { method: 'POST', body: JSON.stringify(d) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['categories'] }); setNewCatName(''); },
  });

  const delCatMut = useMutation({
    mutationFn: (id: number) => apiFetch(`/categories/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
  });

  const addCurrMut = useMutation({
    mutationFn: (d: object) => apiFetch('/currencies', { method: 'POST', body: JSON.stringify(d) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['currencies'] }); setNewCurrCode(''); setNewCurrSym(''); setNewCurrName(''); },
    onError: (e: any) => Alert.alert('Error', e.message),
  });

  const setDefCurrMut = useMutation({
    mutationFn: (id: number) => apiFetch(`/currencies/${id}/default`, { method: 'PATCH', body: '{}' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['currencies'] }),
  });

  function handleAdd() {
    if (!addAmt || !addCat) return Alert.alert('Required', 'Enter amount and select a category');
    addMut.mutate({ amount: parseFloat(addAmt), category: addCat, description: addDesc || addCat, date: new Date(addDate).toISOString(), txType: addType, currency: defCode });
  }

  function handleAddCat() {
    if (!newCatName.trim()) return;
    addCatMut.mutate({ name: newCatName.trim(), icon: newCatIcon, color: newCatColor, txType: newCatType });
  }

  function handleAddCurr() {
    if (!newCurrCode || !newCurrSym || !newCurrName) return Alert.alert('Required', 'Fill all fields');
    addCurrMut.mutate({ code: newCurrCode.toUpperCase(), symbol: newCurrSym, name: newCurrName, isDefault: false });
  }

  function setDefaultCurr(code: string, symbol: string, id?: number) {
    setDefSym(symbol); setDefCode(code);
    AsyncStorage.setItem('xenfi_currency', JSON.stringify({ code, symbol }));
    if (id) setDefCurrMut.mutate(id);
  }

  const iconCellSz = 60;
  const areaH = (ICON_ORBIT + iconCellSz / 2 + 16) * 2;

  const radialCats = useMemo(() => {
    const cats = expenseCats.slice(0, 16);
    const n = cats.length;
    const cx = SCREEN_W / 2, cy = areaH / 2;
    return cats.map((cat, i) => {
      const angle = (i / n) * 2 * Math.PI - Math.PI / 2;
      return { cat, x: cx + Math.cos(angle) * ICON_ORBIT - iconCellSz / 2, y: cy + Math.sin(angle) * ICON_ORBIT - iconCellSz / 2, pct: totalExp > 0 ? Math.round(((catTotals[cat.name] || 0) / totalExp) * 100) : 0 };
    });
  }, [expenseCats, catTotals, totalExp, areaH]);

  return (
    <View style={[styles.root, { paddingTop: webTopPad }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => setShowSidebar(true)} hitSlop={8} style={styles.hBtn}>
          <Feather name="menu" size={22} color={Colors.text} />
        </Pressable>
        <View style={styles.periodRow}>
          {period !== 'all' && (
            <Pressable onPress={() => navPeriod(-1)} hitSlop={8}>
              <Feather name="chevron-left" size={18} color={Colors.textSecondary} />
            </Pressable>
          )}
          <Pressable onPress={() => setShowPeriodPicker(true)}>
            <Text style={styles.periodLbl}>{periodLabel()}</Text>
          </Pressable>
          {period !== 'all' && (
            <Pressable onPress={() => navPeriod(1)} hitSlop={8}>
              <Feather name="chevron-right" size={18} color={Colors.textSecondary} />
            </Pressable>
          )}
        </View>
        <Pressable onPress={() => setView(view === 'chart' ? 'list' : 'chart')} hitSlop={8} style={styles.hBtn}>
          <Feather name={view === 'chart' ? 'list' : 'pie-chart'} size={20} color={Colors.accent} />
        </Pressable>
      </View>

      {/* Period tabs */}
      <View style={styles.tabs}>
        {(['day', 'week', 'month', 'year', 'all'] as Period[]).map((p) => (
          <Pressable key={p} style={[styles.tab, period === p && styles.tabActive]} onPress={() => setPeriod(p)}>
            <Text style={[styles.tabTxt, period === p && styles.tabTxtActive]}>{p.charAt(0).toUpperCase() + p.slice(1)}</Text>
          </Pressable>
        ))}
      </View>

      {view === 'chart' ? (
        <View style={styles.chartContainer}>
          <View style={{ width: SCREEN_W, height: areaH, position: 'relative' }}>
            {radialCats.map(({ cat, x, y, pct }) => (
              <View key={cat.id} style={{ position: 'absolute', left: x, top: y, width: iconCellSz, alignItems: 'center' }}>
                <CatIcon name={cat.name} icon={cat.icon} color={cat.color} pct={pct}
                  selected={selCat === cat.name} onPress={() => setSelCat(selCat === cat.name ? null : cat.name)} />
              </View>
            ))}
            <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
              <DonutChart income={totalIncome} expense={totalExp} data={chartData} symbol={defSym} />
            </View>
          </View>
          {selCat && catTotals[selCat] && (
            <View style={styles.catDetail}>
              <Text style={styles.catDetailName}>{selCat}</Text>
              <Text style={styles.catDetailAmt}>{defSym}{catTotals[selCat].toLocaleString('en-US', { minimumFractionDigits: 2 })}</Text>
              <Text style={styles.catDetailCt}>{filtered.filter((e) => e.category === selCat).length} transactions</Text>
            </View>
          )}
        </View>
      ) : (
        <ScrollView style={{ flex: 1, paddingHorizontal: 16 }} contentContainerStyle={{ paddingBottom: 180 }} showsVerticalScrollIndicator={false}>
          <View style={styles.summRow}>
            <View style={styles.summItem}>
              <Text style={styles.summLbl}>Income</Text>
              <Text style={[styles.summAmt, { color: Colors.highlight }]}>{defSym}{totalIncome.toLocaleString('en-US', { minimumFractionDigits: 2 })}</Text>
            </View>
            <View style={styles.summDiv} />
            <View style={styles.summItem}>
              <Text style={styles.summLbl}>Expenses</Text>
              <Text style={[styles.summAmt, { color: Colors.error }]}>{defSym}{totalExp.toLocaleString('en-US', { minimumFractionDigits: 2 })}</Text>
            </View>
          </View>
          {catGroups.length === 0 ? (
            <View style={styles.empty}><Feather name="inbox" size={40} color={Colors.textMuted} /><Text style={styles.emptyTxt}>No transactions this period</Text></View>
          ) : catGroups.map(([cat, txs]) => {
            const tot = txs.reduce((s, e) => s + e.amount, 0);
            const ci = allCats.find((c) => c.name.toLowerCase() === cat.toLowerCase());
            const expanded = selCat === cat;
            return (
              <View key={cat} style={styles.grp}>
                <Pressable style={styles.grpHd} onPress={() => setSelCat(expanded ? null : cat)}>
                  <Feather name={expanded ? 'chevron-up' : 'chevron-down'} size={14} color={Colors.textMuted} />
                  <View style={[styles.grpIco, { backgroundColor: (ci?.color || Colors.accent) + '22', borderColor: ci?.color || Colors.accent }]}>
                    <Feather name={(ci?.icon || 'tag') as any} size={16} color={ci?.color || Colors.accent} />
                  </View>
                  <Text style={styles.grpName}>{cat}</Text>
                  <View style={styles.grpBadge}><Text style={styles.grpBadgeTxt}>{txs.length}</Text></View>
                  <Text style={[styles.grpAmt, { color: txs[0]?.txType === 'income' ? Colors.highlight : Colors.error }]}>
                    {defSym}{tot.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </Text>
                </Pressable>
                {expanded && txs.map((e) => (
                  <View key={e.id} style={styles.txRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.txDesc}>{e.description || e.category}</Text>
                      <Text style={styles.txDate}>{new Date(e.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}</Text>
                    </View>
                    <Text style={[styles.txAmt, { color: e.txType === 'income' ? Colors.highlight : Colors.error }]}>
                      {e.txType === 'income' ? '+' : '-'}{defSym}{e.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </Text>
                    <Pressable onPress={() => delMut.mutate(e.id)} hitSlop={12} style={{ padding: 4 }}>
                      <Feather name="trash-2" size={14} color={Colors.textMuted} />
                    </Pressable>
                  </View>
                ))}
              </View>
            );
          })}
        </ScrollView>
      )}

      {/* Bottom balance + buttons */}
      <View style={[styles.bottom, { paddingBottom: Math.max(webBottomPad, 16) + 12 }]}>
        <View style={[styles.balBar, { borderColor: balance >= 0 ? Colors.highlight : Colors.error, backgroundColor: (balance >= 0 ? Colors.highlight : Colors.error) + '18' }]}>
          <Text style={[styles.balTxt, { color: balance >= 0 ? Colors.highlight : Colors.error }]}>
            Balance  {defSym}{balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </Text>
        </View>
        <View style={styles.btnRow}>
          <Pressable style={styles.minusBtn} onPress={() => { setAddType('expense'); setShowAdd(true); }}>
            <Feather name="minus" size={28} color={Colors.error} />
          </Pressable>
          <Pressable style={styles.plusBtn} onPress={() => { setAddType('income'); setShowAdd(true); }}>
            <Feather name="plus" size={28} color={Colors.highlight} />
          </Pressable>
        </View>
      </View>

      {/* ── ADD TRANSACTION MODAL ── */}
      <Modal visible={showAdd} animationType="slide" transparent>
        <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.addSheet}>
            <View style={styles.handle} />
            <View style={styles.typeRow}>
              <Pressable style={[styles.typeBtn, addType === 'expense' && { backgroundColor: Colors.error }]} onPress={() => { setAddType('expense'); setAddCat(''); }}>
                <Text style={[styles.typeTxt, addType === 'expense' && { color: '#fff' }]}>− Expense</Text>
              </Pressable>
              <Pressable style={[styles.typeBtn, addType === 'income' && { backgroundColor: Colors.highlight }]} onPress={() => { setAddType('income'); setAddCat(''); }}>
                <Text style={[styles.typeTxt, addType === 'income' && { color: '#fff' }]}>+ Income</Text>
              </Pressable>
            </View>
            <View style={styles.amtRow}>
              <Text style={styles.amtSym}>{defSym}</Text>
              <TextInput style={styles.amtInput} value={addAmt} onChangeText={setAddAmt} keyboardType="numeric" placeholder="0.00" placeholderTextColor={Colors.textMuted} autoFocus />
            </View>
            <Text style={styles.addLbl}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }} contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}>
              {addModeCats.map((cat) => (
                <Pressable key={String(cat.id)} onPress={() => setAddCat(cat.name)} style={[styles.catChip, addCat === cat.name && { borderColor: cat.color, backgroundColor: cat.color + '22' }]}>
                  <Feather name={(cat.icon || 'tag') as any} size={16} color={cat.color} />
                  <Text style={[styles.catChipTxt, { color: addCat === cat.name ? cat.color : Colors.textSecondary }]}>{cat.name}</Text>
                </Pressable>
              ))}
            </ScrollView>
            <View style={styles.addFields}>
              <TextInput style={styles.fieldInput} value={addDesc} onChangeText={setAddDesc} placeholder="Description (optional)" placeholderTextColor={Colors.textMuted} />
              <TextInput style={styles.fieldInput} value={addDate} onChangeText={setAddDate} placeholder="Date YYYY-MM-DD" placeholderTextColor={Colors.textMuted} />
            </View>
            <View style={styles.addActions}>
              <Pressable style={styles.cancelBtn} onPress={() => setShowAdd(false)}><Text style={styles.cancelTxt}>Cancel</Text></Pressable>
              <Pressable style={[styles.saveBtn, { backgroundColor: addType === 'income' ? Colors.highlight : Colors.error }]} onPress={handleAdd} disabled={addMut.isPending}>
                <Text style={styles.saveTxt}>{addMut.isPending ? 'Saving…' : 'Save'}</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── SIDEBAR ── */}
      <Modal visible={showSidebar} animationType="fade" transparent>
        <View style={{ flex: 1, flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.55)' }}>
          <View style={styles.sidebar}>
            <Text style={styles.sidebarTitle}>XenFi</Text>
            {([
              { icon: 'bookmark', label: 'Categories', action: () => { setShowSidebar(false); setShowCatMgr(true); } },
              { icon: 'dollar-sign', label: 'Currencies', action: () => { setShowSidebar(false); setShowCurrMgr(true); } },
              { icon: 'calendar', label: 'Period', action: () => { setShowSidebar(false); setShowPeriodPicker(true); } },
            ] as const).map((it) => (
              <Pressable key={it.label} style={styles.sidebarItem} onPress={it.action}>
                <View style={styles.sidebarIco}><Feather name={it.icon as any} size={28} color={Colors.highlight} /></View>
                <Text style={styles.sidebarLbl}>{it.label}</Text>
              </Pressable>
            ))}
          </View>
          <Pressable style={{ flex: 1 }} onPress={() => setShowSidebar(false)} />
        </View>
      </Modal>

      {/* ── PERIOD PICKER ── */}
      <Modal visible={showPeriodPicker} animationType="fade" transparent>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', paddingHorizontal: 40 }}>
          <View style={styles.periodSheet}>
            <Text style={styles.periodSheetTitle}>Select Period</Text>
            {(['day', 'week', 'month', 'year', 'all'] as Period[]).map((p) => (
              <Pressable key={p} style={[styles.periodOpt, period === p && styles.periodOptActive]} onPress={() => { setPeriod(p); setShowPeriodPicker(false); }}>
                <Text style={[styles.periodOptTxt, period === p && styles.periodOptTxtActive]}>{p === 'day' ? 'Day' : p === 'week' ? 'Week' : p === 'month' ? 'Month' : p === 'year' ? 'Year' : 'All Time'}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </Modal>

      {/* ── CATEGORIES MANAGER ── */}
      <Modal visible={showCatMgr} animationType="slide" transparent>
        <View style={styles.fullModal}>
          <View style={styles.fullModalHd}>
            <Text style={styles.fullModalTitle}>Categories</Text>
            <Pressable onPress={() => setShowCatMgr(false)}><Feather name="x" size={22} color={Colors.text} /></Pressable>
          </View>
          <ScrollView contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 50 }}>
            <Text style={styles.secTitle}>Preset</Text>
            {PRESET_CATEGORIES.map((c) => (
              <View key={c.id} style={styles.catRow}>
                <View style={[styles.catRowIco, { backgroundColor: c.color + '22', borderColor: c.color }]}><Feather name={c.icon as any} size={17} color={c.color} /></View>
                <Text style={styles.catRowName}>{c.name}</Text>
                <Text style={styles.catRowType}>{c.txType}</Text>
              </View>
            ))}
            <Text style={[styles.secTitle, { marginTop: 12 }]}>Custom</Text>
            {customCats.length === 0 && <Text style={styles.emptyTxt}>No custom categories yet</Text>}
            {customCats.map((c) => (
              <View key={c.id} style={styles.catRow}>
                <View style={[styles.catRowIco, { backgroundColor: c.color + '22', borderColor: c.color }]}><Feather name={(c.icon || 'tag') as any} size={17} color={c.color} /></View>
                <Text style={styles.catRowName}>{c.name}</Text>
                <Text style={styles.catRowType}>{c.txType}</Text>
                <Pressable onPress={() => delCatMut.mutate(c.id)} hitSlop={12}><Feather name="trash-2" size={16} color={Colors.error} /></Pressable>
              </View>
            ))}
            <Text style={[styles.secTitle, { marginTop: 12 }]}>Add New</Text>
            <TextInput style={styles.mInput} value={newCatName} onChangeText={setNewCatName} placeholder="Category name" placeholderTextColor={Colors.textMuted} />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Pressable style={[styles.typeBtn, newCatType === 'expense' && { backgroundColor: Colors.error }]} onPress={() => setNewCatType('expense')}>
                <Text style={[styles.typeTxt, newCatType === 'expense' && { color: '#fff' }]}>Expense</Text>
              </Pressable>
              <Pressable style={[styles.typeBtn, newCatType === 'income' && { backgroundColor: Colors.highlight }]} onPress={() => setNewCatType('income')}>
                <Text style={[styles.typeTxt, newCatType === 'income' && { color: '#fff' }]}>Income</Text>
              </Pressable>
            </View>
            <Text style={styles.addLbl}>Color</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {COLOR_PALETTE.map((c) => (
                <Pressable key={c} onPress={() => setNewCatColor(c)} style={[styles.colorDot, { backgroundColor: c }, newCatColor === c && styles.colorDotSel]} />
              ))}
            </ScrollView>
            <Text style={styles.addLbl}>Icon</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {['tag','home','truck','coffee','gift','shopping-bag','film','phone','heart','activity','zap','star','briefcase','archive','trending-up','dollar-sign','map','navigation','eye'].map((ic) => (
                <Pressable key={ic} onPress={() => setNewCatIcon(ic)} style={[styles.iconDot, newCatIcon === ic && { backgroundColor: newCatColor + '33', borderColor: newCatColor }]}>
                  <Feather name={ic as any} size={18} color={newCatIcon === ic ? newCatColor : Colors.textMuted} />
                </Pressable>
              ))}
            </ScrollView>
            <Pressable style={styles.actionBtn} onPress={handleAddCat} disabled={addCatMut.isPending}>
              <Text style={styles.actionBtnTxt}>{addCatMut.isPending ? 'Adding…' : '+ Add Category'}</Text>
            </Pressable>
          </ScrollView>
        </View>
      </Modal>

      {/* ── CURRENCIES MANAGER ── */}
      <Modal visible={showCurrMgr} animationType="slide" transparent>
        <View style={styles.fullModal}>
          <View style={styles.fullModalHd}>
            <Text style={styles.fullModalTitle}>Currencies</Text>
            <Pressable onPress={() => setShowCurrMgr(false)}><Feather name="x" size={22} color={Colors.text} /></Pressable>
          </View>
          <ScrollView contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 50 }}>
            <Text style={styles.secTitle}>Select Default Currency</Text>
            {PRESET_CURRENCIES.map((c) => {
              const saved = currencies.find((x) => x.code === c.code);
              const active = defCode === c.code;
              return (
                <Pressable key={c.code} style={[styles.currRow, active && { borderColor: Colors.accent }]} onPress={() => setDefaultCurr(c.code, c.symbol, saved?.id)}>
                  <Text style={styles.currSym}>{c.symbol}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.currCode}>{c.code}</Text>
                    <Text style={styles.currName}>{c.name}</Text>
                  </View>
                  {active && <Feather name="check-circle" size={20} color={Colors.accent} />}
                </Pressable>
              );
            })}
            {currencies.filter((c) => !PRESET_CURRENCIES.find((p) => p.code === c.code)).map((c) => (
              <Pressable key={c.id} style={[styles.currRow, defCode === c.code && { borderColor: Colors.accent }]} onPress={() => setDefaultCurr(c.code, c.symbol, c.id)}>
                <Text style={styles.currSym}>{c.symbol}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.currCode}>{c.code}</Text>
                  <Text style={styles.currName}>{c.name}</Text>
                </View>
                {defCode === c.code && <Feather name="check-circle" size={20} color={Colors.accent} />}
              </Pressable>
            ))}
            <Text style={[styles.secTitle, { marginTop: 12 }]}>Add Custom Currency</Text>
            <TextInput style={styles.mInput} value={newCurrCode} onChangeText={setNewCurrCode} placeholder="Code (e.g. BDT)" placeholderTextColor={Colors.textMuted} autoCapitalize="characters" />
            <TextInput style={styles.mInput} value={newCurrSym} onChangeText={setNewCurrSym} placeholder="Symbol (e.g. ৳)" placeholderTextColor={Colors.textMuted} />
            <TextInput style={styles.mInput} value={newCurrName} onChangeText={setNewCurrName} placeholder="Name (e.g. Bangladeshi Taka)" placeholderTextColor={Colors.textMuted} />
            <Pressable style={styles.actionBtn} onPress={handleAddCurr} disabled={addCurrMut.isPending}>
              <Text style={styles.actionBtnTxt}>{addCurrMut.isPending ? 'Adding…' : '+ Add Currency'}</Text>
            </Pressable>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingBottom: 6, gap: 6 },
  hBtn: { padding: 8 },
  periodRow: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 },
  periodLbl: { fontFamily: 'Inter_600SemiBold', fontSize: 15, color: Colors.text },
  tabs: { flexDirection: 'row', paddingHorizontal: 12, gap: 5, marginBottom: 4 },
  tab: { flex: 1, paddingVertical: 5, borderRadius: 8, alignItems: 'center', backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.cardBorder },
  tabActive: { backgroundColor: Colors.accent + '22', borderColor: Colors.accent },
  tabTxt: { fontFamily: 'Inter_500Medium', fontSize: 10, color: Colors.textMuted },
  tabTxtActive: { color: Colors.accent, fontFamily: 'Inter_700Bold' },
  chartContainer: { flex: 1, alignItems: 'center' },
  catWrap: { alignItems: 'center', gap: 2, padding: 3 },
  catCircle: { width: 40, height: 40, borderRadius: 20, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  catName: { fontFamily: 'Inter_400Regular', fontSize: 8, color: Colors.textSecondary, textAlign: 'center', maxWidth: 50 },
  catPct: { fontFamily: 'Inter_700Bold', fontSize: 8 },
  chartIncome: { fontFamily: 'Inter_600SemiBold', fontSize: 12, color: Colors.highlight },
  chartExpense: { fontFamily: 'Inter_600SemiBold', fontSize: 12, color: Colors.error },
  catDetail: { backgroundColor: Colors.card, borderRadius: 14, borderWidth: 1, borderColor: Colors.cardBorder, padding: 12, marginHorizontal: 20, alignItems: 'center', marginTop: -8 },
  catDetailName: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: Colors.text },
  catDetailAmt: { fontFamily: 'Inter_700Bold', fontSize: 18, color: Colors.error },
  catDetailCt: { fontFamily: 'Inter_400Regular', fontSize: 11, color: Colors.textMuted },
  summRow: { flexDirection: 'row', backgroundColor: Colors.card, borderRadius: 14, borderWidth: 1, borderColor: Colors.cardBorder, padding: 14, marginBottom: 12, marginTop: 8 },
  summItem: { flex: 1, alignItems: 'center' },
  summLbl: { fontFamily: 'Inter_400Regular', fontSize: 11, color: Colors.textMuted },
  summAmt: { fontFamily: 'Inter_700Bold', fontSize: 15 },
  summDiv: { width: 1, backgroundColor: Colors.cardBorder, marginHorizontal: 10 },
  empty: { alignItems: 'center', paddingTop: 60, gap: 10 },
  emptyTxt: { fontFamily: 'Inter_400Regular', fontSize: 13, color: Colors.textMuted, textAlign: 'center' },
  grp: { backgroundColor: Colors.card, borderRadius: 14, borderWidth: 1, borderColor: Colors.cardBorder, marginBottom: 8, overflow: 'hidden' },
  grpHd: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 8 },
  grpIco: { width: 34, height: 34, borderRadius: 9, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  grpName: { flex: 1, fontFamily: 'Inter_500Medium', fontSize: 13, color: Colors.text },
  grpBadge: { backgroundColor: Colors.highlight, borderRadius: 10, paddingHorizontal: 6, paddingVertical: 1 },
  grpBadgeTxt: { fontFamily: 'Inter_700Bold', fontSize: 10, color: '#fff' },
  grpAmt: { fontFamily: 'Inter_700Bold', fontSize: 13 },
  txRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 9, borderTopWidth: 1, borderTopColor: Colors.cardBorder, gap: 8 },
  txDesc: { fontFamily: 'Inter_400Regular', fontSize: 12, color: Colors.text },
  txDate: { fontFamily: 'Inter_400Regular', fontSize: 10, color: Colors.textMuted },
  txAmt: { fontFamily: 'Inter_600SemiBold', fontSize: 12 },
  bottom: { paddingHorizontal: 20, paddingTop: 10, borderTopWidth: 1, borderTopColor: Colors.cardBorder, backgroundColor: Colors.background, gap: 10 },
  balBar: { borderRadius: 12, borderWidth: 1.5, paddingVertical: 11, alignItems: 'center' },
  balTxt: { fontFamily: 'Inter_700Bold', fontSize: 15, letterSpacing: 0.2 },
  btnRow: { flexDirection: 'row', justifyContent: 'space-around' },
  minusBtn: { width: 64, height: 64, borderRadius: 32, borderWidth: 2.5, borderColor: Colors.error, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.error + '10' },
  plusBtn: { width: 64, height: 64, borderRadius: 32, borderWidth: 2.5, borderColor: Colors.highlight, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.highlight + '10' },
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  addSheet: { backgroundColor: Colors.backgroundSecondary, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 36, maxHeight: '92%' },
  handle: { width: 40, height: 4, backgroundColor: Colors.cardBorder, borderRadius: 2, alignSelf: 'center', marginVertical: 12 },
  typeRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 20, marginBottom: 12 },
  typeBtn: { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center', backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.cardBorder },
  typeTxt: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: Colors.textMuted },
  amtRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, gap: 4, marginBottom: 14 },
  amtSym: { fontFamily: 'Inter_700Bold', fontSize: 30, color: Colors.text },
  amtInput: { flex: 1, fontFamily: 'Inter_700Bold', fontSize: 38, color: Colors.text, padding: 0 },
  addLbl: { fontFamily: 'Inter_600SemiBold', fontSize: 12, color: Colors.textSecondary, paddingHorizontal: 20, marginBottom: 6 },
  catChip: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.cardBorder, borderRadius: 12, paddingHorizontal: 11, paddingVertical: 6 },
  catChipTxt: { fontFamily: 'Inter_500Medium', fontSize: 11 },
  addFields: { paddingHorizontal: 20, gap: 8, marginBottom: 10 },
  fieldInput: { backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.cardBorder, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, color: Colors.text, fontFamily: 'Inter_400Regular', fontSize: 14 },
  addActions: { flexDirection: 'row', gap: 12, paddingHorizontal: 20 },
  cancelBtn: { flex: 1, height: 46, borderRadius: 13, borderWidth: 1, borderColor: Colors.cardBorder, alignItems: 'center', justifyContent: 'center' },
  cancelTxt: { fontFamily: 'Inter_600SemiBold', fontSize: 14, color: Colors.textSecondary },
  saveBtn: { flex: 2, height: 46, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  saveTxt: { fontFamily: 'Inter_700Bold', fontSize: 15, color: '#fff' },
  sidebar: { width: 180, backgroundColor: Colors.backgroundSecondary, paddingTop: 64, paddingHorizontal: 16, paddingBottom: 40, alignItems: 'center', gap: 0 },
  sidebarTitle: { fontFamily: 'Inter_700Bold', fontSize: 20, color: Colors.accent, marginBottom: 24 },
  sidebarItem: { alignItems: 'center', gap: 8, paddingVertical: 16, width: '100%' },
  sidebarIco: { width: 64, height: 64, borderRadius: 32, borderWidth: 1.5, borderColor: Colors.highlight, alignItems: 'center', justifyContent: 'center' },
  sidebarLbl: { fontFamily: 'Inter_600SemiBold', fontSize: 14, color: Colors.text },
  periodSheet: { backgroundColor: Colors.backgroundSecondary, borderRadius: 20, padding: 20, gap: 10 },
  periodSheetTitle: { fontFamily: 'Inter_700Bold', fontSize: 17, color: Colors.text, marginBottom: 8 },
  periodOpt: { padding: 14, borderRadius: 12, borderWidth: 1, borderColor: Colors.cardBorder, backgroundColor: Colors.card },
  periodOptActive: { borderColor: Colors.accent, backgroundColor: Colors.accent + '18' },
  periodOptTxt: { fontFamily: 'Inter_500Medium', fontSize: 15, color: Colors.text },
  periodOptTxtActive: { color: Colors.accent, fontFamily: 'Inter_700Bold' },
  fullModal: { flex: 1, backgroundColor: Colors.background, marginTop: Platform.OS === 'ios' ? 60 : 30, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  fullModalHd: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: Colors.cardBorder },
  fullModalTitle: { fontFamily: 'Inter_700Bold', fontSize: 20, color: Colors.text },
  secTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: Colors.textSecondary },
  catRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: Colors.card, borderRadius: 12, borderWidth: 1, borderColor: Colors.cardBorder, padding: 12 },
  catRowIco: { width: 34, height: 34, borderRadius: 9, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  catRowName: { flex: 1, fontFamily: 'Inter_500Medium', fontSize: 13, color: Colors.text },
  catRowType: { fontFamily: 'Inter_400Regular', fontSize: 11, color: Colors.textMuted, textTransform: 'capitalize' },
  colorDot: { width: 26, height: 26, borderRadius: 13 },
  colorDotSel: { borderWidth: 3, borderColor: '#fff', transform: [{ scale: 1.25 }] },
  iconDot: { width: 38, height: 38, borderRadius: 10, borderWidth: 1, borderColor: Colors.cardBorder, backgroundColor: Colors.card, alignItems: 'center', justifyContent: 'center' },
  actionBtn: { backgroundColor: Colors.accent, borderRadius: 13, height: 48, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  actionBtnTxt: { fontFamily: 'Inter_700Bold', fontSize: 15, color: Colors.primary },
  mInput: { backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.cardBorder, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, color: Colors.text, fontFamily: 'Inter_400Regular', fontSize: 14 },
  currRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.card, borderRadius: 12, borderWidth: 1, borderColor: Colors.cardBorder, padding: 14, gap: 12 },
  currSym: { fontFamily: 'Inter_700Bold', fontSize: 18, color: Colors.accent, width: 32, textAlign: 'center' },
  currCode: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: Colors.text },
  currName: { fontFamily: 'Inter_400Regular', fontSize: 11, color: Colors.textMuted },
});
