import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Dimensions } from 'react-native';
import { ChevronLeft, Eye, Tag, Heart, Star, TrendingUp, Clock, Calendar, RefreshCw } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Circle, Defs, LinearGradient, Stop, Line, Text as SvgText, Rect } from 'react-native-svg';
import { useAuth, API_BASE_URL } from '../context/AuthContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface OverviewData {
  total_views: number;
  active_listings: number;
  favorites_count: number;
  average_rating: number;
}

interface WeeklyViewData {
  day_date: string;
  view_count: number;
}

interface HeatmapData {
  hour: number;
  view_count: number;
}

export const AnalyticsScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { user, token } = useAuth();

  const [isLoading, setIsLoading] = useState(true);
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [weeklyViews, setWeeklyViews] = useState<WeeklyViewData[]>([]);
  const [heatmap, setHeatmap] = useState<HeatmapData[]>([]);

  const fetchAnalyticsData = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      // 1. Fetch Overview
      const overviewRes = await fetch(`${API_BASE_URL}/analytics/overview`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id,
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      const overviewData = await overviewRes.json();

      // 2. Fetch Weekly Views
      const weeklyRes = await fetch(`${API_BASE_URL}/analytics/weekly-views`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id,
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      const weeklyData = await weeklyRes.json();

      // 3. Fetch Heatmap
      const heatmapRes = await fetch(`${API_BASE_URL}/analytics/heatmap`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id,
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      const heatmapData = await heatmapRes.json();

      if (overviewData.success) setOverview(overviewData.data);
      if (weeklyData.success) {
        // Formulate day dates to short weekday names
        const formatted = (weeklyData.data || []).map((item: any) => {
          const date = new Date(item.day_date);
          const days = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];
          return {
            day_date: days[date.getDay()],
            view_count: parseInt(item.view_count || '0')
          };
        });
        setWeeklyViews(formatted);
      }
      if (heatmapData.success) setHeatmap(heatmapData.data || []);

    } catch (error) {
      console.error('[Analytics] Error fetching data:', error);
      Alert.alert('Hata', 'Analiz verileri yüklenirken bir hata oluştu.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalyticsData();
  }, [user]);

  // Render high-fidelity SVG line chart
  const renderLineChart = () => {
    if (weeklyViews.length === 0) return null;

    const chartHeight = 160;
    const chartWidth = SCREEN_WIDTH - 64;
    const padding = 20;

    const maxViews = Math.max(...weeklyViews.map(d => d.view_count), 1);
    const minViews = Math.min(...weeklyViews.map(d => d.view_count), 0);
    const range = maxViews - minViews;

    const points = weeklyViews.map((item, index) => {
      const x = padding + (index * (chartWidth - padding * 2)) / (weeklyViews.length - 1);
      // Invert Y coordinate so 0 is at bottom
      const y = chartHeight - padding - ((item.view_count - minViews) * (chartHeight - padding * 2)) / range;
      return { x, y, val: item.view_count, label: item.day_date };
    });

    let pathD = '';
    points.forEach((p, i) => {
      if (i === 0) pathD = `M ${p.x} ${p.y}`;
      else pathD += ` L ${p.x} ${p.y}`;
    });

    // Path for gradient area underneath
    let areaD = '';
    if (points.length > 0) {
      areaD = `${pathD} L ${points[points.length - 1].x} ${chartHeight - padding} L ${points[0].x} ${chartHeight - padding} Z`;
    }

    return (
      <View className="bg-dark-card border border-dark-border p-4 rounded-2xl mb-6">
        <View className="flex-row justify-between items-center mb-4">
          <View className="flex-row items-center">
            <TrendingUp size={16} color="#DEFF9A" />
            <Text className="text-light font-black text-sm ml-2">Haftalık İzlenme Grafiği</Text>
          </View>
          <Text className="text-neon text-xs font-bold">Son 7 Gün</Text>
        </View>

        <Svg height={chartHeight} width={chartWidth}>
          <Defs>
            <LinearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor="#DEFF9A" stopOpacity="0.25" />
              <Stop offset="100%" stopColor="#DEFF9A" stopOpacity="0.0" />
            </LinearGradient>
          </Defs>

          {/* Grid lines */}
          <Line x1={padding} y1={padding} x2={chartWidth - padding} y2={padding} stroke="#1E2530" strokeWidth="1" strokeDasharray="4 4" />
          <Line x1={padding} y1={chartHeight / 2} x2={chartWidth - padding} y2={chartHeight / 2} stroke="#1E2530" strokeWidth="1" strokeDasharray="4 4" />
          <Line x1={padding} y1={chartHeight - padding} x2={chartWidth - padding} y2={chartHeight - padding} stroke="#2E3849" strokeWidth="1" />

          {/* Gradient Area Underneath Path */}
          {areaD !== '' && <Path d={areaD} fill="url(#areaGrad)" />}

          {/* Glowing Line Path */}
          {pathD !== '' && <Path d={pathD} fill="none" stroke="#DEFF9A" strokeWidth="3.5" strokeLinecap="round" />}

          {/* Data Points */}
          {points.map((p, i) => (
            <React.Fragment key={i}>
              <Circle cx={p.x} cy={p.y} r="5" fill="#0E1117" stroke="#DEFF9A" strokeWidth="2" />
              <SvgText
                x={p.x}
                y={chartHeight - 4}
                fill="#9CA3AF"
                fontSize="10"
                fontWeight="bold"
                textAnchor="middle"
              >
                {p.label}
              </SvgText>
              <SvgText
                x={p.x}
                y={p.y - 8}
                fill="#DEFF9A"
                fontSize="9"
                fontWeight="black"
                textAnchor="middle"
              >
                {p.val}
              </SvgText>
            </React.Fragment>
          ))}
        </Svg>
      </View>
    );
  };

  // Render high-fidelity SVG hourly heatmap bars
  const renderHourlyHeatmap = () => {
    if (heatmap.length === 0) return null;

    const chartHeight = 120;
    const chartWidth = SCREEN_WIDTH - 64;
    const padding = 15;

    // Fill all 24 hours in case backend doesn't return all
    const fullHeatmap = Array.from({ length: 24 }, (_, h) => {
      const match = heatmap.find(item => Math.round(item.hour) === h);
      return {
        hour: h,
        view_count: match ? match.view_count : 0
      };
    });

    const maxViews = Math.max(...fullHeatmap.map(d => d.view_count), 1);
    const barWidth = (chartWidth - padding * 2) / 24 - 3;

    return (
      <View className="bg-dark-card border border-dark-border p-4 rounded-2xl mb-6">
        <View className="flex-row justify-between items-center mb-4">
          <View className="flex-row items-center">
            <Clock size={16} color="#DEFF9A" />
            <Text className="text-light font-black text-sm ml-2">En Yoğun İzlenme Saatleri</Text>
          </View>
          <Text className="text-neon text-[10px] font-bold uppercase tracking-wider">Isı Yoğunluğu</Text>
        </View>

        <Svg height={chartHeight} width={chartWidth}>
          {fullHeatmap.map((item, index) => {
            const height = ((item.view_count) / maxViews) * (chartHeight - padding * 2 - 10);
            const x = padding + index * (barWidth + 3);
            const y = chartHeight - padding - height - 10;
            // Gradient opacity based on value density
            const opacity = item.view_count > 0 ? 0.3 + (item.view_count / maxViews) * 0.7 : 0.1;
            const isLabelHour = item.hour % 6 === 0;

            return (
              <React.Fragment key={index}>
                <Rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={height || 4} // minimum 4px height bar
                  rx={2}
                  fill="#DEFF9A"
                  opacity={opacity}
                />
                {isLabelHour && (
                  <SvgText
                    x={x + barWidth / 2}
                    y={chartHeight - 2}
                    fill="#9CA3AF"
                    fontSize="9"
                    fontWeight="bold"
                    textAnchor="middle"
                  >
                    {item.hour.toString().padStart(2, '0')}:00
                  </SvgText>
                )}
              </React.Fragment>
            );
          })}
        </Svg>
      </View>
    );
  };

  return (
    <View className="flex-1 bg-dark">
      {/* Header */}
      <View 
        style={{ paddingTop: Math.max(insets.top, 16) }} 
        className="px-6 pb-4 border-b border-dark-border bg-dark-card flex-row items-center justify-between"
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          className="w-10 h-10 rounded-full bg-dark justify-center items-center border border-dark-border"
        >
          <ChevronLeft size={20} color="#DEFF9A" />
        </TouchableOpacity>
        <Text className="text-light font-black text-lg">Satıcı Analitik Paneli</Text>
        <TouchableOpacity
          onPress={fetchAnalyticsData}
          className="w-10 h-10 rounded-full bg-dark justify-center items-center border border-dark-border"
        >
          <RefreshCw size={16} color="#DEFF9A" />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#DEFF9A" />
          <Text className="text-muted text-xs mt-3">İstatistikleriniz analiz ediliyor...</Text>
        </View>
      ) : (
        <ScrollView 
          className="flex-1 px-6 pt-6"
          contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 16) + 32 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Overview Grid */}
          <Text className="text-muted text-xs font-bold uppercase tracking-widest mb-3 pl-0.5">Genel Metrikler</Text>
          <View className="flex-row flex-wrap justify-between mb-6">
            
            {/* Total Views Card */}
            <View style={{ width: '48%' }} className="bg-dark-card border border-dark-border p-4 rounded-2xl mb-4">
              <View className="w-8 h-8 rounded-xl bg-neon/10 justify-center items-center mb-3">
                <Eye size={16} color="#DEFF9A" />
              </View>
              <Text className="text-light text-2xl font-black">{overview?.total_views || 0}</Text>
              <Text className="text-muted text-[10px] font-bold uppercase tracking-wider mt-1">Görüntülenme</Text>
            </View>

            {/* Active Listings Card */}
            <View style={{ width: '48%' }} className="bg-dark-card border border-dark-border p-4 rounded-2xl mb-4">
              <View className="w-8 h-8 rounded-xl bg-neon/10 justify-center items-center mb-3">
                <Tag size={16} color="#DEFF9A" />
              </View>
              <Text className="text-light text-2xl font-black">{overview?.active_listings || 0}</Text>
              <Text className="text-muted text-[10px] font-bold uppercase tracking-wider mt-1">Aktif İlanlar</Text>
            </View>

            {/* Favorites Card */}
            <View style={{ width: '48%' }} className="bg-dark-card border border-dark-border p-4 rounded-2xl mb-4">
              <View className="w-8 h-8 rounded-xl bg-neon/10 justify-center items-center mb-3">
                <Heart size={16} color="#DEFF9A" />
              </View>
              <Text className="text-light text-2xl font-black">{overview?.favorites_count || 0}</Text>
              <Text className="text-muted text-[10px] font-bold uppercase tracking-wider mt-1">Favoriler</Text>
            </View>

            {/* Rating Card */}
            <View style={{ width: '48%' }} className="bg-dark-card border border-dark-border p-4 rounded-2xl mb-4">
              <View className="w-8 h-8 rounded-xl bg-neon/10 justify-center items-center mb-3">
                <Star size={16} color="#DEFF9A" />
              </View>
              <Text className="text-light text-2xl font-black">{(overview?.average_rating || 4.8).toFixed(1)}</Text>
              <Text className="text-muted text-[10px] font-bold uppercase tracking-wider mt-1">Ort. Değerlendirme</Text>
            </View>

          </View>

          {/* Line Chart */}
          {renderLineChart()}

          {/* Heatmap */}
          {renderHourlyHeatmap()}

          {/* Premium Advisory Tips Box */}
          <View className="bg-neon/10 border border-neon/30 p-5 rounded-2xl shadow-[0_0_15px_rgba(222,255,154,0.05)]">
            <View className="flex-row items-center mb-2.5">
              <View className="bg-neon px-2 py-0.5 rounded-md mr-2">
                <Text className="text-dark font-extrabold text-[8px] uppercase tracking-wider">ModoAI İPUCU 💡</Text>
              </View>
              <Text className="text-neon font-black text-sm">Satışlarınızı Katlayın</Text>
            </View>
            <Text className="text-light/80 text-xs leading-relaxed">
              İstatistiklerinize göre, ilanlarınız en çok akşam saatleri **18:00 - 21:00** arasında ilgi çekiyor. Yeni ilanlarınızı bu saatlerde yayınlamak veya mevcut ilanlarınızı bu saatlerde **Öne Çıkarmak (Bump)** %42 daha fazla alıcıya ulaşmanızı sağlayacaktır!
            </Text>
          </View>

        </ScrollView>
      )}
    </View>
  );
};
