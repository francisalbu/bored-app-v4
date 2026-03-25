import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Linking,
  Platform,
  Modal,
  Pressable,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';

// Calendar date picker component
const CalendarPicker = ({ 
  visible, 
  onClose, 
  onSelectDate, 
  selectedDate,
  title 
}: {
  visible: boolean;
  onClose: () => void;
  onSelectDate: (date: string) => void;
  selectedDate: string;
  title: string;
}) => {
  const [currentMonth, setCurrentMonth] = useState(() => {
    if (selectedDate) {
      const [year, month] = selectedDate.split('-').map(Number);
      return new Date(year, month - 1, 1);
    }
    return new Date();
  });

  const daysInMonth = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startPadding = firstDay.getDay();
    
    const days: Array<{ date: Date | null; day: number }> = [];
    
    // Add padding for days before the first day of month
    for (let i = 0; i < startPadding; i++) {
      days.push({ date: null, day: 0 });
    }
    
    // Add all days in the month
    for (let d = 1; d <= lastDay.getDate(); d++) {
      days.push({ date: new Date(year, month, d), day: d });
    }
    
    return days;
  }, [currentMonth]);

  const formatDateString = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                      'July', 'August', 'September', 'October', 'November', 'December'];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const goToPrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const handleDateSelect = (date: Date) => {
    onSelectDate(formatDateString(date));
    onClose();
  };

  const isSelected = (date: Date | null): boolean => {
    if (!date || !selectedDate) return false;
    return formatDateString(date) === selectedDate;
  };

  const isToday = (date: Date | null): boolean => {
    if (!date) return false;
    const today = new Date();
    return date.getDate() === today.getDate() && 
           date.getMonth() === today.getMonth() && 
           date.getFullYear() === today.getFullYear();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={calendarStyles.overlay} onPress={onClose}>
        <Pressable style={calendarStyles.container} onPress={(e) => e.stopPropagation()}>
          <View style={calendarStyles.header}>
            <Text style={calendarStyles.title}>{title}</Text>
            <TouchableOpacity onPress={onClose}>
              <MaterialIcons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <View style={calendarStyles.monthNav}>
            <TouchableOpacity onPress={goToPrevMonth} style={calendarStyles.navBtn}>
              <MaterialIcons name="chevron-left" size={28} color="#CFFF04" />
            </TouchableOpacity>
            <Text style={calendarStyles.monthText}>
              {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </Text>
            <TouchableOpacity onPress={goToNextMonth} style={calendarStyles.navBtn}>
              <MaterialIcons name="chevron-right" size={28} color="#CFFF04" />
            </TouchableOpacity>
          </View>

          <View style={calendarStyles.daysHeader}>
            {dayNames.map((day) => (
              <Text key={day} style={calendarStyles.dayName}>{day}</Text>
            ))}
          </View>

          <View style={calendarStyles.daysGrid}>
            {daysInMonth.map((item, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  calendarStyles.dayCell,
                  isSelected(item.date) && calendarStyles.dayCellSelected,
                  isToday(item.date) && calendarStyles.dayCellToday,
                ]}
                onPress={() => item.date && handleDateSelect(item.date)}
                disabled={!item.date}
              >
                <Text style={[
                  calendarStyles.dayText,
                  !item.date && calendarStyles.dayTextEmpty,
                  isSelected(item.date) && calendarStyles.dayTextSelected,
                  isToday(item.date) && !isSelected(item.date) && calendarStyles.dayTextToday,
                ]}>
                  {item.day > 0 ? item.day : ''}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={calendarStyles.footer}>
            <TouchableOpacity 
              style={calendarStyles.clearBtn} 
              onPress={() => { onSelectDate(''); onClose(); }}
            >
              <Text style={calendarStyles.clearBtnText}>Clear</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={calendarStyles.todayBtn} 
              onPress={() => handleDateSelect(new Date())}
            >
              <Text style={calendarStyles.todayBtnText}>Today</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const calendarStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    backgroundColor: '#0a0a0a',
    borderRadius: 16,
    padding: 20,
    width: '90%',
    maxWidth: 360,
    borderWidth: 1,
    borderColor: '#1a1a1a',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  monthNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  navBtn: {
    padding: 4,
  },
  monthText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  daysHeader: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  dayName: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  dayCellSelected: {
    backgroundColor: '#CFFF04',
  },
  dayCellToday: {
    borderWidth: 1,
    borderColor: '#CFFF04',
  },
  dayText: {
    fontSize: 14,
    color: '#FFFFFF',
  },
  dayTextEmpty: {
    color: 'transparent',
  },
  dayTextSelected: {
    color: '#0a0a0a',
    fontWeight: '600',
  },
  dayTextToday: {
    color: '#CFFF04',
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#1a1a1a',
  },
  clearBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#6B7280',
  },
  clearBtnText: {
    color: '#6B7280',
    fontWeight: '500',
  },
  todayBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#CFFF04',
  },
  todayBtnText: {
    color: '#0a0a0a',
    fontWeight: '600',
  },
});

interface ConversionData {
  experiences: Array<{
    id: number;
    title: string;
    location: string;
    views: number;
    bookings: number;
    conversionRate: number;
    operator: string;
  }>;
  summary: {
    totalViews: number;
    totalBookings: number;
    overallConversionRate: number;
  };
}

interface DemographicsData {
  summary: {
    uniqueCustomers: number;
    totalBookings: number;
    totalParticipants: number;
    avgGroupSize: number;
    repeatCustomers: number;
    repeatRate: number;
  };
  valueDistribution: Record<string, number>;
  groupSizeDistribution: Record<string, number>;
  topCustomers: Array<{
    email: string;
    name: string;
    bookings: number;
    totalSpent: number;
  }>;
}

interface HeatmapData {
  dayDistribution: Array<{ name: string; count: number }>;
  hourDistribution: Array<{ hour: number; label: string; count: number }>;
  monthDistribution: Array<{ name: string; count: number }>;
  heatmap: number[][];
  peaks: {
    day: string;
    hour: string;
    month: string;
  };
  totalBookings: number;
}

interface ForecastData {
  historical: Array<{ month: string; revenue: number; bookings: number }>;
  forecast: Array<{ month: string; predictedRevenue: number; confidence: number }>;
  summary: {
    totalRevenue: number;
    avgMonthlyRevenue: number;
    lastMonthRevenue: number;
    monthOverMonthGrowth: number;
    currency: string;
  };
}

interface CompareData {
  experiences: Array<{
    id: number;
    title: string;
    location: string;
    price: number;
    isActive: boolean;
    operator: string;
    metrics: {
      views: number;
      bookings: number;
      revenue: number;
      participants: number;
      conversionRate: number;
      avgBookingValue: number;
    };
  }>;
  benchmarks: {
    avgViews: number;
    avgBookings: number;
    avgRevenue: number;
    avgConversionRate: number;
  };
  topPerformers: {
    byRevenue: any;
    byBookings: any;
    byConversion: any;
  };
}

type TabType = 'conversions' | 'demographics' | 'heatmap' | 'forecast' | 'compare';

export default function AnalyticsPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('conversions');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [showFromCalendar, setShowFromCalendar] = useState(false);
  const [showToCalendar, setShowToCalendar] = useState(false);

  // Data states
  const [conversionData, setConversionData] = useState<ConversionData | null>(null);
  const [demographicsData, setDemographicsData] = useState<DemographicsData | null>(null);
  const [heatmapData, setHeatmapData] = useState<HeatmapData | null>(null);
  const [forecastData, setForecastData] = useState<ForecastData | null>(null);
  const [compareData, setCompareData] = useState<CompareData | null>(null);

  useEffect(() => {
    if (isAuthenticated && user) {
      loadData();
    }
  }, [isAuthenticated, user, activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      const filters = { from_date: fromDate || undefined, to_date: toDate || undefined };

      switch (activeTab) {
        case 'conversions':
          const convRes = await api.getAnalyticsConversions(filters);
          if (convRes.success) setConversionData(convRes.data as ConversionData);
          break;
        case 'demographics':
          const demoRes = await api.getAnalyticsDemographics();
          if (demoRes.success) setDemographicsData(demoRes.data as DemographicsData);
          break;
        case 'heatmap':
          const heatRes = await api.getAnalyticsHeatmap();
          if (heatRes.success) setHeatmapData(heatRes.data as HeatmapData);
          break;
        case 'forecast':
          const foreRes = await api.getAnalyticsForecast();
          if (foreRes.success) setForecastData(foreRes.data as ForecastData);
          break;
        case 'compare':
          const compRes = await api.getAnalyticsCompare(filters);
          if (compRes.success) setCompareData(compRes.data as CompareData);
          break;
      }
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleExport = async (type: 'bookings' | 'revenue' | 'experiences') => {
    const url = await api.exportAnalytics(type, { from_date: fromDate, to_date: toDate });
    if (Platform.OS === 'web') {
      window.open(url, '_blank');
    } else {
      Linking.openURL(url);
    }
  };

  const tabs: { key: TabType; label: string; icon: string }[] = [
    { key: 'conversions', label: 'Conversions', icon: 'trending-up' },
    { key: 'demographics', label: 'Demographics', icon: 'people' },
    { key: 'heatmap', label: 'Peak Times', icon: 'schedule' },
    { key: 'forecast', label: 'Forecast', icon: 'show-chart' },
    { key: 'compare', label: 'Compare', icon: 'compare' },
  ];

  const renderConversions = () => {
    if (!conversionData) return null;
    const { experiences, summary } = conversionData;

    return (
      <View>
        {/* Summary Cards */}
        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{summary.totalViews.toLocaleString()}</Text>
            <Text style={styles.summaryLabel}>Total Views</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{summary.totalBookings}</Text>
            <Text style={styles.summaryLabel}>Total Bookings</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={[styles.summaryValue, { color: '#CFFF04' }]}>
              {summary.totalViews > 0 ? `${summary.overallConversionRate}%` : '0%'}
            </Text>
            <Text style={styles.summaryLabel}>Conversion Rate</Text>
          </View>
        </View>

        {/* Experiences Table */}
        <View style={styles.tableContainer}>
          <Text style={styles.sectionTitle}>Experience Performance</Text>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Experience</Text>
            <Text style={styles.tableHeaderCell}>Views</Text>
            <Text style={styles.tableHeaderCell}>Bookings</Text>
            <Text style={styles.tableHeaderCell}>Conv %</Text>
          </View>
          {experiences.map((exp, idx) => (
            <View key={exp.id} style={[styles.tableRow, idx % 2 === 0 ? styles.tableRowEven : null]}>
              <View style={{ flex: 2 }}>
                <Text style={styles.tableCell} numberOfLines={1}>{exp.title}</Text>
                <Text style={styles.tableCellSub}>{exp.location}</Text>
              </View>
              <Text style={styles.tableCell}>{exp.views}</Text>
              <Text style={styles.tableCell}>{exp.bookings}</Text>
              <View style={styles.conversionBadge}>
                <Text style={[
                  styles.conversionText, 
                  exp.conversionRate >= 5 ? styles.convHigh : 
                    exp.conversionRate >= 2 ? styles.convMed : styles.convLow
                ]}>
                  {exp.conversionRate}%
                </Text>
              </View>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderDemographics = () => {
    if (!demographicsData) return null;
    const { summary, valueDistribution, groupSizeDistribution, topCustomers } = demographicsData;

    return (
      <View>
        {/* Summary Cards */}
        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{summary.uniqueCustomers}</Text>
            <Text style={styles.summaryLabel}>Unique Customers</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{summary.avgGroupSize}</Text>
            <Text style={styles.summaryLabel}>Avg Group Size</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={[styles.summaryValue, { color: '#CFFF04' }]}>{summary.repeatRate}%</Text>
            <Text style={styles.summaryLabel}>Repeat Rate</Text>
          </View>
        </View>

        {/* Distribution Charts */}
        <View style={styles.distributionRow}>
          <View style={styles.distributionCard}>
            <Text style={styles.sectionTitle}>Booking Value</Text>
            {Object.entries(valueDistribution).map(([range, count]) => (
              <View key={range} style={styles.barRow}>
                <Text style={styles.barLabel}>{range}</Text>
                <View style={styles.barContainer}>
                  <View style={[styles.bar, { width: `${Math.min(100, (count / summary.totalBookings) * 100)}%` }]} />
                </View>
                <Text style={styles.barValue}>{count}</Text>
              </View>
            ))}
          </View>

          <View style={styles.distributionCard}>
            <Text style={styles.sectionTitle}>Group Size</Text>
            {Object.entries(groupSizeDistribution).map(([size, count]) => (
              <View key={size} style={styles.barRow}>
                <Text style={styles.barLabel}>{size}</Text>
                <View style={styles.barContainer}>
                  <View style={[styles.bar, styles.barPurple, { width: `${Math.min(100, (count / summary.totalBookings) * 100)}%` }]} />
                </View>
                <Text style={styles.barValue}>{count}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Top Customers */}
        <View style={styles.tableContainer}>
          <Text style={styles.sectionTitle}>Top Customers</Text>
          {topCustomers.map((customer, idx) => (
            <View key={customer.email} style={[styles.customerRow, idx % 2 === 0 ? styles.tableRowEven : null]}>
              <View style={styles.customerRank}>
                <Text style={styles.rankText}>{idx + 1}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.customerName}>{customer.name}</Text>
                <Text style={styles.customerEmail}>{customer.email}</Text>
              </View>
              <View style={styles.customerStats}>
                <Text style={styles.customerBookings}>{customer.bookings} bookings</Text>
                <Text style={styles.customerSpent}>€{customer.totalSpent.toLocaleString()}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderHeatmap = () => {
    if (!heatmapData) return null;
    const { dayDistribution, hourDistribution, monthDistribution, peaks, heatmap } = heatmapData;

    const maxDayCount = Math.max(...dayDistribution.map(d => d.count), 1);
    const maxHourCount = Math.max(...hourDistribution.map(h => h.count), 1);
    const maxMonthCount = Math.max(...monthDistribution.map(m => m.count), 1);

    return (
      <View>
        {/* Peak Summary */}
        <View style={styles.peakCards}>
          <View style={[styles.peakCard, { backgroundColor: '#1a1a1a' }]}>
            <MaterialIcons name="today" size={24} color="#CFFF04" />
            <Text style={styles.peakLabel}>Peak Day</Text>
            <Text style={styles.peakValue}>{peaks.day}</Text>
          </View>
          <View style={[styles.peakCard, { backgroundColor: '#1a1a1a' }]}>
            <MaterialIcons name="schedule" size={24} color="#CFFF04" />
            <Text style={styles.peakLabel}>Peak Hour</Text>
            <Text style={styles.peakValue}>{peaks.hour}</Text>
          </View>
          <View style={[styles.peakCard, { backgroundColor: '#1a1a1a' }]}>
            <MaterialIcons name="event" size={24} color="#CFFF04" />
            <Text style={styles.peakLabel}>Peak Month</Text>
            <Text style={styles.peakValue}>{peaks.month}</Text>
          </View>
        </View>

        {/* Day Distribution */}
        <View style={styles.chartContainer}>
          <Text style={styles.sectionTitle}>Bookings by Day of Week</Text>
          <View style={styles.horizontalChart}>
            {dayDistribution.map((day) => (
              <View key={day.name} style={styles.chartColumn}>
                <Text style={styles.chartValue}>{day.count}</Text>
                <View style={styles.chartBarTrack}>
                  <View style={[styles.chartBar, { height: `${(day.count / maxDayCount) * 100}%` }]} />
                </View>
                <Text style={styles.chartLabel}>{day.name.slice(0, 3)}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Hour Distribution */}
        <View style={styles.chartContainer}>
          <Text style={styles.sectionTitle}>Bookings by Hour</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.horizontalChartScroll}>
              {hourDistribution.filter((_, i) => i >= 8 && i <= 20).map((hour) => (
                <View key={hour.hour} style={styles.chartColumnCompact}>
                  <Text style={styles.chartValue}>{hour.count}</Text>
                  <View style={styles.chartBarTrack}>
                    <View style={[
                      styles.chartBar, 
                      styles.chartBarBlue, 
                      { height: `${(hour.count / maxHourCount) * 100}%` }
                    ]} />
                  </View>
                  <Text style={styles.chartLabel}>{hour.label}</Text>
                </View>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Month Distribution */}
        <View style={styles.chartContainer}>
          <Text style={styles.sectionTitle}>Bookings by Month</Text>
          <View style={styles.horizontalChart}>
            {monthDistribution.map((month) => (
              <View key={month.name} style={styles.chartColumn}>
                <Text style={styles.chartValue}>{month.count}</Text>
                <View style={styles.chartBarTrack}>
                  <View style={[
                    styles.chartBar, 
                    styles.chartBarGreen, 
                    { height: `${(month.count / maxMonthCount) * 100}%` }
                  ]} />
                </View>
                <Text style={styles.chartLabel}>{month.name}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    );
  };

  const renderForecast = () => {
    if (!forecastData) return null;
    const { historical, forecast, summary } = forecastData;

    const allData = [...historical, ...forecast.map(f => ({ month: f.month, revenue: f.predictedRevenue, isForecast: true }))];
    const maxRevenue = Math.max(...allData.map(d => d.revenue || 0), 1);

    return (
      <View>
        {/* Summary Cards */}
        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>€{summary.avgMonthlyRevenue.toLocaleString()}</Text>
            <Text style={styles.summaryLabel}>Avg Monthly</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>€{summary.lastMonthRevenue.toLocaleString()}</Text>
            <Text style={styles.summaryLabel}>Last Month</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={[styles.summaryValue, { color: summary.monthOverMonthGrowth >= 0 ? '#CFFF04' : '#EF4444' }]}>
              {summary.monthOverMonthGrowth >= 0 ? '+' : ''}{summary.monthOverMonthGrowth}%
            </Text>
            <Text style={styles.summaryLabel}>MoM Growth</Text>
          </View>
        </View>

        {/* Revenue Chart */}
        <View style={styles.chartContainer}>
          <Text style={styles.sectionTitle}>Revenue Trend & Forecast</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.revenueChart}>
              {allData.slice(-12).map((item: any, idx) => (
                <View key={item.month} style={styles.revenueColumn}>
                  <Text style={styles.revenueValue}>€{(item.revenue / 1000).toFixed(1)}k</Text>
                  <View 
                    style={[
                      styles.revenueBar, 
                      { height: `${(item.revenue / maxRevenue) * 100}%` },
                      item.isForecast && styles.forecastBar
                    ]} 
                  />
                  <Text style={styles.revenueLabel}>{item.month.slice(5)}</Text>
                </View>
              ))}
            </View>
          </ScrollView>
          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#CFFF04' }]} />
              <Text style={styles.legendText}>Historical</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#CFFF04' }]} />
              <Text style={styles.legendText}>Forecast</Text>
            </View>
          </View>
        </View>

        {/* Forecast Details */}
        {forecast.length > 0 && (
          <View style={styles.forecastDetails}>
            <Text style={styles.sectionTitle}>Revenue Forecast</Text>
            {forecast.map((f) => (
              <View key={f.month} style={styles.forecastRow}>
                <Text style={styles.forecastMonth}>{f.month}</Text>
                <Text style={styles.forecastRevenue}>€{f.predictedRevenue.toLocaleString()}</Text>
                <View style={styles.confidenceBadge}>
                  <Text style={styles.confidenceText}>{f.confidence}% confidence</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  const renderCompare = () => {
    if (!compareData) return null;
    const { experiences, benchmarks, topPerformers } = compareData;

    return (
      <View>
        {/* Benchmarks */}
        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{benchmarks.avgViews}</Text>
            <Text style={styles.summaryLabel}>Avg Views</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{benchmarks.avgBookings}</Text>
            <Text style={styles.summaryLabel}>Avg Bookings</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>€{benchmarks.avgRevenue}</Text>
            <Text style={styles.summaryLabel}>Avg Revenue</Text>
          </View>
        </View>

        {/* Top Performers */}
        <View style={styles.topPerformersRow}>
          {topPerformers.byRevenue && (
            <View style={[styles.topCard, { backgroundColor: '#1a1a1a' }]}>
              <MaterialIcons name="emoji-events" size={20} color="#CFFF04" />
              <Text style={styles.topLabel}>Top Revenue</Text>
              <Text style={styles.topTitle} numberOfLines={1}>{topPerformers.byRevenue.title}</Text>
              <Text style={styles.topValue}>€{topPerformers.byRevenue.metrics.revenue}</Text>
            </View>
          )}
          {topPerformers.byBookings && (
            <View style={[styles.topCard, { backgroundColor: '#1a1a1a' }]}>
              <MaterialIcons name="book-online" size={20} color="#CFFF04" />
              <Text style={styles.topLabel}>Most Bookings</Text>
              <Text style={styles.topTitle} numberOfLines={1}>{topPerformers.byBookings.title}</Text>
              <Text style={styles.topValue}>{topPerformers.byBookings.metrics.bookings} bookings</Text>
            </View>
          )}
          {topPerformers.byConversion && (
            <View style={[styles.topCard, { backgroundColor: '#1a1a1a' }]}>
              <MaterialIcons name="trending-up" size={20} color="#CFFF04" />
              <Text style={styles.topLabel}>Best Conversion</Text>
              <Text style={styles.topTitle} numberOfLines={1}>{topPerformers.byConversion.title}</Text>
              <Text style={styles.topValue}>{topPerformers.byConversion.metrics.conversionRate}%</Text>
            </View>
          )}
        </View>

        {/* Comparison Table */}
        <View style={styles.tableContainer}>
          <Text style={styles.sectionTitle}>All Experiences</Text>
          {experiences.map((exp, idx) => {
            const aboveAvg = exp.metrics.revenue > benchmarks.avgRevenue;
            return (
              <View key={exp.id} style={[styles.compareRow, idx % 2 === 0 ? styles.tableRowEven : null]}>
                <View style={{ flex: 2 }}>
                  <Text style={styles.tableCell} numberOfLines={1}>{exp.title}</Text>
                  <Text style={styles.tableCellSub}>{exp.location}</Text>
                </View>
                <View style={styles.metricsGrid}>
                  <View style={styles.metricItem}>
                    <Text style={styles.metricValue}>{exp.metrics.bookings}</Text>
                    <Text style={styles.metricLabel}>Book</Text>
                  </View>
                  <View style={styles.metricItem}>
                    <Text style={styles.metricValue}>€{exp.metrics.revenue}</Text>
                    <Text style={styles.metricLabel}>Rev</Text>
                  </View>
                  <View style={styles.metricItem}>
                    <Text style={styles.metricValue}>{exp.metrics.conversionRate}%</Text>
                    <Text style={styles.metricLabel}>Conv</Text>
                  </View>
                </View>
                <View style={[styles.performanceBadge, aboveAvg ? styles.badgeGreen : styles.badgeGray]}>
                  <MaterialIcons 
                    name={aboveAvg ? 'trending-up' : 'trending-flat'} 
                    size={14} 
                    color={aboveAvg ? '#CFFF04' : '#6B7280'} 
                  />
                </View>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Enhanced Analytics</Text>
        <View style={styles.exportButtons}>
          <TouchableOpacity style={styles.exportBtn} onPress={() => handleExport('bookings')}>
            <MaterialIcons name="file-download" size={16} color="#CFFF04" />
            <Text style={styles.exportBtnText}>Bookings</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.exportBtn} onPress={() => handleExport('revenue')}>
            <MaterialIcons name="file-download" size={16} color="#CFFF04" />
            <Text style={styles.exportBtnText}>Revenue</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.exportBtn} onPress={() => handleExport('experiences')}>
            <MaterialIcons name="file-download" size={16} color="#CFFF04" />
            <Text style={styles.exportBtnText}>Experiences</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabsContainer}
        contentContainerStyle={styles.tabsContent}
      >
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <MaterialIcons 
              name={tab.icon as any} 
              size={18} 
              color={activeTab === tab.key ? '#0a0a0a' : '#6B7280'} 
            />
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Date Filters */}
      {(activeTab === 'conversions' || activeTab === 'compare') && (
        <View style={styles.filterRow}>
          <TouchableOpacity 
            style={styles.datePickerBtn} 
            onPress={() => setShowFromCalendar(true)}
          >
            <MaterialIcons name="calendar-today" size={18} color="#CFFF04" />
            <Text style={styles.datePickerText}>
              {fromDate || 'From date'}
            </Text>
            {fromDate && (
              <TouchableOpacity onPress={() => setFromDate('')}>
                <MaterialIcons name="close" size={16} color="#6B7280" />
              </TouchableOpacity>
            )}
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.datePickerBtn} 
            onPress={() => setShowToCalendar(true)}
          >
            <MaterialIcons name="calendar-today" size={18} color="#CFFF04" />
            <Text style={styles.datePickerText}>
              {toDate || 'To date'}
            </Text>
            {toDate && (
              <TouchableOpacity onPress={() => setToDate('')}>
                <MaterialIcons name="close" size={16} color="#6B7280" />
              </TouchableOpacity>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.filterBtn} onPress={loadData}>
            <MaterialIcons name="filter-list" size={18} color="#0a0a0a" />
            <Text style={styles.filterBtnText}>Apply</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Calendar Modals */}
      <CalendarPicker
        visible={showFromCalendar}
        onClose={() => setShowFromCalendar(false)}
        onSelectDate={setFromDate}
        selectedDate={fromDate}
        title="Select Start Date"
      />
      <CalendarPicker
        visible={showToCalendar}
        onClose={() => setShowToCalendar(false)}
        onSelectDate={setToDate}
        selectedDate={toDate}
        title="Select End Date"
      />

      {/* Content */}
      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#CFFF04" />
            <Text style={styles.loadingText}>Loading analytics...</Text>
          </View>
        ) : (
          <>
            {activeTab === 'conversions' && renderConversions()}
            {activeTab === 'demographics' && renderDemographics()}
            {activeTab === 'heatmap' && renderHeatmap()}
            {activeTab === 'forecast' && renderForecast()}
            {activeTab === 'compare' && renderCompare()}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#0a0a0a',
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  exportButtons: {
    flexDirection: 'row',
    gap: 6,
  },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#CFFF04',
  },
  exportBtnText: {
    fontSize: 11,
    color: '#CFFF04',
  },
  tabsContainer: {
    backgroundColor: '#0a0a0a',
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
    height: 48,
    minHeight: 48,
    maxHeight: 48,
    flex: 0,
    flexGrow: 0,
    flexShrink: 0,
  },
  tabsContent: {
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 0,
    marginRight: 6,
    borderRadius: 20,
    backgroundColor: '#000000',
    height: 38,
  },
  tabActive: {
    backgroundColor: '#CFFF04',
  },
  tabText: {
    fontSize: 13,
    color: '#6B7280',
  },
  tabTextActive: {
    color: '#0a0a0a',
    fontWeight: '600',
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 10,
    backgroundColor: '#0a0a0a',
  },
  datePickerBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#1a1a1a',
    borderRadius: 6,
    backgroundColor: '#000000',
  },
  datePickerText: {
    flex: 1,
    fontSize: 13,
    color: '#FFFFFF',
  },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#CFFF04',
    borderRadius: 6,
  },
  filterBtnText: {
    color: '#0a0a0a',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    color: '#6B7280',
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  summaryLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  tableContainer: {
    backgroundColor: '#0a0a0a',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  tableHeader: {
    flexDirection: 'row',
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
    marginBottom: 6,
  },
  tableHeaderCell: {
    flex: 1,
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  tableRowEven: {
    backgroundColor: '#0a0a0a',
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  tableCell: {
    flex: 1,
    fontSize: 13,
    color: '#FFFFFF',
  },
  tableCellSub: {
    fontSize: 11,
    color: '#6B7280',
  },
  conversionBadge: {
    flex: 1,
    alignItems: 'center',
  },
  conversionText: {
    fontSize: 11,
    fontWeight: '600',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  convHigh: {
    backgroundColor: '#1a1a1a',
    color: '#CFFF04',
  },
  convMed: {
    backgroundColor: '#1a1a1a',
    color: '#CFFF04',
  },
  convLow: {
    backgroundColor: '#450a0a',
    color: '#EF4444',
  },
  convNA: {
    backgroundColor: '#1a1a1a',
    color: '#6B7280',
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#1a1a0a',
    borderWidth: 1,
    borderColor: '#CFFF04',
    borderRadius: 6,
    padding: 10,
    marginBottom: 12,
  },
  warningText: {
    flex: 1,
    color: '#CFFF04',
    fontSize: 12,
    lineHeight: 16,
  },
  distributionRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  distributionCard: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    padding: 12,
    borderRadius: 10,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  barLabel: {
    width: 72,
    fontSize: 11,
    color: '#FFFFFF',
  },
  barContainer: {
    flex: 1,
    height: 10,
    backgroundColor: '#1a1a1a',
    borderRadius: 5,
    marginHorizontal: 6,
  },
  bar: {
    height: '100%',
    backgroundColor: '#CFFF04',
    borderRadius: 5,
  },
  barPurple: {
    backgroundColor: '#CFFF04',
  },
  barValue: {
    width: 28,
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'right',
  },
  customerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  customerRank: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#CFFF04',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  rankText: {
    color: '#0a0a0a',
    fontWeight: 'bold',
    fontSize: 11,
  },
  customerName: {
    fontSize: 13,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  customerEmail: {
    fontSize: 11,
    color: '#6B7280',
  },
  customerStats: {
    alignItems: 'flex-end',
  },
  customerBookings: {
    fontSize: 11,
    color: '#6B7280',
  },
  customerSpent: {
    fontSize: 13,
    fontWeight: '600',
    color: '#CFFF04',
  },
  peakCards: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  peakCard: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  peakLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 4,
  },
  peakValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 2,
  },
  chartContainer: {
    backgroundColor: '#0a0a0a',
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
  },
  horizontalChart: {
    flexDirection: 'row',
    height: 150,
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 10,
    paddingVertical: 4,
  },
  horizontalChartScroll: {
    flexDirection: 'row',
    height: 150,
    alignItems: 'flex-end',
    gap: 10,
    paddingVertical: 4,
    paddingRight: 6,
  },
  chartColumn: {
    alignItems: 'center',
    flex: 1,
    minWidth: 44,
  },
  chartColumnCompact: {
    alignItems: 'center',
    width: 44,
  },
  chartValue: {
    fontSize: 10,
    color: '#6B7280',
    marginBottom: 6,
  },
  chartBarTrack: {
    width: 24,
    height: 96,
    backgroundColor: '#111111',
    borderRadius: 6,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  chartBar: {
    width: '100%',
    backgroundColor: '#CFFF04',
    borderRadius: 6,
    minHeight: 8,
  },
  chartBarBlue: {
    backgroundColor: '#CFFF04',
  },
  chartBarGreen: {
    backgroundColor: '#CFFF04',
  },
  chartLabel: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 6,
  },
  revenueChart: {
    flexDirection: 'row',
    height: 140,
    alignItems: 'flex-end',
    gap: 6,
  },
  revenueColumn: {
    alignItems: 'center',
    width: 42,
  },
  revenueValue: {
    fontSize: 8,
    color: '#6B7280',
    marginBottom: 4,
  },
  revenueBar: {
    width: 24,
    backgroundColor: '#CFFF04',
    borderRadius: 4,
    minHeight: 4,
  },
  forecastBar: {
    backgroundColor: '#CFFF04',
  },
  revenueLabel: {
    fontSize: 9,
    color: '#6B7280',
    marginTop: 4,
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 14,
    marginTop: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 11,
    color: '#6B7280',
  },
  forecastDetails: {
    backgroundColor: '#0a0a0a',
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
  },
  forecastRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  forecastMonth: {
    flex: 1,
    fontSize: 13,
    color: '#FFFFFF',
  },
  forecastRevenue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#CFFF04',
    marginRight: 8,
  },
  confidenceBadge: {
    backgroundColor: '#1a1a1a',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  confidenceText: {
    fontSize: 10,
    color: '#CFFF04',
  },
  topPerformersRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  topCard: {
    flex: 1,
    padding: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  topLabel: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 4,
  },
  topTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 2,
    textAlign: 'center',
  },
  topValue: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 2,
  },
  compareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  metricItem: {
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  metricLabel: {
    fontSize: 9,
    color: '#6B7280',
  },
  performanceBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 6,
  },
  badgeGreen: {
    backgroundColor: '#1a1a1a',
  },
  badgeGray: {
    backgroundColor: '#000000',
  },
});
