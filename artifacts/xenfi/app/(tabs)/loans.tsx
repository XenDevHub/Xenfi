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

interface Loan {
  id: number;
  name: string;
  type: 'given' | 'received';
  amount: number;
  dueDate: string;
  status: 'pending' | 'paid';
}

export default function LoansScreen() {
  const insets = useSafeAreaInsets();
  const { apiFetch } = useApi();
  const queryClient = useQueryClient();

  const [showModal, setShowModal] = useState(false);
  const [tab, setTab] = useState<'given' | 'received'>('given');
  const [form, setForm] = useState({
    name: '',
    type: 'given' as 'given' | 'received',
    amount: '',
    dueDate: '',
    status: 'pending' as 'pending' | 'paid',
  });

  const { data: loans = [], isLoading } = useQuery<Loan[]>({
    queryKey: ['loans'],
    queryFn: () => apiFetch('/loans'),
  });

  const createMutation = useMutation({
    mutationFn: (body: object) =>
      apiFetch('/loans', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loans'] });
      setShowModal(false);
      setForm({ name: '', type: 'given', amount: '', dueDate: '', status: 'pending' });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    onError: (e: any) => Alert.alert('Error', e.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: number; body: object }) =>
      apiFetch(`/loans/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loans'] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiFetch(`/loans/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loans'] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
  });

  function handleSubmit() {
    const amt = parseFloat(form.amount);
    if (!form.name || isNaN(amt) || !form.dueDate) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    createMutation.mutate({
      name: form.name,
      type: form.type,
      amount: amt,
      dueDate: new Date(form.dueDate).toISOString(),
      status: form.status,
    });
  }

  function toggleStatus(loan: Loan) {
    const newStatus = loan.status === 'pending' ? 'paid' : 'pending';
    updateMutation.mutate({ id: loan.id, body: { status: newStatus } });
  }

  const given = useMemo(() => loans.filter((l) => l.type === 'given'), [loans]);
  const received = useMemo(() => loans.filter((l) => l.type === 'received'), [loans]);
  const displayed = tab === 'given' ? given : received;

  const totalGiven = useMemo(() => given.filter((l) => l.status === 'pending').reduce((s, l) => s + l.amount, 0), [given]);
  const totalReceived = useMemo(() => received.filter((l) => l.status === 'pending').reduce((s, l) => s + l.amount, 0), [received]);

  const webTopPad = Platform.OS === 'web' ? 67 : insets.top;
  const webBottomPad = Platform.OS === 'web' ? 34 : 0;

  const isOverdue = (loan: Loan) => loan.status === 'pending' && new Date(loan.dueDate) < new Date();

  return (
    <LinearGradient colors={[Colors.background, Colors.primary + '22', Colors.background]} style={styles.gradient}>
      <ScrollView
        contentContainerStyle={[styles.container, { paddingTop: webTopPad + 16, paddingBottom: webBottomPad + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Loans</Text>
          <Pressable style={styles.addBtn} onPress={() => setShowModal(true)}>
            <Feather name="plus" size={20} color={Colors.primary} />
          </Pressable>
        </View>

        {/* Summary */}
        <View style={styles.summaryRow}>
          <View style={[styles.summaryCard, { borderColor: Colors.highlight + '44' }]}>
            <Feather name="arrow-up-right" size={16} color={Colors.highlight} />
            <Text style={styles.summaryLabel}>You're owed</Text>
            <Text style={[styles.summaryAmount, { color: Colors.highlight }]}>
              ${totalGiven.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </Text>
          </View>
          <View style={[styles.summaryCard, { borderColor: Colors.error + '44' }]}>
            <Feather name="arrow-down-left" size={16} color={Colors.error} />
            <Text style={styles.summaryLabel}>You owe</Text>
            <Text style={[styles.summaryAmount, { color: Colors.error }]}>
              ${totalReceived.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </Text>
          </View>
        </View>

        {/* Tab toggle */}
        <View style={styles.toggle}>
          <Pressable
            style={[styles.toggleBtn, tab === 'given' && styles.toggleActive]}
            onPress={() => setTab('given')}
          >
            <Text style={[styles.toggleText, tab === 'given' && styles.toggleTextActive]}>
              Given ({given.length})
            </Text>
          </Pressable>
          <Pressable
            style={[styles.toggleBtn, tab === 'received' && styles.toggleActive]}
            onPress={() => setTab('received')}
          >
            <Text style={[styles.toggleText, tab === 'received' && styles.toggleTextActive]}>
              Received ({received.length})
            </Text>
          </Pressable>
        </View>

        {isLoading ? (
          <ActivityIndicator color={Colors.accent} style={{ marginTop: 40 }} />
        ) : displayed.length === 0 ? (
          <View style={styles.emptyCard}>
            <Feather name="repeat" size={40} color={Colors.textMuted} />
            <Text style={styles.emptyText}>No {tab} loans</Text>
            <Text style={styles.emptySubtext}>
              {tab === 'given' ? 'Track money you lend to others' : 'Track money you borrow from others'}
            </Text>
          </View>
        ) : (
          displayed.map((l) => (
            <View key={l.id} style={[styles.loanCard, isOverdue(l) && styles.loanCardOverdue]}>
              <View style={styles.loanLeft}>
                <View style={styles.loanNameRow}>
                  <Text style={styles.loanName}>{l.name}</Text>
                  {isOverdue(l) && (
                    <View style={styles.overdueTag}>
                      <Text style={styles.overdueText}>Overdue</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.loanDue}>
                  Due {new Date(l.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </Text>
              </View>
              <View style={styles.loanRight}>
                <Text style={[styles.loanAmount, { color: l.type === 'given' ? Colors.highlight : Colors.error }]}>
                  {l.type === 'given' ? '+' : '-'}${l.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </Text>
                <Pressable
                  style={[styles.statusBtn, l.status === 'paid' && styles.statusPaid]}
                  onPress={() => toggleStatus(l)}
                >
                  <Feather name={l.status === 'paid' ? 'check-circle' : 'clock'} size={12} color={l.status === 'paid' ? Colors.primary : Colors.accent} />
                  <Text style={[styles.statusText, l.status === 'paid' && styles.statusTextPaid]}>
                    {l.status}
                  </Text>
                </Pressable>
              </View>
              <Pressable onPress={() => {
                Alert.alert('Delete Loan', 'Remove this loan?', [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Delete', style: 'destructive', onPress: () => deleteMutation.mutate(l.id) },
                ]);
              }}>
                <Feather name="trash-2" size={15} color={Colors.textMuted} />
              </Pressable>
            </View>
          ))
        )}
      </ScrollView>

      <Modal visible={showModal} animationType="slide" transparent>
        <Pressable style={styles.overlay} onPress={() => setShowModal(false)} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.sheetTitle}>Add Loan</Text>

          <View style={styles.typeToggle}>
            <Pressable
              style={[styles.typeBtn, form.type === 'given' && styles.typeBtnActive]}
              onPress={() => setForm(f => ({ ...f, type: 'given' }))}
            >
              <Feather name="arrow-up-right" size={14} color={form.type === 'given' ? Colors.primary : Colors.textSecondary} />
              <Text style={[styles.typeBtnText, form.type === 'given' && styles.typeBtnTextActive]}>Given</Text>
            </Pressable>
            <Pressable
              style={[styles.typeBtn, form.type === 'received' && styles.typeBtnActive]}
              onPress={() => setForm(f => ({ ...f, type: 'received' }))}
            >
              <Feather name="arrow-down-left" size={14} color={form.type === 'received' ? Colors.primary : Colors.textSecondary} />
              <Text style={[styles.typeBtnText, form.type === 'received' && styles.typeBtnTextActive]}>Received</Text>
            </Pressable>
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Person / Entity</Text>
            <TextInput
              style={styles.input}
              value={form.name}
              onChangeText={v => setForm(f => ({ ...f, name: v }))}
              placeholder="e.g. John Smith"
              placeholderTextColor={Colors.textMuted}
            />
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
            <Text style={styles.fieldLabel}>Due Date (YYYY-MM-DD)</Text>
            <TextInput
              style={styles.input}
              value={form.dueDate}
              onChangeText={v => setForm(f => ({ ...f, dueDate: v }))}
              placeholder="2024-12-31"
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
              <Text style={styles.submitText}>Add Loan</Text>
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
  summaryRow: { flexDirection: 'row', gap: 12 },
  summaryCard: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 6,
  },
  summaryLabel: { fontFamily: 'Inter_400Regular', fontSize: 12, color: Colors.textMuted },
  summaryAmount: { fontFamily: 'Inter_700Bold', fontSize: 18 },
  toggle: {
    flexDirection: 'row',
    backgroundColor: Colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    padding: 4,
  },
  toggleBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  toggleActive: { backgroundColor: Colors.accent },
  toggleText: { fontFamily: 'Inter_500Medium', fontSize: 13, color: Colors.textSecondary },
  toggleTextActive: { color: Colors.primary },
  emptyCard: {
    backgroundColor: Colors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    padding: 40,
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
  },
  emptyText: { fontFamily: 'Inter_600SemiBold', fontSize: 17, color: Colors.text, marginTop: 8 },
  emptySubtext: { fontFamily: 'Inter_400Regular', fontSize: 13, color: Colors.textMuted, textAlign: 'center' },
  loanCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    padding: 16,
  },
  loanCardOverdue: { borderColor: Colors.error + '55', backgroundColor: Colors.error + '08' },
  loanLeft: { flex: 1, gap: 4 },
  loanNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  loanName: { fontFamily: 'Inter_600SemiBold', fontSize: 15, color: Colors.text },
  overdueTag: {
    backgroundColor: Colors.error + '22',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  overdueText: { fontFamily: 'Inter_500Medium', fontSize: 10, color: Colors.error },
  loanDue: { fontFamily: 'Inter_400Regular', fontSize: 12, color: Colors.textMuted },
  loanRight: { alignItems: 'flex-end', gap: 6 },
  loanAmount: { fontFamily: 'Inter_700Bold', fontSize: 16 },
  statusBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.accent + '22',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusPaid: { backgroundColor: Colors.highlight + '22' },
  statusText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    color: Colors.accent,
    textTransform: 'capitalize',
  },
  statusTextPaid: { color: Colors.primary, backgroundColor: undefined },
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
  typeToggle: { flexDirection: 'row', gap: 8 },
  typeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    backgroundColor: Colors.card,
  },
  typeBtnActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  typeBtnText: { fontFamily: 'Inter_500Medium', fontSize: 13, color: Colors.textSecondary },
  typeBtnTextActive: { color: Colors.primary },
  field: { gap: 6 },
  fieldLabel: { fontFamily: 'Inter_500Medium', fontSize: 12, color: Colors.textSecondary },
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
