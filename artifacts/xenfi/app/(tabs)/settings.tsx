import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Platform,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useAuth } from '@/context/AuthContext';

const PLANS = [
  {
    name: 'Pro Monthly',
    price: '$19',
    period: '/month',
    features: ['Unlimited assets', 'Tax module', 'Priority support'],
    highlighted: false,
  },
  {
    name: 'Pro Annual',
    price: '$99',
    period: '/year',
    features: ['Unlimited assets', 'Tax module', 'Save 57%', 'Priority support'],
    highlighted: true,
    badge: 'BEST VALUE',
  },
  {
    name: 'Lifetime',
    price: '$249',
    period: 'one-time',
    features: ['Everything in Pro', 'All future features', 'Forever access'],
    highlighted: false,
  },
];

interface RowProps {
  icon: string;
  label: string;
  value?: string;
  onPress?: () => void;
  danger?: boolean;
}

function SettingRow({ icon, label, value, onPress, danger }: RowProps) {
  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={[styles.rowIcon, danger && styles.rowIconDanger]}>
        <Feather name={icon as any} size={16} color={danger ? Colors.error : Colors.accent} />
      </View>
      <Text style={[styles.rowLabel, danger && { color: Colors.error }]}>{label}</Text>
      <View style={styles.rowRight}>
        {value && <Text style={styles.rowValue}>{value}</Text>}
        {onPress && <Feather name="chevron-right" size={16} color={Colors.textMuted} />}
      </View>
    </Pressable>
  );
}

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();

  const webTopPad = Platform.OS === 'web' ? 67 : insets.top;
  const webBottomPad = Platform.OS === 'web' ? 34 : 0;

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
    Alert.alert(
      `Upgrade to ${plan}`,
      'In-app purchases are coming soon. Thank you for your interest!',
      [{ text: 'OK' }]
    );
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }

  return (
    <LinearGradient colors={[Colors.background, Colors.primary + '22', Colors.background]} style={styles.gradient}>
      <ScrollView
        contentContainerStyle={[styles.container, { paddingTop: webTopPad + 16, paddingBottom: webBottomPad + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Text style={styles.title}>Settings</Text>

        {/* Profile card */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user?.name?.charAt(0)?.toUpperCase() ?? 'U'}</Text>
          </View>
          <View style={styles.profileMeta}>
            <Text style={styles.profileName}>{user?.name}</Text>
            <Text style={styles.profileEmail}>{user?.email}</Text>
          </View>
          {user?.isPremium ? (
            <View style={styles.proBadge}>
              <Text style={styles.proText}>PRO</Text>
            </View>
          ) : (
            <View style={styles.freeBadge}>
              <Text style={styles.freeText}>FREE</Text>
            </View>
          )}
        </View>

        {/* Premium plans */}
        {!user?.isPremium && (
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
                  <Text style={styles.planName}>{plan.name}</Text>
                  <View style={styles.planPriceRow}>
                    <Text style={styles.planPrice}>{plan.price}</Text>
                    <Text style={styles.planPeriod}>{plan.period}</Text>
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

        {/* Tax module (premium locked) */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tax Module</Text>
          <View style={styles.taxLockCard}>
            <View style={styles.taxLockHeader}>
              <Feather name="lock" size={20} color={Colors.accent} />
              <Text style={styles.taxLockTitle}>Premium Feature</Text>
            </View>
            <Text style={styles.taxLockDesc}>
              Get capital gains estimates, tax optimization suggestions, and automated tax reports. Available in Pro plan.
            </Text>
            {!user?.isPremium && (
              <Pressable style={styles.taxUpgradeBtn} onPress={() => handleUpgrade('Pro')}>
                <Text style={styles.taxUpgradeText}>Unlock Tax Module</Text>
              </Pressable>
            )}
            {user?.isPremium && (
              <View style={styles.taxFeatures}>
                <View style={styles.taxFeatureRow}>
                  <Feather name="percent" size={14} color={Colors.accent} />
                  <Text style={styles.taxFeatureText}>Estimated Capital Gains: $0.00</Text>
                </View>
                <View style={styles.taxFeatureRow}>
                  <Feather name="trending-down" size={14} color={Colors.highlight} />
                  <Text style={styles.taxFeatureText}>Optimization: Hold assets &gt;1 year for long-term rate</Text>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Account */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <View style={styles.settingsGroup}>
            <SettingRow icon="user" label="Name" value={user?.name} />
            <View style={styles.separator} />
            <SettingRow icon="mail" label="Email" value={user?.email} />
            <View style={styles.separator} />
            <SettingRow icon="shield" label="Security" value="Password protected" />
          </View>
        </View>

        {/* App Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <View style={styles.settingsGroup}>
            <SettingRow icon="info" label="Version" value="1.0.0" />
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
  title: { fontFamily: 'Inter_700Bold', fontSize: 26, color: Colors.text },
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
  proBadge: {
    backgroundColor: Colors.accent,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  proText: { fontFamily: 'Inter_700Bold', fontSize: 11, color: Colors.primary, letterSpacing: 1 },
  freeBadge: {
    backgroundColor: Colors.cardBorder,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  freeText: { fontFamily: 'Inter_500Medium', fontSize: 11, color: Colors.textSecondary, letterSpacing: 1 },
  section: { gap: 12 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 15, color: Colors.text },
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
  planCardHighlighted: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
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
  settingsGroup: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
  },
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
