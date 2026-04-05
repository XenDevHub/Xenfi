import React, { useState, useMemo, useCallback } from 'react';
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
  KeyboardAvoidingView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useApi } from '@/hooks/useApi';

/** Match ExpensesScreen income / expense greens & reds */
const LOAN_GIVEN = '#50C878';
const LOAN_RECEIVED = '#EB5757';
const SUMMARY_OWE = '#F2994A';

export interface Loan {
  id: number;
  personName: string;
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
    personName: '',
    type: 'given' as 'given' | 'received',
    amount: '',
    dueDate: new Date().toISOString().split('T')[0], // Default to today's date string
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
      queryClient.invalidateQueries({ queryKey: ['insights'] });
      setShowModal(false);
      resetForm();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    onError: (e: Error) => Alert.alert('Error', e.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: number; body: object }) =>
      apiFetch(`/loans/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loans'] });
      queryClient.invalidateQueries({ queryKey: ['insights'] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiFetch(`/loans/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loans'] });
      queryClient.invalidateQueries({ queryKey: ['insights'] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
  });

  const resetForm = useCallback(() => {
    setForm({ 
      personName: '', 
      type: 'given', 
      amount: '', 
      dueDate: new Date().toISOString().split('T')[0], 
      status: 'pending' 
    });
  }, []);

  const handleSubmit = useCallback(() => {
    const amt = parseFloat(form.amount);
    
    // 1. Basic Validation
    if (!form.personName.trim() || Number.isNaN(amt) || !form.dueDate.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    // 2. Safe Date Parsing to prevent "Out of Bounds" crash
    let safeDateString: string;
    try {
      const parsedDate = new Date(form.dueDate);
      if (isNaN(parsedDate.getTime())) {
        throw new Error("Invalid Date");
      }
      safeDateString = parsedDate.toISOString();
    } catch (e) {
      // Fallback to current time if the date string is malformed
      safeDateString = new Date().toISOString();
    }

    // 3. Send payload with keys matching backend
    createMutation.mutate({
      person_name: form.personName.trim(), // Matches DB column person_name
      type: form.type,                     // Matches DB column type
      amount: amt,                         // Matches DB column amount
      due_date: safeDateString,            // Matches DB column due_date
      status: form.status,                 // Matches DB column status
    });
  }, [form, createMutation]);

  const toggleStatus = useCallback(
    (loan: Loan) => {
      const newStatus = loan.status === 'pending' ? 'paid' : 'pending';
      updateMutation.mutate({ id: loan.id, body: { status: newStatus } });
    },
    [updateMutation]
  );

  const given = useMemo(() => loans.filter((l) => l.type === 'given'), [loans]);
  const received = useMemo(() => loans.filter((l) => l.type === 'received'), [loans]);
  const displayed = tab === 'given' ? given : received;

  const totalOwedToYou = useMemo(
    () => given.filter((l) => l.status === 'pending').reduce((s, l) => s + l.amount, 0),
    [given]
  );
  const totalYouOwe = useMemo(
    () => received.filter((l) => l.status === 'pending').reduce((s, l) => s + l.amount, 0),
    [received]
  );

  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPad = Platform.OS === 'web' ? 34 : insets.bottom;

  const isOverdue = useCallback(
    (loan: Loan) => loan.status === 'pending' && new Date(loan.dueDate) < new Date(),
    []
  );

  return (
    <LinearGradient
      colors={[Colors.background, Colors.backgroundTertiary + '55', Colors.background]}
      style={styles.gradient}
    >
      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingTop: topPad + 16, paddingBottom: bottomPad + 100 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.title}>Loans</Text>
          <Pressable
            style={styles.addBtn}
            onPress={() => {
              resetForm();
              setShowModal(true);
            }}
          >
            <Feather name="plus" size={22} color={Colors.primary} />
          </Pressable>
        </View>

        <View style={styles.summaryRow}>
          <View style={[styles.summaryCard, { borderColor: LOAN_GIVEN + '44' }]}>
            <Feather name="trending-up" size={16} color={LOAN_GIVEN} />
            <Text style={[styles.summaryLabel, { color: Colors.textMuted }]}>You're owed</Text>
            <Text style={[styles.summaryAmount, { color: LOAN_GIVEN }]}>
              ${totalOwedToYou.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </Text>
          </View>
          <View style={[styles.summaryCard, { borderColor: SUMMARY_OWE + '44' }]}>
            <Feather name="trending-down" size={16} color={SUMMARY_OWE} />
            <Text style={[styles.summaryLabel, { color: Colors.textMuted }]}>You owe</Text>
            <Text style={[styles.summaryAmount, { color: SUMMARY_OWE }]}>
              ${totalYouOwe.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </Text>
          </View>
        </View>

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
            <Feather name="layers" size={40} color={Colors.textMuted} />
            <Text style={styles.emptyText}>No {tab} loans</Text>
            <Text style={styles.emptySubtext}>
              {tab === 'given'
                ? 'Track money you lend to others'
                : 'Track money you borrow from others'}
            </Text>
          </View>
        ) : (
          displayed.map((l) => (
            <View
              key={l.id}
              style={[styles.loanCard, isOverdue(l) && styles.loanCardOverdue]}
            >
              <View style={styles.loanMain}>
                <View style={styles.loanLeft}>
                  <View style={styles.loanNameRow}>
                    <Text style={styles.loanName}>{l.personName}</Text>
                    {isOverdue(l) && (
                      <View style={styles.overdueTag}>
                        <Text style={styles.overdueText}>Overdue</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.loanDue}>
                    Due{' '}
                    {new Date(l.dueDate).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </Text>
                </View>
                <View style={styles.loanRight}>
                  <Text
                    style={[
                      styles.loanAmount,
                      { color: l.type === 'given' ? LOAN_GIVEN : LOAN_RECEIVED },
                    ]}
                  >
                    {l.type === 'given' ? '+' : '-'}$
                    {l.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </Text>
                  <Pressable
                    style={[
                      styles.statusBadge,
                      l.status === 'paid' ? styles.statusBadgePaid : styles.statusBadgePending,
                    ]}
                    onPress={() => toggleStatus(l)}
                  >
                    <Text
                      style={[
                        styles.statusBadgeText,
                        l.status === 'paid' && styles.statusBadgeTextPaid,
                      ]}
                    >
                      {l.status === 'pending' ? 'Pending' : 'Paid'}
                    </Text>
                  </Pressable>
                </View>
              </View>
              <Pressable
                hitSlop={8}
                onPress={() => {
                  Alert.alert('Delete loan', 'Remove this loan?', [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Delete',
                      style: 'destructive',
                      onPress: () => deleteMutation.mutate(l.id),
                    },
                  ]);
                }}
                style={styles.trashBtn}
              >
                <Feather name="trash-2" size={16} color={Colors.textMuted} />
              </Pressable>
            </View>
          ))
        )}
      </ScrollView>

      <Modal
        visible={showModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalRoot}>
          <Pressable
            style={styles.overlayFill}
            onPress={() => setShowModal(false)}
            accessibilityRole="button"
          />
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.sheetWrap}
          >
            <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 24) + 16 }]}>
              <View style={styles.handle} />
              <Text style={styles.sheetTitle}>Add Loan</Text>

              <View style={styles.typeToggle}>
                <Pressable
                  style={[
                    styles.typeBtn,
                    form.type === 'given' ? styles.typeBtnActive : styles.typeBtnIdle,
                  ]}
                  onPress={() => setForm((f) => ({ ...f, type: 'given' }))}
                >
                  <Feather
                    name="arrow-up-right"
                    size={14}
                    color={form.type === 'given' ? Colors.primary : LOAN_GIVEN}
                  />
                  <Text
                    style={[
                      styles.typeBtnText,
                      form.type === 'given' && styles.typeBtnTextOnAccent,
                    ]}
                  >
                    Given
                  </Text>
                </Pressable>
                <Pressable
                  style={[
                    styles.typeBtn,
                    form.type === 'received' ? styles.typeBtnActive : styles.typeBtnIdle,
                  ]}
                  onPress={() => setForm((f) => ({ ...f, type: 'received' }))}
                >
                  <Feather
                    name="arrow-down-left"
                    size={14}
                    color={form.type === 'received' ? Colors.primary : SUMMARY_OWE}
                  />
                  <Text
                    style={[
                      styles.typeBtnText,
                      form.type === 'received' && styles.typeBtnTextOnAccent,
                    ]}
                  >
                    Received
                  </Text>
                </Pressable>
              </View>

              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Person / Entity</Text>
                <TextInput
                  style={styles.input}
                  value={form.personName}
                  onChangeText={(v) => setForm((f) => ({ ...f, personName: v }))}
                  placeholder="e.g. John Smith"
                  placeholderTextColor={Colors.textMuted}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Amount ($)</Text>
                <TextInput
                  style={styles.input}
                  value={form.amount}
                  onChangeText={(v) => setForm((f) => ({ ...f, amount: v }))}
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
                  onChangeText={(v) => setForm((f) => ({ ...f, dueDate: v }))}
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
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  container: { paddingHorizontal: 20, gap: 16 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: { fontFamily: 'Inter_700Bold', fontSize: 26, color: Colors.text },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryRow: { flexDirection: 'row', gap: 12 },
  summaryCard: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 8,
  },
  summaryLabel: { fontFamily: 'Inter_400Regular', fontSize: 12 },
  summaryAmount: { fontFamily: 'Inter_700Bold', fontSize: 18 },
  toggle: {
    flexDirection: 'row',
    backgroundColor: Colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    padding: 4,
  },
  toggleBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
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
  emptyText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 17,
    color: Colors.text,
    marginTop: 8,
  },
  emptySubtext: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  loanCard: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 8,
    backgroundColor: Colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  loanCardOverdue: {
    borderColor: SUMMARY_OWE + '99',
    backgroundColor: Colors.backgroundSecondary + 'CC',
  },
  loanMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  loanLeft: { flex: 1, gap: 4 },
  loanNameRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  loanName: { fontFamily: 'Inter_600SemiBold', fontSize: 15, color: Colors.text },
  overdueTag: {
    backgroundColor: LOAN_RECEIVED + '28',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  overdueText: { fontFamily: 'Inter_600SemiBold', fontSize: 10, color: LOAN_RECEIVED },
  loanDue: { fontFamily: 'Inter_400Regular', fontSize: 12, color: Colors.textMuted },
  loanRight: { alignItems: 'flex-end', gap: 8 },
  loanAmount: { fontFamily: 'Inter_700Bold', fontSize: 16 },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  statusBadgePending: {
    backgroundColor: Colors.accent,
  },
  statusBadgePaid: {
    backgroundColor: LOAN_GIVEN + '33',
    borderWidth: 1,
    borderColor: LOAN_GIVEN + '55',
  },
  statusBadgeText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: Colors.primary,
    textTransform: 'capitalize',
  },
  statusBadgeTextPaid: { color: LOAN_GIVEN },
  trashBtn: { justifyContent: 'center', paddingLeft: 4 },
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  overlayFill: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.65)',
  },
  sheetWrap: { width: '100%' },
  sheet: {
    backgroundColor: Colors.backgroundSecondary,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 12,
    gap: 14,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: Colors.cardBorder,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 4,
  },
  sheetTitle: { fontFamily: 'Inter_700Bold', fontSize: 20, color: Colors.text },
  typeToggle: { flexDirection: 'row', gap: 10 },
  typeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  typeBtnIdle: {
    borderColor: Colors.blue + '66',
    backgroundColor: Colors.card,
  },
  typeBtnActive: {
    borderColor: Colors.accent,
    backgroundColor: Colors.accent,
  },
  typeBtnText: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: Colors.text },
  typeBtnTextOnAccent: { color: Colors.primary },
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
    marginTop: 6,
  },
  submitText: { fontFamily: 'Inter_700Bold', fontSize: 16, color: Colors.primary },
});