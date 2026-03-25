import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import colors from '@/constants/colors';
import typography from '@/constants/typography';
import { api } from '@/services/api';
import { useBackofficeContext } from '@/contexts/BackofficeContext';

interface Experience {
  id: number;
  title: string;
  location: string;
  price: number;
  currency?: string;
  category?: string | null;
  is_active?: boolean;
  instant_booking?: boolean;
  available_today?: boolean;
  operator_id: number;
  operators?: {
    id: number;
    company_name: string;
  } | null;
}

interface Operator {
  id: number;
  company_name: string;
  verified?: boolean;
  city?: string | null;
}

interface RevenueData {
  totalRevenue: number;
  todayRevenue: number;
  weekRevenue: number;
  monthRevenue: number;
  bookingCount: number;
  currency: string;
  revenueByOperator: {
    id: number;
    name: string;
    commission: number;
    totalRevenue: number;
    operatorShare: number;
    platformShare: number;
    bookingCount: number;
  }[];
  revenueByExperience: {
    id: number;
    title: string;
    totalRevenue: number;
    bookingCount: number;
  }[];
}

interface BookingsSummary {
  total: number;
  pending: number;
  confirmed: number;
  completed: number;
  cancelled: number;
  todayBookings: number;
  upcomingWeek: number;
}

interface ChartDataPoint {
  date: string;
  revenue: number;
  bookings: number;
}

interface RevenueChartData {
  period: 'day' | 'week' | 'month' | 'year';
  groupBy: string;
  chartData: ChartDataPoint[];
  totalRevenue: number;
  totalBookings: number;
  currency: string;
}

interface DashboardStats {
  total: number;
  active: number;
  inactive: number;
  instantBooking: number;
  availableToday: number;
  operators: number;
  verifiedOperators: number;
  categories: Record<string, number>;
  locations: Record<string, number>;
  priceRange: { min: number; max: number; avg: number };
}

const emptyRevenueData: RevenueData = {
  totalRevenue: 0,
  todayRevenue: 0,
  weekRevenue: 0,
  monthRevenue: 0,
  bookingCount: 0,
  currency: 'EUR',
  revenueByOperator: [],
  revenueByExperience: []
};

const emptyBookingsSummary: BookingsSummary = {
  total: 0,
  pending: 0,
  confirmed: 0,
  completed: 0,
  cancelled: 0,
  todayBookings: 0,
  upcomingWeek: 0
};

const emptyStats: DashboardStats = {
  total: 0,
  active: 0,
  inactive: 0,
  instantBooking: 0,
  availableToday: 0,
  operators: 0,
  verifiedOperators: 0,
  categories: {},
  locations: {},
  priceRange: { min: 0, max: 0, avg: 0 }
};

const emptyChartData: RevenueChartData = {
  period: 'month',
  groupBy: 'day',
  chartData: [],
  totalRevenue: 0,
  totalBookings: 0,
  currency: 'EUR'
};

export default function BackofficeDashboard() {
  const { profile } = useBackofficeContext();
  const { width } = useWindowDimensions();
  const isWide = width >= 900;
  
  const [experiences, setExperiences] = useState<Experience[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [operators, setOperators] = useState<Operator[]>([]);
  const [stats, setStats] = useState<DashboardStats>(emptyStats);
  const [revenueData, setRevenueData] = useState<RevenueData>(emptyRevenueData);
  const [bookingsSummary, setBookingsSummary] = useState<BookingsSummary>(emptyBookingsSummary);
  const [chartData, setChartData] = useState<RevenueChartData>(emptyChartData);
  const [chartPeriod, setChartPeriod] = useState<'day' | 'week' | 'month' | 'year'>('month');
  const [chartLoading, setChartLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateAnim = useRef(new Animated.Value(12)).current;

  const isAdmin = profile?.user.role === 'admin';

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true
      }),
      Animated.timing(translateAnim, {
        toValue: 0,
        duration: 350,
        useNativeDriver: true
      })
    ]).start();
  }, [fadeAnim, translateAnim]);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        const experiencesResponse = await api.getBackofficeExperiences();
        if (!experiencesResponse.success || !experiencesResponse.data) {
          throw new Error(experiencesResponse.error || 'Failed to load experiences');
        }

        const expData = experiencesResponse.data as Experience[];
        setExperiences(expData);

        let opData: Operator[] = [];
        if (isAdmin) {
          const operatorsResponse = await api.getBackofficeOperators();
          if (operatorsResponse.success && operatorsResponse.data) {
            opData = operatorsResponse.data as Operator[];
            setOperators(opData);
          }
        }

        // Calculate comprehensive stats
        const activeExps = expData.filter((e) => e.is_active);
        const inactiveExps = expData.filter((e) => !e.is_active);
        const instantBookingExps = expData.filter((e) => e.instant_booking);
        const availableTodayExps = expData.filter((e) => e.available_today);
        const verifiedOps = opData.filter((o) => o.verified);

        // Category breakdown
        const categories: Record<string, number> = {};
        expData.forEach((e) => {
          const cat = e.category || 'Uncategorized';
          categories[cat] = (categories[cat] || 0) + 1;
        });

        // Location breakdown
        const locations: Record<string, number> = {};
        expData.forEach((e) => {
          const loc = e.location || 'Unknown';
          locations[loc] = (locations[loc] || 0) + 1;
        });

        // Price stats
        const prices = expData.map((e) => e.price).filter((p) => p > 0);
        const priceRange = prices.length > 0 
          ? {
              min: Math.min(...prices),
              max: Math.max(...prices),
              avg: Math.round(prices.reduce((a, b) => a + b, 0) / prices.length)
            }
          : { min: 0, max: 0, avg: 0 };

        setStats({
          total: expData.length,
          active: activeExps.length,
          inactive: inactiveExps.length,
          instantBooking: instantBookingExps.length,
          availableToday: availableTodayExps.length,
          operators: opData.length,
          verifiedOperators: verifiedOps.length,
          categories,
          locations,
          priceRange
        });

        // Load revenue analytics
        try {
          const revenueResponse = await api.getBackofficeRevenueAnalytics();
          if (revenueResponse.success && revenueResponse.data) {
            setRevenueData(revenueResponse.data as RevenueData);
          }
        } catch (revenueErr) {
          console.log('Revenue analytics not available:', revenueErr);
        }

        // Load bookings summary
        try {
          const bookingsResponse = await api.getBackofficeBookingsSummary();
          if (bookingsResponse.success && bookingsResponse.data) {
            setBookingsSummary(bookingsResponse.data as BookingsSummary);
          }
        } catch (bookingsErr) {
          console.log('Bookings summary not available:', bookingsErr);
        }

        // Load revenue chart data
        try {
          const chartResponse = await api.getBackofficeRevenueChart('month');
          if (chartResponse.success && chartResponse.data) {
            setChartData(chartResponse.data as RevenueChartData);
          }
        } catch (chartErr) {
          console.log('Revenue chart not available:', chartErr);
        }

      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load stats';
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [isAdmin]);

  // Recent experiences (last 5)
  const recentExperiences = useMemo(() => {
    return experiences.slice(0, 5);
  }, [experiences]);

  // Top categories
  const topCategories = useMemo(() => {
    return Object.entries(stats.categories)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);
  }, [stats.categories]);

  // Top locations
  const topLocations = useMemo(() => {
    return Object.entries(stats.locations)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);
  }, [stats.locations]);

  // Load chart data when period changes
  const loadChartData = async (period: 'day' | 'week' | 'month' | 'year') => {
    try {
      setChartLoading(true);
      const response = await api.getBackofficeRevenueChart(period);
      if (response.success && response.data) {
        setChartData(response.data as RevenueChartData);
      }
    } catch (err) {
      console.log('Failed to load chart data:', err);
    } finally {
      setChartLoading(false);
    }
  };

  const handlePeriodChange = (period: 'day' | 'week' | 'month' | 'year') => {
    setChartPeriod(period);
    loadChartData(period);
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toFixed(2);
  };

  const formatChartLabel = (dateStr: string, groupBy: string) => {
    try {
      if (groupBy === 'hour') {
        // Format: YYYY-MM-DDTHH:00 -> HH:00
        return dateStr.split('T')[1]?.slice(0, 5) || dateStr;
      } else if (groupBy === 'day') {
        // Format: YYYY-MM-DD -> DD/MM
        const parts = dateStr.split('-');
        return `${parts[2]}/${parts[1]}`;
      } else if (groupBy === 'month') {
        // Format: YYYY-MM -> Mon
        const date = new Date(dateStr + '-01');
        return date.toLocaleDateString('en-GB', { month: 'short' });
      }
      return dateStr;
    } catch {
      return dateStr;
    }
  };

  const operatorName = profile?.operator?.company_name;
  const userName = profile?.user?.name || 'there';
  const greeting = getGreeting();

  return (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <Animated.View style={[styles.container, { opacity: fadeAnim, transform: [{ translateY: translateAnim }] }]}>
        
        {/* Hero Section */}
        <View style={styles.heroCard}>
          <View style={styles.heroContent}>
            <Text style={styles.heroGreeting}>{greeting}</Text>
            <Text style={styles.heroTitle}>{userName}</Text>
            <Text style={styles.heroSubtitle}>
              {isAdmin 
                ? 'Manage your platform, operators, and experiences all in one place.'
                : 'Manage your experiences and keep your catalog sharp.'}
            </Text>
            {operatorName && (
              <View style={styles.operatorBadge}>
                <Text style={styles.operatorBadgeText}>{operatorName}</Text>
              </View>
            )}
          </View>
          <View style={styles.heroActions}>
            <Pressable style={styles.primaryButton} onPress={() => router.push('/backoffice/experiences')}>
              <Text style={styles.primaryButtonText}>+ New Experience</Text>
            </Pressable>
            {isAdmin && (
              <Pressable style={styles.secondaryButton} onPress={() => router.push('/backoffice/operators')}>
                <Text style={styles.secondaryButtonText}>+ New Operator</Text>
              </Pressable>
            )}
          </View>
        </View>

        {error && (
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>⚠️ Unable to load data</Text>
            <Text style={styles.errorMessage}>{error}</Text>
          </View>
        )}

        {/* Main Stats Grid */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Overview</Text>
            <Text style={styles.sectionHint}>Real-time statistics from your workspace</Text>
          </View>

          <View style={[styles.statsGrid, isWide && styles.statsGridWide]}>
            <StatCard
              label="Total Experiences"
              value={stats.total}
              loading={loading}
              color={colors.dark.primary}
              icon="📦"
            />
            <StatCard
              label="Active"
              value={stats.active}
              loading={loading}
              color="#22c55e"
              icon="✅"
              subtitle={stats.total > 0 ? `${Math.round((stats.active / stats.total) * 100)}%` : undefined}
            />
            <StatCard
              label="Inactive"
              value={stats.inactive}
              loading={loading}
              color="#ef4444"
              icon="⏸️"
            />
            <StatCard
              label="Instant Booking"
              value={stats.instantBooking}
              loading={loading}
              color="#f59e0b"
              icon="⚡"
            />
            <StatCard
              label="Available Today"
              value={stats.availableToday}
              loading={loading}
              color="#06b6d4"
              icon="📅"
            />
            {isAdmin && (
              <>
                <StatCard
                  label="Operators"
                  value={stats.operators}
                  loading={loading}
                  color="#8b5cf6"
                  icon="🏢"
                />
                <StatCard
                  label="Verified"
                  value={stats.verifiedOperators}
                  loading={loading}
                  color="#22c55e"
                  icon="✓"
                  subtitle={stats.operators > 0 ? `${Math.round((stats.verifiedOperators / stats.operators) * 100)}%` : undefined}
                />
              </>
            )}
          </View>
        </View>

        {/* Revenue Analytics */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>💵 Revenue Analytics</Text>
            <Text style={styles.sectionHint}>Financial performance overview</Text>
          </View>

          <View style={[styles.statsGrid, isWide && styles.statsGridWide]}>
            <StatCard
              label="Total Revenue"
              value={`€${formatNumber(revenueData.totalRevenue)}`}
              loading={loading}
              color="#10b981"
              icon="💰"
              isText
            />
            <StatCard
              label="Today"
              value={`€${formatNumber(revenueData.todayRevenue)}`}
              loading={loading}
              color="#06b6d4"
              icon="📅"
              isText
            />
            <StatCard
              label="This Week"
              value={`€${formatNumber(revenueData.weekRevenue)}`}
              loading={loading}
              color="#8b5cf6"
              icon="📊"
              isText
            />
            <StatCard
              label="This Month"
              value={`€${formatNumber(revenueData.monthRevenue)}`}
              loading={loading}
              color="#f59e0b"
              icon="📈"
              isText
            />
          </View>

          {/* Revenue Chart */}
          <View style={styles.chartContainer}>
            <View style={styles.chartHeader}>
              <Text style={styles.chartTitle}>📊 Revenue Over Time</Text>
              <View style={styles.chartPeriodSelector}>
                {(['day', 'week', 'month', 'year'] as const).map((period) => (
                  <Pressable
                    key={period}
                    style={[styles.periodButton, chartPeriod === period && styles.periodButtonActive]}
                    onPress={() => handlePeriodChange(period)}
                  >
                    <Text style={[styles.periodButtonText, chartPeriod === period && styles.periodButtonTextActive]}>
                      {period.charAt(0).toUpperCase() + period.slice(1)}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
            
            {chartLoading ? (
              <View style={styles.chartLoading}>
                <Text style={styles.chartLoadingText}>Loading chart...</Text>
              </View>
            ) : chartData.chartData.length > 0 ? (
              <View style={styles.chartContent}>
                <View style={styles.chartBars}>
                  {(() => {
                    const maxRevenue = Math.max(...chartData.chartData.map(d => d.revenue), 1);
                    const displayData = chartData.chartData.slice(-12); // Show last 12 data points
                    return displayData.map((point, index) => {
                      const heightPercent = (point.revenue / maxRevenue) * 100;
                      const label = formatChartLabel(point.date, chartData.groupBy);
                      return (
                        <View key={index} style={styles.chartBarContainer}>
                          <Text style={styles.chartBarValue}>
                            {point.revenue > 0 ? `€${formatNumber(point.revenue)}` : ''}
                          </Text>
                          <View style={styles.chartBarWrapper}>
                            <View 
                              style={[
                                styles.chartBar, 
                                { height: `${Math.max(heightPercent, 2)}%` }
                              ]} 
                            />
                          </View>
                          <Text style={styles.chartBarLabel} numberOfLines={1}>{label}</Text>
                        </View>
                      );
                    });
                  })()}
                </View>
                <View style={styles.chartSummary}>
                  <Text style={styles.chartSummaryText}>
                    Total: €{formatNumber(chartData.totalRevenue)} • {chartData.totalBookings} bookings
                  </Text>
                </View>
              </View>
            ) : (
              <View style={styles.chartEmpty}>
                <Text style={styles.chartEmptyText}>No revenue data for this period</Text>
              </View>
            )}
          </View>

          {/* Top Experiences by Revenue */}
          {revenueData.revenueByExperience.length > 0 && (
            <View style={styles.revenueTable}>
              <Text style={styles.tableTitle}>Top Performing Experiences</Text>
              {revenueData.revenueByExperience.slice(0, 5).map((exp, index) => (
                <View key={exp.id} style={styles.tableRow}>
                  <View style={styles.tableLeft}>
                    <Text style={styles.tableRank}>#{index + 1}</Text>
                    <Text style={styles.tableName} numberOfLines={1}>{exp.title}</Text>
                  </View>
                  <View style={styles.tableRight}>
                    <Text style={styles.tableAmount}>€{formatNumber(exp.totalRevenue)}</Text>
                    <Text style={styles.tableBookings}>{exp.bookingCount} bookings</Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Revenue by Operator (Admin only) */}
          {isAdmin && revenueData.revenueByOperator.length > 0 && (
            <View style={styles.revenueTable}>
              <Text style={styles.tableTitle}>Revenue by Operator</Text>
              {revenueData.revenueByOperator.slice(0, 5).map((op, index) => (
                <View key={op.id} style={styles.tableRow}>
                  <View style={styles.tableLeft}>
                    <Text style={styles.tableRank}>#{index + 1}</Text>
                    <View>
                      <Text style={styles.tableName} numberOfLines={1}>{op.name}</Text>
                      <Text style={styles.tableCommission}>{op.commission}% commission</Text>
                    </View>
                  </View>
                  <View style={styles.tableRight}>
                    <Text style={styles.tableAmount}>€{formatNumber(op.totalRevenue)}</Text>
                    <Text style={styles.tableShare}>Platform: €{formatNumber(op.platformShare)}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Bookings Overview */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>📋 Bookings Overview</Text>
            <Pressable style={styles.viewAllButton} onPress={() => router.push('/backoffice/bookings')}>
              <Text style={styles.viewAllText}>View All →</Text>
            </Pressable>
          </View>

          <View style={[styles.statsGrid, isWide && styles.statsGridWide]}>
            <StatCard
              label="Pending"
              value={bookingsSummary.pending}
              loading={loading}
              color="#f59e0b"
              icon="⏳"
            />
            <StatCard
              label="Confirmed"
              value={bookingsSummary.confirmed}
              loading={loading}
              color="#22c55e"
              icon="✅"
            />
            <StatCard
              label="Today"
              value={bookingsSummary.todayBookings}
              loading={loading}
              color="#06b6d4"
              icon="📅"
            />
            <StatCard
              label="This Week"
              value={bookingsSummary.upcomingWeek}
              loading={loading}
              color="#8b5cf6"
              icon="📆"
            />
            <StatCard
              label="Completed"
              value={bookingsSummary.completed}
              loading={loading}
              color={colors.dark.primary}
              icon="🎉"
            />
            <StatCard
              label="Cancelled"
              value={bookingsSummary.cancelled}
              loading={loading}
              color="#ef4444"
              icon="❌"
            />
          </View>
        </View>

        {/* Price Insights */}
        {stats.priceRange.max > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>💰 Pricing Insights</Text>
            </View>
            <View style={styles.priceCard}>
              <View style={styles.priceItem}>
                <Text style={styles.priceLabel}>Minimum</Text>
                <Text style={styles.priceValue}>€{stats.priceRange.min}</Text>
              </View>
              <View style={styles.priceDivider} />
              <View style={styles.priceItem}>
                <Text style={styles.priceLabel}>Average</Text>
                <Text style={[styles.priceValue, styles.priceValueHighlight]}>€{stats.priceRange.avg}</Text>
              </View>
              <View style={styles.priceDivider} />
              <View style={styles.priceItem}>
                <Text style={styles.priceLabel}>Maximum</Text>
                <Text style={styles.priceValue}>€{stats.priceRange.max}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Categories & Locations */}
        <View style={[styles.columnsContainer, isWide && styles.columnsContainerWide]}>
          {/* Top Categories */}
          {topCategories.length > 0 && (
            <View style={[styles.columnCard, isWide && styles.columnCardHalf]}>
              <Text style={styles.columnTitle}>📂 Top Categories</Text>
              <View style={styles.listItems}>
                {topCategories.map(([category, count], index) => (
                  <View key={category} style={styles.listItem}>
                    <View style={styles.listItemLeft}>
                      <Text style={styles.listItemRank}>#{index + 1}</Text>
                      <Text style={styles.listItemName}>{category}</Text>
                    </View>
                    <View style={styles.listItemBadge}>
                      <Text style={styles.listItemCount}>{count}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Top Locations */}
          {topLocations.length > 0 && (
            <View style={[styles.columnCard, isWide && styles.columnCardHalf]}>
              <Text style={styles.columnTitle}>📍 Top Locations</Text>
              <View style={styles.listItems}>
                {topLocations.map(([location, count], index) => (
                  <View key={location} style={styles.listItem}>
                    <View style={styles.listItemLeft}>
                      <Text style={styles.listItemRank}>#{index + 1}</Text>
                      <Text style={styles.listItemName}>{location}</Text>
                    </View>
                    <View style={styles.listItemBadge}>
                      <Text style={styles.listItemCount}>{count}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>

        {/* Recent Experiences */}
        {recentExperiences.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>🕐 Recent Experiences</Text>
              <Pressable onPress={() => router.push('/backoffice/experiences')}>
                <Text style={styles.sectionLink}>View all →</Text>
              </Pressable>
            </View>
            <View style={styles.recentList}>
              {recentExperiences.map((exp) => (
                <View key={exp.id} style={styles.recentCard}>
                  <View style={styles.recentInfo}>
                    <Text style={styles.recentTitle} numberOfLines={1}>{exp.title}</Text>
                    <Text style={styles.recentMeta}>
                      {exp.location} • €{exp.price}
                      {exp.operators?.company_name && ` • ${exp.operators.company_name}`}
                    </Text>
                  </View>
                  <View style={[styles.statusDot, exp.is_active ? styles.statusDotActive : styles.statusDotInactive]} />
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Quick Actions */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>⚡ Quick Actions</Text>
          </View>
          <View style={[styles.actionsGrid, isWide && styles.actionsGridWide]}>
            <Pressable style={styles.actionCard} onPress={() => router.push('/backoffice/experiences')}>
              <Text style={styles.actionIcon}>📝</Text>
              <Text style={styles.actionLabel}>Manage Experiences</Text>
              <Text style={styles.actionHint}>Edit, create, or remove experiences</Text>
            </Pressable>
            {isAdmin && (
              <Pressable style={styles.actionCard} onPress={() => router.push('/backoffice/operators')}>
                <Text style={styles.actionIcon}>👥</Text>
                <Text style={styles.actionLabel}>Manage Operators</Text>
                <Text style={styles.actionHint}>Add or edit operator profiles</Text>
              </Pressable>
            )}
            <Pressable style={styles.actionCard} onPress={() => router.push('/')}>
              <Text style={styles.actionIcon}>📱</Text>
              <Text style={styles.actionLabel}>View App</Text>
              <Text style={styles.actionHint}>See how experiences look to users</Text>
            </Pressable>
          </View>
        </View>

      </Animated.View>
    </ScrollView>
  );
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning,';
  if (hour < 18) return 'Good afternoon,';
  return 'Good evening,';
}

function StatCard({ 
  label, 
  value, 
  loading, 
  color,
  icon,
  subtitle,
  isText = false
}: { 
  label: string; 
  value: number | string; 
  loading: boolean;
  color: string;
  icon: string;
  subtitle?: string;
  isText?: boolean;
}) {
  return (
    <View style={styles.statCard}>
      <View style={styles.statHeader}>
        <Text style={[styles.statIcon, { color }]}>{icon}</Text>
        <Text style={styles.statLabel}>{label}</Text>
      </View>
      <Text style={[styles.statValue, { color }, isText && styles.statValueText]}>
        {loading ? '...' : value}
      </Text>
      {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: 40
  },
  container: {
    gap: 28
  },
  
  // Hero
  heroCard: {
    padding: 28,
    borderRadius: 24,
    backgroundColor: colors.dark.card,
    borderWidth: 1,
    borderColor: colors.dark.border
  },
  heroContent: {
    marginBottom: 20
  },
  heroGreeting: {
    fontFamily: typography.fonts.regular,
    fontSize: typography.sizes.base,
    color: colors.dark.textSecondary
  },
  heroTitle: {
    ...typography.styles.h1,
    color: colors.dark.text,
    marginTop: 4
  },
  heroSubtitle: {
    marginTop: 12,
    fontFamily: typography.fonts.regular,
    fontSize: typography.sizes.base,
    color: colors.dark.textSecondary,
    lineHeight: 24
  },
  operatorBadge: {
    marginTop: 16,
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: colors.dark.primary + '20'
  },
  operatorBadgeText: {
    fontFamily: typography.fonts.semibold,
    fontSize: typography.sizes.sm,
    color: colors.dark.primary,
    textTransform: 'uppercase',
    letterSpacing: 1
  },
  heroActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12
  },
  primaryButton: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 999,
    backgroundColor: colors.dark.primary
  },
  primaryButtonText: {
    fontFamily: typography.fonts.semibold,
    fontSize: typography.sizes.sm,
    color: colors.dark.background,
    textTransform: 'uppercase',
    letterSpacing: 0.8
  },
  secondaryButton: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.dark.border,
    backgroundColor: 'transparent'
  },
  secondaryButtonText: {
    fontFamily: typography.fonts.semibold,
    fontSize: typography.sizes.sm,
    color: colors.dark.text
  },

  // Sections
  section: {
    gap: 16
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8
  },
  sectionTitle: {
    fontFamily: typography.fonts.extrabold,
    fontSize: typography.sizes.xl,
    color: colors.dark.text
  },
  sectionHint: {
    fontFamily: typography.fonts.regular,
    fontSize: typography.sizes.sm,
    color: colors.dark.textSecondary
  },
  sectionLink: {
    fontFamily: typography.fonts.semibold,
    fontSize: typography.sizes.sm,
    color: colors.dark.primary
  },

  // Stats Grid
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12
  },
  statsGridWide: {
    gap: 16
  },
  statCard: {
    flexBasis: '47%',
    flexGrow: 0,
    flexShrink: 0,
    minWidth: 150,
    maxWidth: 200,
    padding: 18,
    borderRadius: 18,
    backgroundColor: colors.dark.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.dark.border
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12
  },
  statIcon: {
    fontSize: 18
  },
  statLabel: {
    fontFamily: typography.fonts.regular,
    fontSize: typography.sizes.sm,
    color: colors.dark.textSecondary
  },
  statValue: {
    fontFamily: typography.fonts.extrabold,
    fontSize: typography.sizes['3xl'],
    color: colors.dark.text
  },
  statValueText: {
    fontSize: typography.sizes['2xl']
  },
  statSubtitle: {
    marginTop: 4,
    fontFamily: typography.fonts.regular,
    fontSize: typography.sizes.xs,
    color: colors.dark.textSecondary
  },

  // Revenue Chart
  chartContainer: {
    marginTop: 16,
    padding: 16,
    backgroundColor: colors.dark.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.dark.border
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    flexWrap: 'wrap',
    gap: 12
  },
  chartTitle: {
    fontFamily: typography.fonts.semibold,
    fontSize: typography.sizes.base,
    color: colors.dark.text
  },
  chartPeriodSelector: {
    flexDirection: 'row',
    gap: 8
  },
  periodButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: colors.dark.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.dark.border
  },
  periodButtonActive: {
    backgroundColor: colors.dark.primary,
    borderColor: colors.dark.primary
  },
  periodButtonText: {
    fontFamily: typography.fonts.medium,
    fontSize: typography.sizes.xs,
    color: colors.dark.textSecondary
  },
  periodButtonTextActive: {
    color: colors.dark.background
  },
  chartLoading: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center'
  },
  chartLoadingText: {
    fontFamily: typography.fonts.regular,
    fontSize: typography.sizes.sm,
    color: colors.dark.textSecondary
  },
  chartContent: {
    gap: 12
  },
  chartBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 180,
    gap: 4
  },
  chartBarContainer: {
    flex: 1,
    alignItems: 'center',
    height: '100%',
    justifyContent: 'flex-end'
  },
  chartBarValue: {
    fontFamily: typography.fonts.medium,
    fontSize: 9,
    color: colors.dark.textSecondary,
    marginBottom: 4,
    textAlign: 'center'
  },
  chartBarWrapper: {
    width: '80%',
    height: '70%',
    justifyContent: 'flex-end',
    alignItems: 'center'
  },
  chartBar: {
    width: '100%',
    backgroundColor: colors.dark.primary,
    borderRadius: 4,
    minHeight: 4
  },
  chartBarLabel: {
    fontFamily: typography.fonts.regular,
    fontSize: 9,
    color: colors.dark.textSecondary,
    marginTop: 6,
    textAlign: 'center',
    width: '100%'
  },
  chartSummary: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.dark.border,
    alignItems: 'center'
  },
  chartSummaryText: {
    fontFamily: typography.fonts.medium,
    fontSize: typography.sizes.sm,
    color: colors.dark.textSecondary
  },
  chartEmpty: {
    height: 150,
    justifyContent: 'center',
    alignItems: 'center'
  },
  chartEmptyText: {
    fontFamily: typography.fonts.regular,
    fontSize: typography.sizes.sm,
    color: colors.dark.textSecondary
  },

  // Revenue Table
  revenueTable: {
    marginTop: 16,
    padding: 16,
    backgroundColor: colors.dark.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.dark.border
  },
  tableTitle: {
    fontFamily: typography.fonts.semibold,
    fontSize: typography.sizes.base,
    color: colors.dark.text,
    marginBottom: 12
  },
  tableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.dark.border
  },
  tableLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10
  },
  tableRight: {
    alignItems: 'flex-end'
  },
  tableRank: {
    fontFamily: typography.fonts.medium,
    fontSize: typography.sizes.sm,
    color: colors.dark.textSecondary,
    width: 28
  },
  tableName: {
    fontFamily: typography.fonts.medium,
    fontSize: typography.sizes.sm,
    color: colors.dark.text,
    flex: 1
  },
  tableCommission: {
    fontFamily: typography.fonts.regular,
    fontSize: typography.sizes.xs,
    color: colors.dark.textSecondary
  },
  tableAmount: {
    fontFamily: typography.fonts.bold,
    fontSize: typography.sizes.base,
    color: '#10b981'
  },
  tableBookings: {
    fontFamily: typography.fonts.regular,
    fontSize: typography.sizes.xs,
    color: colors.dark.textSecondary
  },
  tableShare: {
    fontFamily: typography.fonts.regular,
    fontSize: typography.sizes.xs,
    color: colors.dark.textSecondary
  },

  // View All Button
  viewAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 6
  },
  viewAllText: {
    fontFamily: typography.fonts.medium,
    fontSize: typography.sizes.sm,
    color: colors.dark.primary
  },

  // Price Card
  priceCard: {
    flexDirection: 'row',
    padding: 20,
    borderRadius: 18,
    backgroundColor: colors.dark.card,
    borderWidth: 1,
    borderColor: colors.dark.border,
    justifyContent: 'space-around',
    alignItems: 'center'
  },
  priceItem: {
    alignItems: 'center',
    gap: 6
  },
  priceLabel: {
    fontFamily: typography.fonts.regular,
    fontSize: typography.sizes.sm,
    color: colors.dark.textSecondary
  },
  priceValue: {
    fontFamily: typography.fonts.extrabold,
    fontSize: typography.sizes['2xl'],
    color: colors.dark.text
  },
  priceValueHighlight: {
    color: colors.dark.primary
  },
  priceDivider: {
    width: 1,
    height: 40,
    backgroundColor: colors.dark.border
  },

  // Columns (Categories & Locations)
  columnsContainer: {
    gap: 16
  },
  columnsContainerWide: {
    flexDirection: 'row'
  },
  columnCard: {
    flex: 1,
    padding: 20,
    borderRadius: 18,
    backgroundColor: colors.dark.card,
    borderWidth: 1,
    borderColor: colors.dark.border
  },
  columnCardHalf: {
    flex: 1
  },
  columnTitle: {
    fontFamily: typography.fonts.semibold,
    fontSize: typography.sizes.lg,
    color: colors.dark.text,
    marginBottom: 16
  },
  listItems: {
    gap: 12
  },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  listItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  listItemRank: {
    fontFamily: typography.fonts.semibold,
    fontSize: typography.sizes.sm,
    color: colors.dark.textSecondary,
    width: 24
  },
  listItemName: {
    fontFamily: typography.fonts.regular,
    fontSize: typography.sizes.base,
    color: colors.dark.text
  },
  listItemBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: colors.dark.backgroundSecondary
  },
  listItemCount: {
    fontFamily: typography.fonts.semibold,
    fontSize: typography.sizes.sm,
    color: colors.dark.primary
  },

  // Recent Experiences
  recentList: {
    gap: 8
  },
  recentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 14,
    backgroundColor: colors.dark.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.dark.border
  },
  recentInfo: {
    flex: 1,
    marginRight: 12
  },
  recentTitle: {
    fontFamily: typography.fonts.semibold,
    fontSize: typography.sizes.base,
    color: colors.dark.text
  },
  recentMeta: {
    marginTop: 4,
    fontFamily: typography.fonts.regular,
    fontSize: typography.sizes.sm,
    color: colors.dark.textSecondary
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5
  },
  statusDotActive: {
    backgroundColor: '#22c55e'
  },
  statusDotInactive: {
    backgroundColor: '#ef4444'
  },

  // Quick Actions
  actionsGrid: {
    gap: 12
  },
  actionsGridWide: {
    flexDirection: 'row'
  },
  actionCard: {
    flex: 1,
    padding: 20,
    borderRadius: 18,
    backgroundColor: colors.dark.card,
    borderWidth: 1,
    borderColor: colors.dark.border
  },
  actionIcon: {
    fontSize: 28,
    marginBottom: 12
  },
  actionLabel: {
    fontFamily: typography.fonts.semibold,
    fontSize: typography.sizes.base,
    color: colors.dark.text
  },
  actionHint: {
    marginTop: 6,
    fontFamily: typography.fonts.regular,
    fontSize: typography.sizes.sm,
    color: colors.dark.textSecondary
  },

  // Error
  errorCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    backgroundColor: 'rgba(239, 68, 68, 0.1)'
  },
  errorTitle: {
    fontFamily: typography.fonts.semibold,
    fontSize: typography.sizes.base,
    color: '#ef4444'
  },
  errorMessage: {
    marginTop: 4,
    fontFamily: typography.fonts.regular,
    fontSize: typography.sizes.sm,
    color: colors.dark.textSecondary
  }
});
