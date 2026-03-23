import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import Colors from '@/constants/colors';
import { FinancialScore } from '@/services/insightsService';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface Props {
  data: FinancialScore;
}

export function HealthScoreCard({ data }: Props) {
  const { score, summary, breakdown } = data;
  const animVal = useRef(new Animated.Value(0)).current;

  const size = 120;
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  useEffect(() => {
    Animated.timing(animVal, {
      toValue: score,
      duration: 1200,
      useNativeDriver: false,
    }).start();
  }, [score]);

  const strokeDashoffset = animVal.interpolate({
    inputRange: [0, 100],
    outputRange: [circumference, 0],
  });

  const scoreColor =
    score >= 80 ? Colors.highlight :
    score >= 65 ? '#4ADE80' :
    score >= 50 ? Colors.accent :
    score >= 35 ? Colors.warning :
    Colors.error;

  const breakdown_items = [
    { label: 'Diversity', value: breakdown.diversity, max: 40 },
    { label: 'Expenses', value: breakdown.expenses, max: 30 },
    { label: 'Assets', value: breakdown.assets, max: 20 },
    { label: 'Debt', value: breakdown.debt, max: 10 },
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Financial Health Score</Text>
      <View style={styles.content}>
        <View style={styles.gaugeContainer}>
          <Svg width={size} height={size}>
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={Colors.cardBorder}
              strokeWidth={strokeWidth}
              fill="none"
            />
            <AnimatedCircle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={scoreColor}
              strokeWidth={strokeWidth}
              fill="none"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              rotation="-90"
              origin={`${size / 2}, ${size / 2}`}
            />
          </Svg>
          <View style={styles.gaugeCenter}>
            <Text style={[styles.scoreNum, { color: scoreColor }]}>{score}</Text>
            <Text style={[styles.scoreSummary, { color: scoreColor }]}>{summary}</Text>
          </View>
        </View>

        <View style={styles.breakdown}>
          {breakdown_items.map((item) => (
            <View key={item.label} style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>{item.label}</Text>
              <View style={styles.breakdownBar}>
                <View style={[styles.breakdownFill, {
                  width: `${(item.value / item.max) * 100}%` as any,
                  backgroundColor: scoreColor,
                }]} />
              </View>
              <Text style={styles.breakdownVal}>{item.value}/{item.max}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    padding: 18,
    gap: 14,
  },
  title: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
    color: Colors.text,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  gaugeContainer: {
    width: 120,
    height: 120,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gaugeCenter: {
    position: 'absolute',
    alignItems: 'center',
  },
  scoreNum: {
    fontFamily: 'Inter_700Bold',
    fontSize: 28,
  },
  scoreSummary: {
    fontFamily: 'Inter_500Medium',
    fontSize: 10,
    letterSpacing: 0.5,
  },
  breakdown: { flex: 1, gap: 8 },
  breakdownRow: { gap: 4 },
  breakdownLabel: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: Colors.textSecondary,
  },
  breakdownBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  breakdownBar: {
    height: 5,
    backgroundColor: Colors.backgroundTertiary,
    borderRadius: 3,
    overflow: 'hidden',
    flex: 1,
  },
  breakdownFill: {
    height: '100%',
    borderRadius: 3,
  },
  breakdownVal: {
    fontFamily: 'Inter_400Regular',
    fontSize: 10,
    color: Colors.textMuted,
    textAlign: 'right',
  },
});
