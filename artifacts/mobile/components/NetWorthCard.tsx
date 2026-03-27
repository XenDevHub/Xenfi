import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import Colors from '@/constants/colors';

interface Props {
  netWorth: number;
  monthlyChange: number;
  changePercent: number;
}

export function NetWorthCard({ netWorth, monthlyChange, changePercent }: Props) {
  const isPositive = changePercent >= 0;

  return (
    <LinearGradient
      colors={[Colors.backgroundTertiary, Colors.backgroundSecondary]}
      style={styles.card}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <View style={styles.header}>
        <Text style={styles.label}>Net Worth</Text>
        <View style={[styles.badge, isPositive ? styles.badgeGreen : styles.badgeRed]}>
          <Feather
            name={isPositive ? 'trending-up' : 'trending-down'}
            size={12}
            color={isPositive ? Colors.highlight : Colors.error}
          />
          <Text style={[styles.badgeText, { color: isPositive ? Colors.highlight : Colors.error }]}>
            {isPositive ? '+' : ''}{changePercent.toFixed(1)}%
          </Text>
        </View>
      </View>

      <Text style={styles.amount}>
        ${netWorth.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </Text>

      <View style={styles.footer}>
        <Feather name="calendar" size={12} color={Colors.textMuted} />
        <Text style={styles.footerText}>
          {isPositive ? '+' : ''}${Math.abs(monthlyChange).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} this month
        </Text>
      </View>

      <View style={styles.accentBar} />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    position: 'relative',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  label: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: Colors.textSecondary,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  badgeGreen: { backgroundColor: 'rgba(26, 188, 156, 0.15)' },
  badgeRed: { backgroundColor: 'rgba(231, 76, 60, 0.15)' },
  badgeText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
  },
  amount: {
    fontFamily: 'Inter_700Bold',
    fontSize: 38,
    color: Colors.text,
    letterSpacing: -1,
    marginBottom: 12,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  footerText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: Colors.textMuted,
  },
  accentBar: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 4,
    height: '100%',
    backgroundColor: Colors.accent,
    borderTopRightRadius: 20,
    borderBottomRightRadius: 20,
  },
});
