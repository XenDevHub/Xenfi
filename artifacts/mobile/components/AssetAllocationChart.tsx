import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import Colors from '@/constants/colors';

interface AssetSlice {
  label: string;
  value: number;
  color: string;
}

interface Props {
  data: AssetSlice[];
}

const CATEGORY_COLORS: Record<string, string> = {
  stocks: Colors.blue,
  crypto: Colors.accent,
  real_estate: Colors.highlight,
  cash: Colors.purple,
};

const CATEGORY_LABELS: Record<string, string> = {
  stocks: 'Stocks',
  crypto: 'Crypto',
  real_estate: 'Real Estate',
  cash: 'Cash',
};

export function AssetAllocationChart({ data }: Props) {
  const total = data.reduce((s, d) => s + d.value, 0);

  const SIZE = 130;
  const STROKE = 18;
  const RADIUS = (SIZE - STROKE) / 2;
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

  let offset = 0;
  const slices = data.map((d) => {
    const pct = total > 0 ? d.value / total : 0;
    const dash = pct * CIRCUMFERENCE;
    const gap = CIRCUMFERENCE - dash;
    const startOffset = offset;
    offset += dash;
    return { ...d, dash, gap, startOffset, pct };
  });

  const GAP = 2;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Allocation</Text>
      <View style={styles.row}>
        <View style={styles.chartWrap}>
          <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
            <G rotation="-90" origin={`${SIZE / 2},${SIZE / 2}`}>
              {slices.map((s, i) => (
                <Circle
                  key={i}
                  cx={SIZE / 2}
                  cy={SIZE / 2}
                  r={RADIUS}
                  fill="none"
                  stroke={s.color}
                  strokeWidth={STROKE}
                  strokeDasharray={`${Math.max(0, s.dash - GAP)} ${s.gap + GAP}`}
                  strokeDashoffset={-s.startOffset}
                  strokeLinecap="round"
                />
              ))}
              {total === 0 && (
                <Circle
                  cx={SIZE / 2}
                  cy={SIZE / 2}
                  r={RADIUS}
                  fill="none"
                  stroke={Colors.cardBorder}
                  strokeWidth={STROKE}
                />
              )}
            </G>
          </Svg>
          <View style={styles.centerLabel}>
            <Text style={styles.centerPct}>100%</Text>
          </View>
        </View>

        <View style={styles.legend}>
          {data.map((d, i) => (
            <View key={i} style={styles.legendRow}>
              <View style={[styles.dot, { backgroundColor: d.color }]} />
              <View style={styles.legendText}>
                <Text style={styles.legendLabel}>{CATEGORY_LABELS[d.label] || d.label}</Text>
                <Text style={styles.legendPct}>
                  {total > 0 ? ((d.value / total) * 100).toFixed(0) : 0}%
                </Text>
              </View>
            </View>
          ))}
          {data.length === 0 && (
            <Text style={styles.emptyText}>No assets</Text>
          )}
        </View>
      </View>
    </View>
  );
}

export { CATEGORY_COLORS, CATEGORY_LABELS };

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    padding: 20,
    gap: 16,
  },
  title: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
    color: Colors.text,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  chartWrap: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerLabel: {
    position: 'absolute',
    alignItems: 'center',
  },
  centerPct: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: Colors.textSecondary,
  },
  legend: {
    flex: 1,
    gap: 10,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  legendLabel: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: Colors.textSecondary,
  },
  legendPct: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: Colors.text,
  },
  emptyText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: Colors.textMuted,
  },
});
