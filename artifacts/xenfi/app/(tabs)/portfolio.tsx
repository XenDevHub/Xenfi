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
import { CATEGORY_COLORS, CATEGORY_LABELS } from '@/components/AssetAllocationChart';

interface Asset {
  id: number;
  type: string;
  name: string;
  value: number;
  purchaseValue: number;
}

const ASSET_TYPES = ['stocks', 'crypto', 'real_estate', 'cash'] as const;
type AssetType = typeof ASSET_TYPES[number];

const TYPE_ICONS: Record<string, string> = {
  stocks: 'trending-up',
  crypto: 'zap',
  real_estate: 'home',
  cash: 'dollar-sign',
};

export default function PortfolioScreen() {
  const insets = useSafeAreaInsets();
  const { apiFetch } = useApi();
  const queryClient = useQueryClient();

  const [showModal, setShowModal] = useState(false);
  const [editAsset, setEditAsset] = useState<Asset | null>(null);
  const [form, setForm] = useState({ type: 'stocks' as AssetType, name: '', value: '', purchaseValue: '' });

  const { data: assets = [], isLoading } = useQuery<Asset[]>({
    queryKey: ['assets'],
    queryFn: () => apiFetch('/assets'),
  });

  const createMutation = useMutation({
    mutationFn: (body: object) => apiFetch('/assets', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['assets'] }); closeModal(); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); },
    onError: (e: any) => { Alert.alert('Error', e.message); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: number; body: object }) =>
      apiFetch(`/assets/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['assets'] }); closeModal(); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); },
    onError: (e: any) => { Alert.alert('Error', e.message); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiFetch(`/assets/${id}`, { method: 'DELETE' }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['assets'] }); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); },
  });

  function openCreate() {
    setEditAsset(null);
    setForm({ type: 'stocks', name: '', value: '', purchaseValue: '' });
    setShowModal(true);
  }

  function openEdit(a: Asset) {
    setEditAsset(a);
    setForm({ type: a.type as AssetType, name: a.name, value: String(a.value), purchaseValue: String(a.purchaseValue) });
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditAsset(null);
  }

  function handleSubmit() {
    const val = parseFloat(form.value);
    const pval = parseFloat(form.purchaseValue);
    if (!form.name || isNaN(val) || isNaN(pval)) {
      Alert.alert('Error', 'Please fill in all fields with valid numbers');
      return;
    }
    if (editAsset) {
      updateMutation.mutate({ id: editAsset.id, body: { name: form.name, value: val, purchaseValue: pval } });
    } else {
      createMutation.mutate({ type: form.type, name: form.name, value: val, purchaseValue: pval });
    }
  }

  function confirmDelete(id: number) {
    Alert.alert('Delete Asset', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteMutation.mutate(id) },
    ]);
  }

  const totalValue = useMemo(() => assets.reduce((s, a) => s + a.value, 0), [assets]);
  const totalCost = useMemo(() => assets.reduce((s, a) => s + a.purchaseValue, 0), [assets]);
  const totalGainLoss = totalValue - totalCost;
  const gainPercent = totalCost > 0 ? ((totalGainLoss / totalCost) * 100) : 0;

  const webTopPad = Platform.OS === 'web' ? 67 : insets.top;
  const webBottomPad = Platform.OS === 'web' ? 34 : 0;

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <LinearGradient colors={[Colors.background, Colors.primary + '22', Colors.background]} style={styles.gradient}>
      <ScrollView
        contentContainerStyle={[styles.container, { paddingTop: webTopPad + 16, paddingBottom: webBottomPad + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Portfolio</Text>
          <Pressable style={styles.addBtn} onPress={openCreate}>
            <Feather name="plus" size={20} color={Colors.primary} />
          </Pressable>
        </View>

        {/* Summary card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Total Value</Text>
              <Text style={styles.summaryValue}>
                ${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Gain / Loss</Text>
              <Text style={[styles.summaryValue, { color: totalGainLoss >= 0 ? Colors.highlight : Colors.error }]}>
                {totalGainLoss >= 0 ? '+' : ''}${totalGainLoss.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </Text>
              <Text style={[styles.summaryPercent, { color: gainPercent >= 0 ? Colors.highlight : Colors.error }]}>
                {gainPercent >= 0 ? '+' : ''}{gainPercent.toFixed(2)}%
              </Text>
            </View>
          </View>
        </View>

        {/* Assets list */}
        {isLoading ? (
          <ActivityIndicator color={Colors.accent} style={{ marginTop: 40 }} />
        ) : assets.length === 0 ? (
          <View style={styles.emptyCard}>
            <Feather name="briefcase" size={40} color={Colors.textMuted} />
            <Text style={styles.emptyText}>No assets yet</Text>
            <Text style={styles.emptySubtext}>Add your first asset to track your portfolio</Text>
            <Pressable style={styles.emptyBtn} onPress={openCreate}>
              <Text style={styles.emptyBtnText}>Add Asset</Text>
            </Pressable>
          </View>
        ) : (
          assets.map((a) => {
            const gainLoss = a.value - a.purchaseValue;
            const pct = a.purchaseValue > 0 ? ((gainLoss / a.purchaseValue) * 100) : 0;
            const color = CATEGORY_COLORS[a.type] || Colors.accent;
            return (
              <Pressable key={a.id} style={styles.assetCard} onPress={() => openEdit(a)}>
                <View style={[styles.assetIcon, { backgroundColor: color + '22' }]}>
                  <Feather name={(TYPE_ICONS[a.type] || 'circle') as any} size={20} color={color} />
                </View>
                <View style={styles.assetMeta}>
                  <Text style={styles.assetName}>{a.name}</Text>
                  <Text style={styles.assetType}>{CATEGORY_LABELS[a.type] || a.type}</Text>
                </View>
                <View style={styles.assetRight}>
                  <Text style={styles.assetValue}>${a.value.toLocaleString('en-US', { minimumFractionDigits: 2 })}</Text>
                  <Text style={[styles.assetGain, { color: gainLoss >= 0 ? Colors.highlight : Colors.error }]}>
                    {gainLoss >= 0 ? '+' : ''}{pct.toFixed(1)}%
                  </Text>
                </View>
                <Pressable style={styles.deleteBtn} onPress={() => confirmDelete(a.id)}>
                  <Feather name="trash-2" size={16} color={Colors.error} />
                </Pressable>
              </Pressable>
            );
          })
        )}
      </ScrollView>

      {/* Modal */}
      <Modal visible={showModal} animationType="slide" transparent>
        <Pressable style={styles.modalOverlay} onPress={closeModal} />
        <View style={styles.modalSheet}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>{editAsset ? 'Edit Asset' : 'Add Asset'}</Text>

          {!editAsset && (
            <View style={styles.typeRow}>
              {ASSET_TYPES.map((t) => (
                <Pressable
                  key={t}
                  style={[styles.typeBtn, form.type === t && styles.typeBtnActive]}
                  onPress={() => setForm(f => ({ ...f, type: t }))}
                >
                  <Feather name={(TYPE_ICONS[t] || 'circle') as any} size={16} color={form.type === t ? Colors.primary : Colors.textSecondary} />
                  <Text style={[styles.typeText, form.type === t && styles.typeTextActive]}>
                    {CATEGORY_LABELS[t]}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}

          <View style={styles.modalField}>
            <Text style={styles.modalLabel}>Asset Name</Text>
            <TextInput
              style={styles.modalInput}
              value={form.name}
              onChangeText={v => setForm(f => ({ ...f, name: v }))}
              placeholder="e.g. Apple Inc, Bitcoin"
              placeholderTextColor={Colors.textMuted}
            />
          </View>

          <View style={styles.modalRow}>
            <View style={[styles.modalField, { flex: 1 }]}>
              <Text style={styles.modalLabel}>Current Value ($)</Text>
              <TextInput
                style={styles.modalInput}
                value={form.value}
                onChangeText={v => setForm(f => ({ ...f, value: v }))}
                placeholder="0.00"
                placeholderTextColor={Colors.textMuted}
                keyboardType="decimal-pad"
              />
            </View>
            <View style={[styles.modalField, { flex: 1 }]}>
              <Text style={styles.modalLabel}>Purchase Price ($)</Text>
              <TextInput
                style={styles.modalInput}
                value={form.purchaseValue}
                onChangeText={v => setForm(f => ({ ...f, purchaseValue: v }))}
                placeholder="0.00"
                placeholderTextColor={Colors.textMuted}
                keyboardType="decimal-pad"
              />
            </View>
          </View>

          <Pressable
            style={[styles.modalSubmit, isSubmitting && { opacity: 0.7 }]}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color={Colors.primary} />
            ) : (
              <Text style={styles.modalSubmitText}>{editAsset ? 'Save Changes' : 'Add Asset'}</Text>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontFamily: 'Inter_700Bold',
    fontSize: 26,
    color: Colors.text,
  },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryCard: {
    backgroundColor: Colors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    padding: 20,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryItem: { flex: 1, gap: 4 },
  summaryDivider: {
    width: 1,
    height: 50,
    backgroundColor: Colors.cardBorder,
    marginHorizontal: 20,
  },
  summaryLabel: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: Colors.textMuted,
  },
  summaryValue: {
    fontFamily: 'Inter_700Bold',
    fontSize: 20,
    color: Colors.text,
  },
  summaryPercent: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
  },
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
  emptyBtn: {
    backgroundColor: Colors.accent,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 8,
  },
  emptyBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: Colors.primary,
  },
  assetCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    padding: 16,
  },
  assetIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  assetMeta: { flex: 1 },
  assetName: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
    color: Colors.text,
  },
  assetType: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: Colors.textMuted,
  },
  assetRight: { alignItems: 'flex-end' },
  assetValue: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
    color: Colors.text,
  },
  assetGain: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
  },
  deleteBtn: { padding: 8 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  modalSheet: {
    backgroundColor: Colors.backgroundSecondary,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 48,
    gap: 16,
  },
  modalHandle: {
    width: 36,
    height: 4,
    backgroundColor: Colors.cardBorder,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 4,
  },
  modalTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 20,
    color: Colors.text,
  },
  typeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeBtn: {
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
  typeBtnActive: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  typeText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: Colors.textSecondary,
  },
  typeTextActive: {
    color: Colors.primary,
  },
  modalField: { gap: 6 },
  modalRow: { flexDirection: 'row', gap: 12 },
  modalLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: Colors.textSecondary,
  },
  modalInput: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderRadius: 12,
    padding: 14,
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    color: Colors.text,
  },
  modalSubmit: {
    backgroundColor: Colors.accent,
    borderRadius: 14,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  modalSubmitText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 16,
    color: Colors.primary,
  },
});
