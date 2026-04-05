import React, { useMemo, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  Pressable,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import Colors from '@/constants/colors';
import { useAuth } from '@/context/AuthContext';
import { useApi } from '@/hooks/useApi';
import { NetWorthCard } from '@/components/NetWorthCard';
import { AssetAllocationChart, CATEGORY_COLORS } from '@/components/AssetAllocationChart';
import { MarketTicker } from '@/components/MarketTicker';
import { useInsights } from '@/services/insightsService';

interface Asset {
  id: number;
  type: string;
  name: string;
  value: number;
  purchaseValue: number;
}

interface Expense {
  id: number;
  amount: number;
  category: string;
  description: string;
  date: string;
}

const CATEGORY_ICONS: Record<string, string> = {
  travel: 'map',
  dining: 'coffee',
  shopping: 'shopping-bag',
  bills: 'file-text',
  investment: 'trending-up',
  other: 'more-horizontal',
};

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { apiFetch } = useApi();

  const { data: assets = [], refetch: refetchAssets, isLoading: loadingAssets } = useQuery<Asset[]>({
    queryKey: ['assets'],
    queryFn: () => apiFetch('/assets'),
  });

  const { data: expenses = [], refetch: refetchExpenses, isLoading: loadingExpenses } = useQuery<Expense[]>({
    queryKey: ['expenses'],
    queryFn: () => apiFetch('/expenses'),
  });

  const { data: insights } = useInsights();

  const isRefreshing = loadingAssets || loadingExpenses;

  const onRefresh = useCallback(async () => {
    await Promise.all([refetchAssets(), refetchExpenses()]);
  }, [refetchAssets, refetchExpenses]);

  const netWorth = useMemo(() => assets.reduce((s, a) => s + a.value, 0), [assets]);
  const totalCost = useMemo(() => assets.reduce((s, a) => s + a.purchaseValue, 0), [assets]);
  const monthlyChange = netWorth - totalCost;
  const changePercent = totalCost > 0 ? ((netWorth - totalCost) / totalCost) * 100 : 0;

  const allocationData = useMemo(() => {
    const map: Record<string, number> = {};
    assets.forEach((a) => { map[a.type] = (map[a.type] || 0) + a.value; });
    return Object.entries(map).map(([label, value]) => ({
      label,
      value,
      color: CATEGORY_COLORS[label] || Colors.textMuted,
    }));
  }, [assets]);

  const thisMonth = new Date().getMonth();
  const thisYear = new Date().getFullYear();
  const monthlyExpenses = useMemo(() =>
    expenses.filter((e) => {
      const d = new Date(e.date);
      return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
    }).reduce((s, e) => s + e.amount, 0),
    [expenses, thisMonth, thisYear]
  );

  const recentExpenses = useMemo(() =>
    [...expenses].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 4),
    [expenses]
  );

  const webTopPad = Platform.OS === 'web' ? 67 : insets.top;
  const webBottomPad = Platform.OS === 'web' ? 34 : 0;

  const isAdmin = user?.role === 'admin';
  const isPremium = user?.isPremium || user?.role === 'premium_user' || isAdmin;
  const healthScore = insights?.financialScore;

  return (
    <LinearGradient colors={[Colors.background, Colors.primary + '22', Colors.background]} style={styles.gradient}>
      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingTop: webTopPad + 16, paddingBottom: webBottomPad + 100 },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={Colors.accent} />
        }
      >
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.greeting}>
              {isAdmin ? '⚡ Admin Mode •' : user?.businessMode ? '🏢 Business •' : 'Good morning,'}
            </Text>
            <Text style={styles.userName} numberOfLines={1}>
              {user?.name?.split(' ')[0] ?? 'Investor'}
            </Text>
          </View>
          <View style={styles.headerRight}>
            {isAdmin && (
              <View style={[styles.badge, { backgroundColor: Colors.purple + '33', borderColor: Colors.purple }]}>
                <Text style={[styles.badgeText, { color: Colors.purple }]}>ADMIN</Text>
              </View>
            )}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Settings"
              onPress={() => router.push('/settings')}
              style={({ pressed }) => [styles.headerSettingsBtn, pressed && { opacity: 0.75 }]}
              hitSlop={10}
            >
              <Feather name="settings" size={22} color="#FFD700" />
            </Pressable>
            {isPremium && !isAdmin ? (
              <View style={styles.proBadge}>
                <Text style={styles.proText}>PRO</Text>
              </View>
            ) : !isPremium && (
              <Pressable style={styles.upgradeBtn} onPress={() => router.push('/settings')}>
                <Text style={styles.upgradeText}>Upgrade</Text>
              </Pressable>
            )}
          </View>
        </View>

        <NetWorthCard netWorth={netWorth} monthlyChange={monthlyChange} changePercent={changePercent} />

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Feather name="briefcase" size={18} color={Colors.accent} />
            <Text style={styles.statValue}>{assets.length}</Text>
            <Text style={styles.statLabel}>Assets</Text>
          </View>
          <View style={styles.statCard}>
            <Feather name="credit-card" size={18} color={Colors.highlight} />
            <Text style={styles.statValue}>
              ${monthlyExpenses.toLocaleString('en-US', { maximumFractionDigits: 0 })}
            </Text>
            <Text style={styles.statLabel}>This Month</Text>
          </View>
          <View style={styles.statCard}>
            <Feather name="trending-up" size={18} color={Colors.blue} />
            <Text style={[styles.statValue, { color: changePercent >= 0 ? Colors.highlight : Colors.error }]}>
              {changePercent >= 0 ? '+' : ''}{changePercent.toFixed(1)}%
            </Text>
            <Text style={styles.statLabel}>Return</Text>
          </View>
        </View>

        {healthScore && (
          <Pressable style={styles.xeniInsightCard} onPress={() => router.push('/(tabs)/xeni')}>
            <View style={styles.xeniInsightLeft}>
              <View style={styles.xeniSmallAvatar}>
                <Text style={styles.xeniSmallAvatarText}>X</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.xeniInsightLabel}>Xeni AI Insight</Text>
                <Text style={styles.xeniInsightText} numberOfLines={2}>
                  {insights?.expenseInsights?.[0] || insights?.investmentInsights?.[0] || `Your financial health score is ${healthScore.score}/100 (${healthScore.summary}). Tap to explore.`}
                </Text>
              </View>
            </View>
            <Feather name="chevron-right" size={16} color={Colors.accent} />
          </Pressable>
        )}

        <MarketTicker filter="all" />

        {assets.length > 0 && <AssetAllocationChart data={allocationData} />}

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
            <Pressable onPress={() => router.push('/(tabs)/expenses')}>
              <Text style={styles.seeAll}>See all</Text>
            </Pressable>
          </View>

          {recentExpenses.length === 0 ? (
            <View style={styles.emptyCard}>
              <Feather name="activity" size={28} color={Colors.textMuted} />
              <Text style={styles.emptyText}>No recent activity</Text>
              <Text style={styles.emptySubtext}>Add your first expense to track spending</Text>
            </View>
          ) : (
            recentExpenses.map((e) => (
              <View key={e.id} style={styles.activityRow}>
                <View style={[styles.activityIcon, { backgroundColor: Colors.backgroundTertiary }]}>
                  <Feather name={(CATEGORY_ICONS[e.category] || 'circle') as any} size={16} color={Colors.accent} />
                </View>
                <View style={styles.activityMeta}>
                  <Text style={styles.activityDesc}>{e.description}</Text>
                  <Text style={styles.activityCat}>{e.category}</Text>
                </View>
                <Text style={styles.activityAmount}>-${e.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  container: { paddingHorizontal: 20, gap: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  headerLeft: { flex: 1, minWidth: 0, marginRight: 4 },
  greeting: { fontFamily: 'Inter_400Regular', fontSize: 14, color: Colors.textSecondary },
  userName: { fontFamily: 'Inter_700Bold', fontSize: 22, color: Colors.text },
  headerRight: { flexDirection: 'row', gap: 6, alignItems: 'center', flexShrink: 0 },
  headerSettingsBtn: { paddingVertical: 4, paddingHorizontal: 4, borderRadius: 10 },
  badge: { borderWidth: 1, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  badgeText: { fontFamily: 'Inter_700Bold', fontSize: 11, letterSpacing: 1 },
  proBadge: { backgroundColor: Colors.accent, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  proText: { fontFamily: 'Inter_700Bold', fontSize: 11, color: Colors.primary, letterSpacing: 1 },
  upgradeBtn: { borderWidth: 1, borderColor: Colors.accent, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  upgradeText: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: Colors.accent },
  statsRow: { flexDirection: 'row', gap: 12 },
  statCard: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    padding: 14,
    alignItems: 'center',
    gap: 6,
  },
  statValue: { fontFamily: 'Inter_700Bold', fontSize: 16, color: Colors.text },
  statLabel: { fontFamily: 'Inter_400Regular', fontSize: 11, color: Colors.textMuted, textAlign: 'center' },
  xeniInsightCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.accent + '11',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.accent + '44',
    padding: 14,
    gap: 10,
  },
  xeniInsightLeft: { flex: 1, flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  xeniSmallAvatar: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: Colors.accent, alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  xeniSmallAvatarText: { fontFamily: 'Inter_700Bold', fontSize: 14, color: Colors.primary },
  xeniInsightLabel: { fontFamily: 'Inter_700Bold', fontSize: 11, color: Colors.accent, letterSpacing: 0.5, marginBottom: 2 },
  xeniInsightText: { fontFamily: 'Inter_400Regular', fontSize: 13, color: Colors.textSecondary, lineHeight: 18 },
  section: { gap: 12 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 16, color: Colors.text },
  seeAll: { fontFamily: 'Inter_400Regular', fontSize: 13, color: Colors.accent },
  emptyCard: {
    backgroundColor: Colors.card, borderRadius: 16, borderWidth: 1, borderColor: Colors.cardBorder,
    padding: 32, alignItems: 'center', gap: 8,
  },
  emptyText: { fontFamily: 'Inter_600SemiBold', fontSize: 15, color: Colors.text, marginTop: 4 },
  emptySubtext: { fontFamily: 'Inter_400Regular', fontSize: 13, color: Colors.textMuted, textAlign: 'center' },
  activityRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.card, borderRadius: 14, borderWidth: 1, borderColor: Colors.cardBorder, padding: 14,
  },
  activityIcon: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  activityMeta: { flex: 1 },
  activityDesc: { fontFamily: 'Inter_500Medium', fontSize: 14, color: Colors.text },
  activityCat: { fontFamily: 'Inter_400Regular', fontSize: 12, color: Colors.textMuted, textTransform: 'capitalize' },
  activityAmount: { fontFamily: 'Inter_600SemiBold', fontSize: 14, color: Colors.error },
});
