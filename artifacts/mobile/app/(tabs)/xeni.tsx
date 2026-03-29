import React, { useState, useRef, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TextInput, Pressable, Platform,
  KeyboardAvoidingView, ActivityIndicator, Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import Colors from '@/constants/colors';
import { useInsights, useMonthlyReport, useFullReport, type BusinessReport } from '@/services/insightsService';
import { HealthScoreCard } from '@/components/HealthScoreCard';

interface Message {
  id: string;
  role: 'user' | 'xeni';
  text: string;
  timestamp: Date;
}

const XENI_GREETINGS = [
  "Hello! I'm Xeni, your AI financial advisor. I've analyzed your portfolio — ask me anything.",
  "Welcome back. I've reviewed your financial data. What would you like to explore today?",
  "Hi! Your wealth intelligence is ready. Let me help you optimize your financial strategy.",
];

const FAQ_SUGGESTIONS = [
  "How is my portfolio performing?",
  "Where am I overspending?",
  "What's my financial health score?",
  "How should I rebalance?",
  "Predict my 6-month savings",
];

function generateXeniResponse(input: string, insights: ReturnType<typeof useInsights>['data']): string {
  const lower = input.toLowerCase();

  if (lower.includes('score') || lower.includes('health')) {
    if (!insights?.financialScore) return "I'm analyzing your financial data. Please ensure you have some assets and expenses tracked.";
    const s = insights.financialScore;
    return `Your Financial Health Score is **${s.score}/100** (${s.summary}). Here's the breakdown:\n• Asset Diversity: ${s.breakdown.diversity}/40\n• Expense Control: ${s.breakdown.expenses}/30\n• Asset Strength: ${s.breakdown.assets}/20\n• Debt Management: ${s.breakdown.debt}/10\n\nI'd recommend focusing on improving your lowest-scoring areas first.`;
  }

  if (lower.includes('spend') || lower.includes('expense') || lower.includes('overspend')) {
    const exp = insights?.expenseInsights;
    if (!exp?.length) return "Add some expenses to your tracker and I'll analyze your spending patterns for you.";
    return `Here's my expense analysis:\n\n${exp.map((i) => `• ${i}`).join('\n')}\n\nWould you like detailed recommendations on any category?`;
  }

  if (lower.includes('portfolio') || lower.includes('invest') || lower.includes('rebalanc') || lower.includes('allocation')) {
    const inv = insights?.investmentInsights;
    if (!inv?.length) return "Add assets to your portfolio and I'll provide detailed investment guidance tailored to your holdings.";
    return `Investment Guidance:\n\n${inv.map((i) => `• ${i}`).join('\n')}\n\nShall I elaborate on any of these points?`;
  }

  if (lower.includes('predict') || lower.includes('forecast') || lower.includes('future') || lower.includes('saving')) {
    const pred = insights?.predictions;
    if (!pred) return "Add your assets and expenses so I can generate accurate financial forecasts for you.";
    return `**6-Month Financial Forecast:**\n\n• Projected Portfolio Value: $${pred.projected6mAssets.toLocaleString()}\n• Estimated Savings: $${pred.projected6mSavings.toLocaleString()}\n• Monthly Burn Rate: $${pred.monthlyBurnRate.toLocaleString()}\n\n${pred.insights.join('\n')}`;
  }

  if (lower.includes('perform') || lower.includes('return') || lower.includes('gain') || lower.includes('loss')) {
    return insights?.investmentInsights?.[0]
      ? `Portfolio Performance:\n\n${insights.investmentInsights.slice(0, 2).map((i) => `• ${i}`).join('\n')}\n\nYour portfolio is actively being monitored. Would you like specific asset recommendations?`
      : "Add assets to your portfolio to see performance analytics.";
  }

  if (lower.includes('report')) {
    return "I've prepared a comprehensive Full Financial Report — tap the 'Report' tab above to view your Personal finances plus a breakdown of every business entity you're tracking. You'll see revenue, expenses, profit margins, and my recommendations per entity.";
  }

  if (lower.includes('business') || lower.includes('entity') || lower.includes('company') || lower.includes('profit') || lower.includes('revenue') || lower.includes('margin')) {
    return "I track each of your business entities separately. Check the 'Report' tab to see revenue, expenses, and profit margins per business. If you haven't added businesses yet, head to the Expenses tab and tap 'Manage Businesses'.";
  }

  if (lower.includes('hello') || lower.includes('hi') || lower.includes('hey')) {
    return XENI_GREETINGS[Math.floor(Math.random() * XENI_GREETINGS.length)];
  }

  const allInsights = [
    ...(insights?.expenseInsights || []),
    ...(insights?.investmentInsights || []),
    ...(insights?.predictions?.insights || []),
  ];

  if (allInsights.length > 0) {
    const random = allInsights[Math.floor(Math.random() * allInsights.length)];
    return `Based on your financial profile: ${random}\n\nAsk me about spending, investments, predictions, or your health score for more targeted advice.`;
  }

  return "I can analyze your expenses, guide your investments, forecast savings, and score your financial health. Start by adding assets and expenses to unlock personalized insights!";
}

export default function XeniScreen() {
  const insets = useSafeAreaInsets();
  const { data: insights, isLoading } = useInsights();
  const { data: report } = useMonthlyReport();
  const { data: fullReport, isLoading: loadingFull, refetch: refetchFull } = useFullReport();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '0',
      role: 'xeni',
      text: XENI_GREETINGS[0],
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [tab, setTab] = useState<'chat' | 'insights' | 'report'>('chat');
  const scrollRef = useRef<ScrollView>(null);

  const webTopPad = Platform.OS === 'web' ? 67 : insets.top;
  const webBottomPad = Platform.OS === 'web' ? 34 : insets.bottom;

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim()) return;
    const userMsg: Message = { id: Date.now().toString(), role: 'user', text: text.trim(), timestamp: new Date() };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    await new Promise((r) => setTimeout(r, 800 + Math.random() * 400));

    const response = generateXeniResponse(text, insights);
    const xeniMsg: Message = { id: (Date.now() + 1).toString(), role: 'xeni', text: response, timestamp: new Date() };
    setMessages((prev) => [...prev, xeniMsg]);
    setIsTyping(false);

    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }, [insights]);

  return (
    <LinearGradient colors={[Colors.background, '#0A1628', Colors.background]} style={{ flex: 1 }}>
      <View style={[styles.header, { paddingTop: webTopPad + 16 }]}>
        <View style={styles.xeniAvatar}>
          <Text style={styles.xeniAvatarText}>X</Text>
        </View>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>Xeni</Text>
          <View style={styles.headerStatus}>
            <View style={styles.statusDot} />
            <Text style={styles.headerSubtitle}>AI Financial Advisor</Text>
          </View>
        </View>
        {insights?.financialScore && (
          <View style={styles.scorePill}>
            <Text style={styles.scorePillText}>{insights.financialScore.score}</Text>
          </View>
        )}
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        {(['chat', 'insights', 'report'] as const).map((t) => (
          <Pressable key={t} style={[styles.tabItem, tab === t && styles.tabItemActive]} onPress={() => setTab(t)}>
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t === 'chat' ? '💬 Chat' : t === 'insights' ? '🧠 Insights' : '📊 Report'}
            </Text>
          </Pressable>
        ))}
      </View>

      {tab === 'chat' && (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={webBottomPad + 100}>
          <ScrollView
            ref={scrollRef}
            style={styles.chatScroll}
            contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 24 }}
            showsVerticalScrollIndicator={false}
          >
            {messages.map((msg) => (
              <View key={msg.id} style={[styles.bubble, msg.role === 'user' ? styles.userBubble : styles.xeniBubble]}>
                {msg.role === 'xeni' && (
                  <View style={styles.xeniIcon}>
                    <Text style={styles.xeniIconText}>X</Text>
                  </View>
                )}
                <View style={[styles.bubbleContent, msg.role === 'user' ? styles.userContent : styles.xeniContent]}>
                  <Text style={[styles.bubbleText, msg.role === 'user' && styles.userBubbleText]}>{msg.text}</Text>
                </View>
              </View>
            ))}
            {isTyping && (
              <View style={[styles.bubble, styles.xeniBubble]}>
                <View style={styles.xeniIcon}>
                  <Text style={styles.xeniIconText}>X</Text>
                </View>
                <View style={styles.xeniContent}>
                  <View style={styles.typingDots}>
                    {[0, 1, 2].map((i) => <View key={i} style={styles.dot} />)}
                  </View>
                </View>
              </View>
            )}
          </ScrollView>

          <View style={[styles.suggestions]}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}>
              {FAQ_SUGGESTIONS.map((s) => (
                <Pressable key={s} style={styles.suggestion} onPress={() => sendMessage(s)}>
                  <Text style={styles.suggestionText}>{s}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>

          <View style={[styles.inputBar, { paddingBottom: webBottomPad + 16 }]}>
            <TextInput
              style={styles.input}
              value={input}
              onChangeText={setInput}
              placeholder="Ask Xeni anything..."
              placeholderTextColor={Colors.textMuted}
              onSubmitEditing={() => sendMessage(input)}
              returnKeyType="send"
              multiline
            />
            <Pressable
              style={[styles.sendBtn, !input.trim() && styles.sendBtnDisabled]}
              onPress={() => sendMessage(input)}
              disabled={!input.trim() || isTyping}
            >
              <Feather name="send" size={18} color={input.trim() ? Colors.primary : Colors.textMuted} />
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      )}

      {tab === 'insights' && (
        <ScrollView
          contentContainerStyle={[styles.insightsScroll, { paddingBottom: webBottomPad + 80 }]}
          showsVerticalScrollIndicator={false}
        >
          {isLoading ? (
            <ActivityIndicator color={Colors.accent} size="large" style={{ marginTop: 40 }} />
          ) : insights ? (
            <>
              <HealthScoreCard data={insights.financialScore} />

              <View style={styles.insightSection}>
                <Text style={styles.insightSectionTitle}>💸 Expense Intelligence</Text>
                {insights.expenseInsights.length === 0 ? (
                  <View style={styles.emptyInsight}>
                    <Text style={styles.emptyInsightText}>Add expenses to unlock spending insights</Text>
                  </View>
                ) : (
                  insights.expenseInsights.map((ins, i) => (
                    <InsightCard key={i} text={ins} color={Colors.error} icon="alert-circle" />
                  ))
                )}
              </View>

              <View style={styles.insightSection}>
                <Text style={styles.insightSectionTitle}>📈 Investment Guidance</Text>
                {insights.investmentInsights.length === 0 ? (
                  <View style={styles.emptyInsight}>
                    <Text style={styles.emptyInsightText}>Add portfolio assets to unlock investment guidance</Text>
                  </View>
                ) : (
                  insights.investmentInsights.map((ins, i) => (
                    <InsightCard key={i} text={ins} color={Colors.highlight} icon="trending-up" />
                  ))
                )}
              </View>

              <View style={styles.insightSection}>
                <Text style={styles.insightSectionTitle}>🔮 Predictive Insights</Text>
                <View style={styles.predictionGrid}>
                  <View style={styles.predictionCard}>
                    <Text style={styles.predictionLabel}>6-Month Forecast</Text>
                    <Text style={styles.predictionValue}>${insights.predictions.projected6mAssets.toLocaleString()}</Text>
                  </View>
                  <View style={styles.predictionCard}>
                    <Text style={styles.predictionLabel}>Projected Savings</Text>
                    <Text style={[styles.predictionValue, { color: Colors.highlight }]}>${insights.predictions.projected6mSavings.toLocaleString()}</Text>
                  </View>
                </View>
                {insights.predictions.insights.map((ins, i) => (
                  <InsightCard key={i} text={ins} color={Colors.blue} icon="zap" />
                ))}
              </View>
            </>
          ) : (
            <View style={styles.emptyInsight}>
              <Text style={styles.emptyInsightText}>Unable to load insights. Please try again.</Text>
            </View>
          )}
        </ScrollView>
      )}

      {tab === 'report' && (
        <ScrollView
          contentContainerStyle={[styles.insightsScroll, { paddingBottom: webBottomPad + 80 }]}
          showsVerticalScrollIndicator={false}
        >
          {loadingFull ? (
            <ActivityIndicator color={Colors.accent} size="large" style={{ marginTop: 40 }} />
          ) : fullReport ? (
            <>
              {/* Report Header */}
              <View style={styles.reportHeader}>
                <View>
                  <Text style={styles.reportTitle}>Full Financial Report</Text>
                  <Text style={styles.reportDate}>{new Date(fullReport.generatedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</Text>
                </View>
                <Pressable onPress={() => refetchFull()} style={styles.refreshBtn}>
                  <Feather name="refresh-cw" size={14} color={Colors.accent} />
                </Pressable>
              </View>

              {/* Consolidated overview */}
              {fullReport.consolidated.totalEntities > 1 && (
                <View style={styles.consolidatedCard}>
                  <Text style={styles.consolidatedTitle}>📊 Consolidated Overview</Text>
                  <Text style={styles.consolidatedSub}>{fullReport.consolidated.totalEntities} entities tracked</Text>
                  <View style={styles.reportGrid}>
                    <ReportMetric label="Biz Income" value={`$${fullReport.consolidated.totalBusinessIncome.toLocaleString()}`} color={Colors.highlight} />
                    <ReportMetric label="Biz Expenses" value={`$${fullReport.consolidated.totalBusinessExpenses.toLocaleString()}`} color={Colors.error} />
                    <ReportMetric label="Biz Balance" value={`$${fullReport.consolidated.totalBusinessBalance.toLocaleString()}`} color={fullReport.consolidated.totalBusinessBalance >= 0 ? Colors.highlight : Colors.error} />
                    <ReportMetric label="Health Score" value={`${fullReport.personal.financialScore.score}/100`} color={Colors.accent} />
                  </View>
                </View>
              )}

              {/* Personal section */}
              <View style={[styles.entitySection, { borderColor: Colors.accent + '44' }]}>
                <View style={[styles.entitySectionHeader, { backgroundColor: Colors.accent + '15' }]}>
                  <View style={[styles.entitySectionIco, { backgroundColor: Colors.accent + '33' }]}>
                    <Feather name="user" size={14} color={Colors.accent} />
                  </View>
                  <Text style={[styles.entitySectionName, { color: Colors.accent }]}>Personal</Text>
                  <Text style={styles.entitySectionBadge}>{fullReport.personal.financialScore.summary}</Text>
                </View>

                <View style={styles.entityMetrics}>
                  <View style={styles.entityMetric}>
                    <Text style={[styles.entityMetricVal, { color: Colors.highlight }]}>
                      ${(fullReport.personal.predictions.projected6mSavings).toLocaleString()}
                    </Text>
                    <Text style={styles.entityMetricLbl}>6m Savings</Text>
                  </View>
                  <View style={styles.entityMetric}>
                    <Text style={[styles.entityMetricVal, { color: Colors.error }]}>
                      ${(fullReport.personal.predictions.monthlyBurnRate).toLocaleString()}
                    </Text>
                    <Text style={styles.entityMetricLbl}>Monthly Burn</Text>
                  </View>
                  <View style={styles.entityMetric}>
                    <Text style={[styles.entityMetricVal, { color: Colors.accent }]}>
                      {fullReport.personal.financialScore.score}/100
                    </Text>
                    <Text style={styles.entityMetricLbl}>Health</Text>
                  </View>
                </View>

                {fullReport.personal.expenseInsights.slice(0, 2).map((ins, i) => (
                  <InsightCard key={i} text={ins} color={Colors.textSecondary} icon="info" />
                ))}
              </View>

              {/* Business sections */}
              {fullReport.businesses.map((biz) => (
                <View key={biz.id} style={[styles.entitySection, { borderColor: biz.color + '44' }]}>
                  <View style={[styles.entitySectionHeader, { backgroundColor: biz.color + '15' }]}>
                    <View style={[styles.entitySectionIco, { backgroundColor: biz.color + '33' }]}>
                      <Feather name={(biz.icon || 'briefcase') as any} size={14} color={biz.color} />
                    </View>
                    <Text style={[styles.entitySectionName, { color: biz.color }]}>{biz.name}</Text>
                    <Text style={[styles.entitySectionBadge, { color: biz.balance >= 0 ? Colors.highlight : Colors.error }]}>
                      {biz.balance >= 0 ? 'Profitable' : 'Loss'}
                    </Text>
                  </View>

                  <View style={styles.entityMetrics}>
                    <View style={styles.entityMetric}>
                      <Text style={[styles.entityMetricVal, { color: Colors.highlight }]}>${biz.income.toLocaleString()}</Text>
                      <Text style={styles.entityMetricLbl}>Revenue</Text>
                    </View>
                    <View style={styles.entityMetric}>
                      <Text style={[styles.entityMetricVal, { color: Colors.error }]}>${biz.expenses.toLocaleString()}</Text>
                      <Text style={styles.entityMetricLbl}>Expenses</Text>
                    </View>
                    <View style={styles.entityMetric}>
                      <Text style={[styles.entityMetricVal, { color: biz.balance >= 0 ? Colors.highlight : Colors.error }]}>
                        ${Math.abs(biz.balance).toLocaleString()}
                      </Text>
                      <Text style={styles.entityMetricLbl}>Balance</Text>
                    </View>
                  </View>

                  {Object.keys(biz.breakdown).length > 0 && (
                    <View style={{ gap: 4, marginBottom: 8 }}>
                      {Object.entries(biz.breakdown).sort(([,a],[,b])=>b-a).slice(0,3).map(([cat, amt]) => (
                        <View key={cat} style={styles.breakdownRow}>
                          <View style={[styles.breakdownDot, { backgroundColor: biz.color + '66' }]} />
                          <Text style={styles.breakdownCat}>{cat}</Text>
                          <View style={styles.breakdownBarWrap}>
                            <View style={[styles.breakdownBarFill, {
                              width: `${biz.expenses > 0 ? Math.min((amt / biz.expenses) * 100, 100) : 0}%` as any,
                              backgroundColor: biz.color,
                            }]} />
                          </View>
                          <Text style={styles.breakdownAmt}>${amt.toLocaleString()}</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {biz.insights.slice(0, 2).map((ins, i) => (
                    <InsightCard key={i} text={ins} color={biz.color} icon="zap" />
                  ))}
                </View>
              ))}

              {fullReport.businesses.length === 0 && (
                <View style={styles.emptyInsight}>
                  <Feather name="briefcase" size={24} color={Colors.textMuted} style={{ marginBottom: 8 }} />
                  <Text style={styles.emptyInsightText}>No businesses tracked yet</Text>
                  <Text style={[styles.emptyInsightText, { fontSize: 12, marginTop: 4 }]}>Add businesses in the Expenses tab to see full reports</Text>
                </View>
              )}

              {/* Recommendations */}
              {fullReport.personal.expenseInsights.length + fullReport.personal.investmentInsights.length > 0 && (
                <View style={styles.insightSection}>
                  <Text style={styles.insightSectionTitle}>💡 Xeni Recommendations</Text>
                  {[...fullReport.personal.expenseInsights, ...fullReport.personal.investmentInsights].slice(0, 4).map((rec, i) => (
                    <InsightCard key={i} text={rec} color={Colors.accent} icon="star" />
                  ))}
                </View>
              )}
            </>
          ) : (
            <View style={styles.emptyInsight}>
              <Text style={styles.emptyInsightText}>Unable to load report. Please try again.</Text>
              <Pressable onPress={() => refetchFull()} style={{ marginTop: 12 }}>
                <Text style={{ color: Colors.accent, fontFamily: 'Inter_600SemiBold' }}>Retry</Text>
              </Pressable>
            </View>
          )}
        </ScrollView>
      )}
    </LinearGradient>
  );
}

function InsightCard({ text, color, icon }: { text: string; color: string; icon: any }) {
  return (
    <View style={[styles.insightCard, { borderLeftColor: color }]}>
      <Feather name={icon} size={14} color={color} style={{ marginTop: 2 }} />
      <Text style={styles.insightText}>{text}</Text>
    </View>
  );
}

function ReportMetric({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={styles.reportMetric}>
      <Text style={[styles.reportMetricValue, { color }]}>{value}</Text>
      <Text style={styles.reportMetricLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.cardBorder,
  },
  xeniAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  xeniAvatarText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 20,
    color: Colors.primary,
  },
  headerText: { flex: 1 },
  headerTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 18,
    color: Colors.text,
  },
  headerStatus: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: Colors.highlight,
  },
  headerSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: Colors.textSecondary,
  },
  scorePill: {
    backgroundColor: Colors.accent + '22',
    borderWidth: 1,
    borderColor: Colors.accent,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  scorePillText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 16,
    color: Colors.accent,
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.cardBorder,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 10,
    alignItems: 'center',
  },
  tabItemActive: { backgroundColor: Colors.accent + '22' },
  tabText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: Colors.textMuted,
  },
  tabTextActive: { color: Colors.accent },
  chatScroll: { flex: 1 },
  bubble: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-end',
  },
  userBubble: { flexDirection: 'row-reverse' },
  xeniBubble: {},
  xeniIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  xeniIconText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
    color: Colors.primary,
  },
  bubbleContent: {
    maxWidth: '78%',
    borderRadius: 16,
    padding: 12,
  },
  xeniContent: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderBottomLeftRadius: 4,
  },
  userContent: {
    backgroundColor: Colors.accent,
    borderBottomRightRadius: 4,
  },
  bubbleText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
  },
  userBubbleText: { color: Colors.primary },
  typingDots: {
    flexDirection: 'row',
    gap: 5,
    paddingVertical: 4,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: Colors.textMuted,
  },
  suggestions: { paddingVertical: 8 },
  suggestion: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  suggestionText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: Colors.textSecondary,
  },
  inputBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.cardBorder,
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: Colors.text,
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    maxHeight: 100,
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: Colors.cardBorder },
  insightsScroll: { padding: 16, gap: 16 },
  insightSection: { gap: 10 },
  insightSectionTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
    color: Colors.text,
  },
  insightCard: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: Colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderLeftWidth: 3,
    padding: 14,
    alignItems: 'flex-start',
  },
  insightText: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 19,
  },
  emptyInsight: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    padding: 20,
    alignItems: 'center',
  },
  emptyInsightText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  predictionGrid: { flexDirection: 'row', gap: 12 },
  predictionCard: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    padding: 14,
    alignItems: 'center',
    gap: 4,
  },
  predictionLabel: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  predictionValue: {
    fontFamily: 'Inter_700Bold',
    fontSize: 18,
    color: Colors.text,
  },
  reportHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 4 },
  refreshBtn: { padding: 8, backgroundColor: Colors.accent + '22', borderRadius: 10, borderWidth: 1, borderColor: Colors.accent + '55' },
  reportTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 20,
    color: Colors.text,
  },
  reportDate: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: Colors.accent,
  },
  reportGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  reportMetric: {
    flex: 1,
    minWidth: '40%',
    backgroundColor: Colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    padding: 16,
    alignItems: 'center',
    gap: 4,
  },
  reportMetricValue: {
    fontFamily: 'Inter_700Bold',
    fontSize: 18,
  },
  reportMetricLabel: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: Colors.textMuted,
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  breakdownDot: { width: 8, height: 8, borderRadius: 4 },
  breakdownCat: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: Colors.textSecondary,
    textTransform: 'capitalize',
    width: 90,
  },
  breakdownBarWrap: { flex: 1, height: 5, backgroundColor: Colors.cardBorder, borderRadius: 3, overflow: 'hidden' },
  breakdownBarFill: { height: 5, borderRadius: 3 },
  breakdownAmt: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: Colors.text,
    width: 64,
    textAlign: 'right',
  },
  consolidatedCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    padding: 16,
    gap: 8,
    marginBottom: 4,
  },
  consolidatedTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: Colors.text,
  },
  consolidatedSub: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: Colors.textMuted,
    marginBottom: 4,
  },
  entitySection: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 8,
    marginBottom: 4,
  },
  entitySectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 10,
    padding: 10,
  },
  entitySectionIco: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  entitySectionName: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    flex: 1,
  },
  entitySectionBadge: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: Colors.textMuted,
  },
  entityMetrics: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
  },
  entityMetric: {
    flex: 1,
    backgroundColor: Colors.background,
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
    gap: 2,
  },
  entityMetricVal: {
    fontFamily: 'Inter_700Bold',
    fontSize: 15,
    color: Colors.text,
  },
  entityMetricLbl: {
    fontFamily: 'Inter_400Regular',
    fontSize: 10,
    color: Colors.textMuted,
  },
});
