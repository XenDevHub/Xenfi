import React, { useRef, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, Animated } from 'react-native';
import { Feather } from '@expo/vector-icons';
import Colors from '@/constants/colors';
import { useMarketData, MarketItem } from '@/services/marketService';

function formatPrice(price: number, type: string): string {
  if (type === 'currency') return price.toFixed(4);
  if (price >= 1000) return price.toLocaleString('en-US', { maximumFractionDigits: 0 });
  if (price >= 1) return price.toFixed(2);
  return price.toFixed(4);
}

function TickerCard({ item }: { item: MarketItem }) {
  const isPositive = item.changePercent >= 0;
  const color = isPositive ? Colors.highlight : Colors.error;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 1.02, duration: 200, useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
  }, [item.price]);

  return (
    <Animated.View style={[styles.card, { transform: [{ scale: pulseAnim }] }]}>
      <View style={styles.cardHeader}>
        <Text style={styles.symbol}>{item.symbol}</Text>
        <View style={[styles.changeBadge, { backgroundColor: color + '22' }]}>
          <Feather name={isPositive ? 'trending-up' : 'trending-down'} size={9} color={color} />
          <Text style={[styles.changeText, { color }]}>
            {isPositive ? '+' : ''}{item.changePercent.toFixed(2)}%
          </Text>
        </View>
      </View>
      <Text style={styles.price}>${formatPrice(item.price, item.type)}</Text>
      <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
    </Animated.View>
  );
}

interface MarketTickerProps {
  filter?: 'crypto' | 'stocks' | 'gold' | 'forex' | 'all';
}

export function MarketTicker({ filter = 'all' }: MarketTickerProps) {
  const { data, isLoading } = useMarketData();

  const items = React.useMemo(() => {
    if (!data) return [];
    if (filter === 'all') return [...(data.crypto || []).slice(0, 5), ...(data.stocks || []).slice(0, 4), ...(data.gold || [])];
    return data[filter] || [];
  }, [data, filter]);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Feather name="activity" size={14} color={Colors.accent} />
          <Text style={styles.title}>Global Markets</Text>
          <View style={[styles.liveDot, { backgroundColor: Colors.highlight }]} />
          <Text style={styles.liveText}>LIVE</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scroll}>
          {[1, 2, 3, 4].map((i) => (
            <View key={i} style={[styles.card, styles.skeleton]} />
          ))}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Feather name="activity" size={14} color={Colors.accent} />
        <Text style={styles.title}>Global Markets</Text>
        <View style={[styles.liveDot, { backgroundColor: Colors.highlight }]} />
        <Text style={styles.liveText}>LIVE</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scroll} contentContainerStyle={{ gap: 10, paddingRight: 20 }}>
        {items.map((item) => <TickerCard key={item.symbol} item={item} />)}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 10 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: Colors.text,
    flex: 1,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  liveText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    color: Colors.highlight,
    letterSpacing: 1,
  },
  scroll: { marginHorizontal: -20, paddingLeft: 20 },
  card: {
    width: 100,
    backgroundColor: Colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    padding: 12,
    gap: 4,
  },
  skeleton: { opacity: 0.4, height: 75 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  symbol: {
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
    color: Colors.text,
    letterSpacing: 0.5,
  },
  changeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 5,
  },
  changeText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 9,
  },
  price: {
    fontFamily: 'Inter_700Bold',
    fontSize: 13,
    color: Colors.text,
    marginTop: 2,
  },
  name: {
    fontFamily: 'Inter_400Regular',
    fontSize: 10,
    color: Colors.textMuted,
  },
});
