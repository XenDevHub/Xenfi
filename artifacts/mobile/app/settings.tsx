import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Pressable, Platform, Alert, Switch,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useAuth } from '@/context/AuthContext';
import { useApi } from '@/hooks/useApi';

const PLANS = [
  {
    name: 'Pro Monthly',
    price: '$19',
    period: '/month',
    features: ['Unlimited assets', 'Xeni AI advisor', 'Tax module', 'Priority support'],
    highlighted: false,
  },
  {
    name: 'Pro Annual',
    price: '$99',
    period: '/year',
    features: ['Unlimited assets', 'Xeni AI advisor', 'Tax module', 'Save 57%', 'Priority support'],
    highlighted: true,
    badge: 'BEST VALUE',
  },
  {
    name: 'Lifetime',
    price: '$249',
    period: 'one-time',
    features: ['Everything in Pro', 'Business mode', 'All future features', 'Forever access'],
    highlighted: false,
  },
];

interface RowProps {
  icon: string;
  label: string;
  value?: string;
  onPress?: () => void;
  danger?: boolean;
  rightNode?: React.ReactNode;
  iconColor?: string;
}

function SettingRow({ icon, label, value, onPress, danger, rightNode, iconColor }: RowProps) {
  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && onPress && styles.rowPressed]}
      onPress={onPress}
      disabled={!onPress && !rightNode}
    >
      <View style={[styles.rowIcon, danger && styles.rowIconDanger, iconColor ? { backgroundColor: iconColor + '22' } : undefined]}>
        <Feather name={icon as any} size={16} color={danger ? Colors.error : (iconColor || Colors.accent)} />
      </View>
      <Text style={[styles.rowLabel, danger && { color: Colors.error }]}>{label}</Text>
      <View style={styles.rowRight}>
        {value && <Text style={styles.rowValue}>{value}</Text>}
        {rightNode}
        {onPress && !rightNode && <Feather name="chevron-right" size={16} color={Colors.textMuted} />}
      </View>
    </Pressable>
  );
}

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { user, logout, updateUser } = useAuth();
  const { apiFetch } = useApi();
  const [businessModeLoading, setBusinessModeLoading] = useState(false);

  const webTopPad = Platform.OS === 'web' ? 67 : insets.top;
  const webBottomPad = Platform.OS === 'web' ? 34 : 0;

  const isAdmin = user?.role === 'admin';
  const isPremium = user?.isPremium || user?.role === 'premium_user' || isAdmin;

  async function handleLogout() {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await logout();
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          router.replace('/auth');
        },
      },
    ]);
  }

  function handleUpgrade(plan: string) {
    Alert.alert(`Upgrade to ${plan}`, 'In-app purchases are coming soon. Thank you for your interest!', [{ text: 'OK' }]);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }

  async function toggleBusinessMode(value: boolean) {
    setBusinessModeLoading(true);
    try {
      await apiFetch('/business/mode', { method: 'PATCH', body: JSON.stringify({ businessMode: value }) });
      updateUser({ businessMode: value });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      Alert.alert('Error', 'Could not update business mode');
    } finally {
      setBusinessModeLoading(false);
    }
  }

  return (
    <LinearGradient colors={[Colors.background, Colors.primary + '22', Colors.background]} style={styles.gradient}>
      <ScrollView
        contentContainerStyle={[styles.container, { paddingTop: webTopPad + 16, paddingBottom: webBottomPad + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.settingsHeader}>
          <Pressable
            onPress={() => {
              if (router.canGoBack()) router.back();
              else router.replace('/(tabs)');
            }}
            style={({ pressed }) => [styles.settingsBackBtn, pressed && { opacity: 0.7 }]}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Back"
          >
            <Feather name="chevron-left" size={26} color={Colors.text} />
          </Pressable>
          <Text style={styles.title}>Settings</Text>
        </View>

        {/* Profile card */}
        <View style={styles.profileCard}>
          <View style={[styles.avatar, isAdmin && { backgroundColor: Colors.purple }]}>
            <Text style={styles.avatarText}>{user?.name?.charAt(0)?.toUpperCase() ?? 'U'}</Text>
          </View>
          <View style={styles.profileMeta}>
            <Text style={styles.profileName}>{user?.name}</Text>
            <Text style={styles.profileEmail}>{user?.email}</Text>
          </View>
          {isAdmin ? (
            <View style={[styles.roleBadge, { backgroundColor: Colors.purple + '33', borderColor: Colors.purple }]}>
              <Text style={[styles.roleBadgeText, { color: Colors.purple }]}>ADMIN</Text>
            </View>
          ) : isPremium ? (
            <View style={styles.proBadge}>
              <Text style={styles.proText}>PRO</Text>
            </View>
          ) : (
            <View style={styles.freeBadge}>
              <Text style={styles.freeText}>FREE</Text>
            </View>
          )}
        </View>

        {/* Admin panel */}
        {isAdmin && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Feather name="shield" size={16} color={Colors.purple} />
              <Text style={[styles.sectionTitle, { color: Colors.purple }]}>Admin Panel</Text>
            </View>
            <View style={[styles.settingsGroup, { borderColor: Colors.purple + '44' }]}>
              <SettingRow icon="users" label="All Features Unlocked" value="Full Access" iconColor={Colors.purple} />
              <View style={styles.separator} />
              <SettingRow icon="database" label="Database Access" value="Enabled" iconColor={Colors.purple} />
              <View style={styles.separator} />
              <SettingRow icon="unlock" label="No Restrictions" value="Admin Override" iconColor={Colors.purple} />
            </View>
          </View>
        )}

        {/* Mode toggle */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Feather name="toggle-left" size={16} color={Colors.accent} />
            <Text style={styles.sectionTitle}>App Mode</Text>
          </View>
          <View style={styles.modeToggleCard}>
            <View style={styles.modeOption}>
              <View style={styles.modeIcon}>
                <Feather name="user" size={20} color={!user?.businessMode ? Colors.accent : Colors.textMuted} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.modeLabel, !user?.businessMode && { color: Colors.accent }]}>Personal Mode</Text>
                <Text style={styles.modeSubtitle}>Manage personal wealth & investments</Text>
              </View>
            </View>
            <Switch
              value={user?.businessMode ?? false}
              onValueChange={toggleBusinessMode}
              disabled={businessModeLoading}
              trackColor={{ false: Colors.cardBorder, true: Colors.highlight + '88' }}
              thumbColor={user?.businessMode ? Colors.highlight : Colors.textMuted}
            />
            <View style={styles.modeOption}>
              <View style={styles.modeIcon}>
                <Feather name="briefcase" size={20} color={user?.businessMode ? Colors.highlight : Colors.textMuted} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.modeLabel, user?.businessMode && { color: Colors.highlight }]}>Business Mode</Text>
                <Text style={styles.modeSubtitle}>Track revenue, expenses & P&L</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Premium plans */}
        {!isPremium && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Feather name="zap" size={16} color={Colors.accent} />
              <Text style={styles.sectionTitle}>Upgrade to Pro</Text>
            </View>
            {PLANS.map((plan) => (
              <Pressable
                key={plan.name}
                style={[styles.planCard, plan.highlighted && styles.planCardHighlighted]}
                onPress={() => handleUpgrade(plan.name)}
              >
                {plan.badge && (
                  <View style={styles.planBadge}>
                    <Text style={styles.planBadgeText}>{plan.badge}</Text>
                  </View>
                )}
                <View style={styles.planTop}>
                  <Text style={[styles.planName, plan.highlighted && { color: Colors.primary }]}>{plan.name}</Text>
                  <View style={styles.planPriceRow}>
                    <Text style={[styles.planPrice, plan.highlighted && { color: Colors.primary }]}>{plan.price}</Text>
                    <Text style={[styles.planPeriod, plan.highlighted && { color: Colors.primary + 'CC' }]}>{plan.period}</Text>
                  </View>
                </View>
                <View style={styles.planFeatures}>
                  {plan.features.map((f) => (
                    <View key={f} style={styles.featureRow}>
                      <Feather name="check" size={12} color={plan.highlighted ? Colors.primary : Colors.accent} />
                      <Text style={[styles.featureText, plan.highlighted && { color: Colors.primary }]}>{f}</Text>
                    </View>
                  ))}
                </View>
              </Pressable>
            ))}
          </View>
        )}

        {/* Tax module */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tax Module</Text>
          <View style={styles.taxLockCard}>
            <View style={styles.taxLockHeader}>
              <Feather name={isPremium ? 'check-circle' : 'lock'} size={20} color={Colors.accent} />
              <Text style={styles.taxLockTitle}>{isPremium ? 'Tax Intelligence' : 'Premium Feature'}</Text>
            </View>
            <Text style={styles.taxLockDesc}>
              Capital gains estimates, tax optimization strategies, and automated tax reports.
            </Text>
            {!isPremium ? (
              <Pressable style={styles.taxUpgradeBtn} onPress={() => handleUpgrade('Pro')}>
                <Text style={styles.taxUpgradeText}>Unlock Tax Module</Text>
              </Pressable>
            ) : (
              <View style={styles.taxFeatures}>
                <View style={styles.taxFeatureRow}>
                  <Feather name="percent" size={14} color={Colors.accent} />
                  <Text style={styles.taxFeatureText}>Estimated Capital Gains: Calculated from holdings</Text>
                </View>
                <View style={styles.taxFeatureRow}>
                  <Feather name="trending-down" size={14} color={Colors.highlight} />
                  <Text style={styles.taxFeatureText}>Strategy: Hold assets &gt;1 year for long-term rate</Text>
                </View>
                <View style={styles.taxFeatureRow}>
                  <Feather name="file-text" size={14} color={Colors.blue} />
                  <Text style={styles.taxFeatureText}>Monthly tax reports auto-generated via Xeni</Text>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Xeni AI */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Xeni AI Advisor</Text>
          <Pressable style={styles.xeniCard} onPress={() => router.push('/(tabs)/xeni')}>
            <View style={styles.xeniCardLeft}>
              <View style={styles.xeniCardAvatar}>
                <Text style={styles.xeniCardAvatarText}>X</Text>
              </View>
              <View>
                <Text style={styles.xeniCardTitle}>Chat with Xeni</Text>
                <Text style={styles.xeniCardSub}>Your AI financial intelligence advisor</Text>
              </View>
            </View>
            <Feather name="arrow-right" size={18} color={Colors.accent} />
          </Pressable>
        </View>

        {/* Account */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <View style={styles.settingsGroup}>
            <SettingRow icon="user" label="Name" value={user?.name} />
            <View style={styles.separator} />
            <SettingRow icon="mail" label="Email" value={user?.email} />
            <View style={styles.separator} />
            <SettingRow icon="award" label="Plan" value={isAdmin ? 'Admin' : isPremium ? 'Pro' : 'Free'} />
            <View style={styles.separator} />
            <SettingRow icon="shield" label="Security" value="Password protected" />
          </View>
        </View>

        {/* About */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <View style={styles.settingsGroup}>
            <SettingRow icon="info" label="Version" value="2.0.0" />
            <View style={styles.separator} />
            <SettingRow icon="lock" label="Privacy Policy" onPress={() => {}} />
          </View>
        </View>

        <Pressable style={styles.logoutBtn} onPress={handleLogout}>
          <Feather name="log-out" size={16} color={Colors.error} />
          <Text style={styles.logoutText}>Sign Out</Text>
        </Pressable>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  container: { paddingHorizontal: 20, gap: 20 },
  settingsHeader: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  settingsBackBtn: { padding: 4, marginLeft: -4 },
  title: { fontFamily: 'Inter_700Bold', fontSize: 26, color: Colors.text, flex: 1 },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: Colors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    padding: 20,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontFamily: 'Inter_700Bold', fontSize: 22, color: Colors.primary },
  profileMeta: { flex: 1 },
  profileName: { fontFamily: 'Inter_600SemiBold', fontSize: 16, color: Colors.text },
  profileEmail: { fontFamily: 'Inter_400Regular', fontSize: 13, color: Colors.textMuted },
  roleBadge: { borderWidth: 1, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  roleBadgeText: { fontFamily: 'Inter_700Bold', fontSize: 11, letterSpacing: 1 },
  proBadge: { backgroundColor: Colors.accent, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  proText: { fontFamily: 'Inter_700Bold', fontSize: 11, color: Colors.primary, letterSpacing: 1 },
  freeBadge: { backgroundColor: Colors.cardBorder, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  freeText: { fontFamily: 'Inter_500Medium', fontSize: 11, color: Colors.textSecondary, letterSpacing: 1 },
  section: { gap: 12 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 15, color: Colors.text },
  modeToggleCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    padding: 16,
    gap: 14,
  },
  modeOption: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  modeIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.backgroundTertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 14, color: Colors.text },
  modeSubtitle: { fontFamily: 'Inter_400Regular', fontSize: 12, color: Colors.textMuted },
  planCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    padding: 18,
    gap: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  planCardHighlighted: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  planBadge: {
    position: 'absolute',
    top: 14,
    right: 14,
    backgroundColor: Colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  planBadgeText: { fontFamily: 'Inter_700Bold', fontSize: 9, color: Colors.accent, letterSpacing: 1 },
  planTop: { gap: 4 },
  planName: { fontFamily: 'Inter_600SemiBold', fontSize: 14, color: Colors.text },
  planPriceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  planPrice: { fontFamily: 'Inter_700Bold', fontSize: 26, color: Colors.text },
  planPeriod: { fontFamily: 'Inter_400Regular', fontSize: 13, color: Colors.textSecondary },
  planFeatures: { gap: 6 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  featureText: { fontFamily: 'Inter_400Regular', fontSize: 13, color: Colors.textSecondary },
  taxLockCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.accent + '44',
    padding: 20,
    gap: 12,
  },
  taxLockHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  taxLockTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 15, color: Colors.accent },
  taxLockDesc: { fontFamily: 'Inter_400Regular', fontSize: 13, color: Colors.textSecondary, lineHeight: 20 },
  taxUpgradeBtn: {
    backgroundColor: Colors.accent,
    borderRadius: 12,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  taxUpgradeText: { fontFamily: 'Inter_600SemiBold', fontSize: 14, color: Colors.primary },
  taxFeatures: { gap: 10 },
  taxFeatureRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  taxFeatureText: { fontFamily: 'Inter_400Regular', fontSize: 13, color: Colors.textSecondary },
  xeniCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.accent + '11',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.accent + '44',
    padding: 16,
  },
  xeniCardLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  xeniCardAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  xeniCardAvatarText: { fontFamily: 'Inter_700Bold', fontSize: 18, color: Colors.primary },
  xeniCardTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 15, color: Colors.text },
  xeniCardSub: { fontFamily: 'Inter_400Regular', fontSize: 12, color: Colors.textMuted },
  settingsGroup: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    overflow: 'hidden',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  rowPressed: { backgroundColor: Colors.backgroundSecondary },
  rowIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: Colors.accent + '18',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowIconDanger: { backgroundColor: Colors.error + '18' },
  rowLabel: { flex: 1, fontFamily: 'Inter_500Medium', fontSize: 14, color: Colors.text },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rowValue: { fontFamily: 'Inter_400Regular', fontSize: 13, color: Colors.textMuted },
  separator: { height: 1, backgroundColor: Colors.cardBorder, marginLeft: 62 },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.error + '15',
    borderRadius: 14,
    height: 52,
    borderWidth: 1,
    borderColor: Colors.error + '33',
  },
  logoutText: { fontFamily: 'Inter_600SemiBold', fontSize: 15, color: Colors.error },
});
