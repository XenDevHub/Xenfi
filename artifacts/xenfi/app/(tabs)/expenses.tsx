import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Modal,
  TextInput,
  ActivityIndicator,
  Platform,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useApi } from '@/hooks/useApi';

interface Expense {
  id: number;
  amount: number;
  category: string;
  description: string;
  date: string;
}

const CATEGORIES = ['travel', 'dining', 'shopping', 'bills', 'investment', 'other'] as const;
type Category = typeof CATEGORIES[number];

const CATEGORY_ICONS: Record<string, string> = {
  travel: 'map-pin',
  dining: 'coffee',
  shopping: 'shopping-bag',
  bills: 'file-text',
  investment: 'trending-up',
  other: 'more-horizontal',
};

const CATEGORY_COLORS: Record<string, string> = {
  travel: Colors.blue,
  dining: Colors.accent,
  shopping: Colors.purple,
  bills: Colors.error,
  investment: Colors.highlight,
  other: Colors.textMuted,
};

export default function ExpensesScreen() {
  const insets = useSafeAreaInsets();
  const { apiFetch } = useApi();
  const queryClient = useQueryClient();

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<{
    category: Category;
    amount: string;
    description: string;
    date: string;
  }>({
    category: 'dining',
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
  });

  const { data: expenses = [], isLoading } = useQuery<Expense[]>({
    queryKey: ['expenses'],
    queryFn: () => apiFetch('/expenses'),
  });

  const createMutation = useMutation({
    mutationFn: (body: object) =>
      apiFetch('/expenses', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      setShowModal(false);
      setForm({ category: 'dining', amount: '', description: '', date: new Date().toISOString().split('T')[0] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    onError: (e: any) => {
      Alert.alert('Error', e.message);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiFetch(`/expenses/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
  });

  function handleSubmit() {
    const amt = parseFloat(form.amount);
    if (!form.description || isNaN(amt) || amt <= 0) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    createMutation.mutate({
      amount: amt,
      category: form.category,
      description: form.description,
      date: new Date(form.date).toISOString(),
    });
  }

  const thisMonth = new Date().getMonth();
  const thisYear = new Date().getFullYear();

  const { thisMonthTotal, byCategory } = useMemo(() => {
    const monthly = expenses.filter((e) => {
      const d = new Date(e.date);
      return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
    });
    const total = monthly.reduce((s, e) => s + e.amount, 0);
    const byCat: Record<string, number> = {};
    monthly.forEach((e) => {
      byCat[e.category] = (byCat[e.category] || 0) + e.amount;
    });
    return { thisMonthTotal: total, byCategory: byCat };
  }, [expenses, thisMonth, thisYear]);

  const sorted = useMemo(() =>
    [...expenses].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [expenses]
  );

  const webTopPad = Platform.OS === 'web' ? 67 : insets.top;
  const webBottomPad = Platform.OS === 'web' ? 34 : 0;

  return (
    <LinearGradient colors={[Colors.background, Colors.primary + '22', Colors.background]} style={styles.gradient}>
      <ScrollView
        contentContainerStyle={[styles.container, { paddingTop: webTopPad + 16, paddingBottom: webBottomPad + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Expenses</Text>
          <Pressable style={styles.addBtn} onPress={() => setShowModal(true)}>
            <Feather name="plus" size={20} color={Colors.primary} />
          </Pressable>
        </View>

        {/* Monthly summary */}
        <View style={styles.monthCard}>
          <Text style={styles.monthLabel}>This Month</Text>
          <Text style={styles.monthAmount}>
            ${thisMonthTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </Text>
          <View style={styles.categoryBreakdown}>
            {Object.entries(byCategory).map(([cat, amt]) => (
              <View key={cat} style={styles.catBadge}>
                <View style={[styles.catDot, { backgroundColor: CATEGORY_COLORS[cat] || Colors.accent }]} />
                <Text style={styles.catBadgeText}>{cat}: ${amt.toFixed(0)}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Expenses list */}
        {isLoading ? (
          <ActivityIndicator color={Colors.accent} style={{ marginTop: 40 }} />
        ) : sorted.length === 0 ? (
          <View style={styles.emptyCard}>
            <Feather name="credit-card" size={40} color={Colors.textMuted} />
            <Text style={styles.emptyText}>No expenses yet</Text>
            <Text style={styles.emptySubtext}>Track your spending to gain insights</Text>
            <Pressable style={styles.emptyBtn} onPress={() => setShowModal(true)}>
              <Text style={styles.emptyBtnText}>Add Expense</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <Text style={styles.sectionTitle}>All Transactions</Text>
            {sorted.map((e) => (
              <View key={e.id} style={styles.expenseRow}>
                <View style={[styles.expIcon, { backgroundColor: (CATEGORY_COLORS[e.category] || Colors.accent) + '22' }]}>
                  <Feather
                    name={(CATEGORY_ICONS[e.category] || 'circle') as any}
                    size={18}
                    color={CATEGORY_COLORS[e.category] || Colors.accent}
                  />
                </View>
                <View style={styles.expMeta}>
                  <Text style={styles.expDesc}>{e.description}</Text>
                  <Text style={styles.expDate}>
                    {new Date(e.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · {e.category}
                  </Text>
                </View>
                <Text style={styles.expAmount}>
                  -${e.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </Text>
                <Pressable onPress={() => {
                  Alert.alert('Delete', 'Remove this expense?', [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Delete', style: 'destructive', onPress: () => deleteMutation.mutate(e.id) },
                  ]);
                }}>
                  <Feather name="x" size={16} color={Colors.textMuted} />
                </Pressable>
              </View>
            ))}
          </>
        )}
      </ScrollView>

      <Modal visible={showModal} animationType="slide" transparent>
        <Pressable style={styles.overlay} onPress={() => setShowModal(false)} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.sheetTitle}>Add Expense</Text>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.catRow}>
                {CATEGORIES.map((c) => (
                  <Pressable
                    key={c}
                    style={[styles.catBtn, form.category === c && styles.catBtnActive]}
                    onPress={() => setForm(f => ({ ...f, category: c }))}
                  >
                    <Feather name={(CATEGORY_ICONS[c] || 'circle') as any} size={14} color={form.category === c ? Colors.primary : Colors.textSecondary} />
                    <Text style={[styles.catBtnText, form.category === c && styles.catBtnTextActive]}>
                      {c.charAt(0).toUpperCase() + c.slice(1)}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Amount ($)</Text>
            <TextInput
              style={styles.input}
              value={form.amount}
              onChangeText={v => setForm(f => ({ ...f, amount: v }))}
              placeholder="0.00"
              placeholderTextColor={Colors.textMuted}
              keyboardType="decimal-pad"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Description</Text>
            <TextInput
              style={styles.input}
              value={form.description}
              onChangeText={v => setForm(f => ({ ...f, description: v }))}
              placeholder="e.g. Dinner at Nobu"
              placeholderTextColor={Colors.textMuted}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Date (YYYY-MM-DD)</Text>
            <TextInput
              style={styles.input}
              value={form.date}
              onChangeText={v => setForm(f => ({ ...f, date: v }))}
              placeholder="2024-01-01"
              placeholderTextColor={Colors.textMuted}
              keyboardType="numbers-and-punctuation"
            />
          </View>

          <Pressable
            style={[styles.submitBtn, createMutation.isPending && { opacity: 0.7 }]}
            onPress={handleSubmit}
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? (
              <ActivityIndicator color={Colors.primary} />
            ) : (
              <Text style={styles.submitText}>Add Expense</Text>
            )}
          </Pressable>
        </View>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  container: { paddingHorizontal: 20, gap: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontFamily: 'Inter_700Bold', fontSize: 26, color: Colors.text },
  addBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: Colors.accent,
    alignItems: 'center', justifyContent: 'center',
  },
  monthCard: {
    backgroundColor: Colors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    padding: 20,
    gap: 8,
  },
  monthLabel: { fontFamily: 'Inter_400Regular', fontSize: 12, color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 1 },
  monthAmount: { fontFamily: 'Inter_700Bold', fontSize: 32, color: Colors.text, letterSpacing: -1 },
  categoryBreakdown: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  catBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.backgroundSecondary, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  catDot: { width: 6, height: 6, borderRadius: 3 },
  catBadgeText: { fontFamily: 'Inter_400Regular', fontSize: 11, color: Colors.textSecondary },
  sectionTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 15, color: Colors.text },
  emptyCard: {
    backgroundColor: Colors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    padding: 40,
    alignItems: 'center',
    gap: 10,
    marginTop: 20,
  },
  emptyText: { fontFamily: 'Inter_600SemiBold', fontSize: 17, color: Colors.text, marginTop: 8 },
  emptySubtext: { fontFamily: 'Inter_400Regular', fontSize: 13, color: Colors.textMuted, textAlign: 'center' },
  emptyBtn: {
    backgroundColor: Colors.accent,
    paddingHorizontal: 24, paddingVertical: 12,
    borderRadius: 12, marginTop: 8,
  },
  emptyBtnText: { fontFamily: 'Inter_600SemiBold', fontSize: 14, color: Colors.primary },
  expenseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    padding: 14,
  },
  expIcon: { width: 42, height: 42, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  expMeta: { flex: 1 },
  expDesc: { fontFamily: 'Inter_500Medium', fontSize: 14, color: Colors.text },
  expDate: { fontFamily: 'Inter_400Regular', fontSize: 12, color: Colors.textMuted, textTransform: 'capitalize' },
  expAmount: { fontFamily: 'Inter_600SemiBold', fontSize: 14, color: Colors.error },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet: {
    backgroundColor: Colors.backgroundSecondary,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 48,
    gap: 16,
  },
  handle: { width: 36, height: 4, backgroundColor: Colors.cardBorder, borderRadius: 2, alignSelf: 'center', marginBottom: 4 },
  sheetTitle: { fontFamily: 'Inter_700Bold', fontSize: 20, color: Colors.text },
  field: { gap: 6 },
  fieldLabel: { fontFamily: 'Inter_500Medium', fontSize: 12, color: Colors.textSecondary },
  catRow: { flexDirection: 'row', gap: 8 },
  catBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    backgroundColor: Colors.card,
  },
  catBtnActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  catBtnText: { fontFamily: 'Inter_500Medium', fontSize: 12, color: Colors.textSecondary },
  catBtnTextActive: { color: Colors.primary },
  input: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderRadius: 12,
    padding: 14,
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    color: Colors.text,
  },
  submitBtn: {
    backgroundColor: Colors.accent,
    borderRadius: 14,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  submitText: { fontFamily: 'Inter_700Bold', fontSize: 16, color: Colors.primary },
});
