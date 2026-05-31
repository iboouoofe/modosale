import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ScrollView,
  ActivityIndicator,
  TextInput,
  Keyboard,
  Modal,
  StyleSheet,
  Image,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { useLocation } from '../context/LocationContext';
import { useAuth, API_BASE_URL } from '../context/AuthContext';
import { ProductCard, ProductItem } from '../components/ProductCard';
import { SkeletonGrid } from '../components/SkeletonCard';
import { OfflineBanner } from '../components/OfflineBanner';
import { Search, Compass, Sliders, RefreshCw, X, Clock, TrendingUp, ChevronRight, Map, Megaphone } from 'lucide-react-native';

const CATEGORIES = ['Tümü 🎯', 'Elektronik ⚡', 'Moda & Giyim 👕', 'Ev & Yaşam 🏠', 'Spor & Outdoor ⚽', 'Kitap & Hobi 📚', 'Bebek & Çocuk 🧸', 'Diğer 📦'];

const CATEGORY_TR_TO_EN: { [key: string]: string } = {
  'Tümü 🎯': 'Tümü',
  'Elektronik ⚡': 'Electronics',
  'Moda & Giyim 👕': 'Fashion',
  'Ev & Yaşam 🏠': 'Home & Living',
  'Spor & Outdoor ⚽': 'Sports & Outdoor',
  'Kitap & Hobi 📚': 'Books & Hobbies',
  'Bebek & Çocuk 🧸': 'Baby & Kids',
  'Diğer 📦': 'Other',
};

const PAGE_SIZE = 10;
const FEED_CACHE_KEY = 'modosale_feed_cache';
const SEARCH_HISTORY_KEY = 'modosale_search_history';
const CACHE_TTL_MS = 5 * 60 * 1000;
const MAX_HISTORY = 10;
const DEBOUNCE_MS = 300;

export const HomeScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { locationName, latitude, longitude, radiusKm, setRadiusKm, refreshLocation } = useLocation();
  const { token } = useAuth();

  const [selectedCategory, setSelectedCategory] = useState('Tümü 🎯');
  const [items, setItems] = useState<ProductItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [searchText, setSearchText] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [trendingItems, setTrendingItems] = useState<ProductItem[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isOffline, setIsOffline] = useState(false);

  // Advanced Filter
  const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [selectedCondition, setSelectedCondition] = useState<string | null>(null);

  const isFetchingRef = useRef(false);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ─── NetInfo ────────────────────────────────────────────────────────────
  useEffect(() => {
    const unsub = NetInfo.addEventListener((state) => setIsOffline(!state.isConnected));
    return () => unsub();
  }, []);

  // ─── Search History ──────────────────────────────────────────────────────
  const loadSearchHistory = async () => {
    try {
      const raw = await AsyncStorage.getItem(SEARCH_HISTORY_KEY);
      if (raw) setSearchHistory(JSON.parse(raw));
    } catch {}
  };

  const saveSearchHistory = async (term: string) => {
    if (!term.trim()) return;
    const updated = [term, ...searchHistory.filter((h) => h !== term)].slice(0, MAX_HISTORY);
    setSearchHistory(updated);
    try {
      await AsyncStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(updated));
    } catch {}
  };

  const clearSearchHistory = async () => {
    setSearchHistory([]);
    try {
      await AsyncStorage.removeItem(SEARCH_HISTORY_KEY);
    } catch {}
  };

  useEffect(() => {
    loadSearchHistory();
    fetchTrendingListings();
  }, []);

  // ─── Trending Listings ───────────────────────────────────────────────────
  const fetchTrendingListings = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/reviews/trending`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const resData = await response.json();
      if (resData.success) setTrendingItems(resData.data.slice(0, 5));
    } catch {}
  };

  // ─── Helpers ────────────────────────────────────────────────────────────
  const getAppliedFiltersCount = () => {
    let count = 0;
    if (minPrice.trim() !== '') count++;
    if (maxPrice.trim() !== '') count++;
    if (selectedCondition !== null) count++;
    return count;
  };

  const buildUrl = (pageNum: number, searchOverride?: string) => {
    let url = `${API_BASE_URL}/listings/feed?lat=${latitude}&lng=${longitude}&radius_km=${radiusKm}&page=${pageNum}&limit=${PAGE_SIZE}`;
    const englishCat = CATEGORY_TR_TO_EN[selectedCategory] || 'Tümü';
    if (englishCat !== 'Tümü') url += `&category=${encodeURIComponent(englishCat)}`;
    const activeSearch = searchOverride !== undefined ? searchOverride : searchText;
    if (activeSearch.trim() !== '') url += `&search=${encodeURIComponent(activeSearch.trim())}`;
    if (minPrice.trim() !== '') url += `&min_price=${encodeURIComponent(minPrice.trim())}`;
    if (maxPrice.trim() !== '') url += `&max_price=${encodeURIComponent(maxPrice.trim())}`;
    if (selectedCondition) url += `&condition=${encodeURIComponent(selectedCondition)}`;
    return url;
  };

  // ─── Cache ──────────────────────────────────────────────────────────────
  const loadFromCache = async () => {
    try {
      const raw = await AsyncStorage.getItem(FEED_CACHE_KEY);
      if (raw) {
        const { data, timestamp } = JSON.parse(raw);
        if (Date.now() - timestamp < CACHE_TTL_MS) {
          setItems(data);
          setIsLoading(false);
          return true;
        }
      }
    } catch {}
    return false;
  };

  const saveToCache = async (data: ProductItem[]) => {
    try {
      await AsyncStorage.setItem(FEED_CACHE_KEY, JSON.stringify({ data, timestamp: Date.now() }));
    } catch {}
  };

  // ─── Fetch ──────────────────────────────────────────────────────────────
  const fetchGeospatialFeed = useCallback(
    async (options: { reset?: boolean; showLoading?: boolean; searchOverride?: string } = {}) => {
      const { reset = false, showLoading = true, searchOverride } = options;
      if (isFetchingRef.current) return;
      isFetchingRef.current = true;

      const targetPage = reset ? 1 : page;

      if (showLoading && reset) setIsLoading(true);
      setError('');

      if (isOffline) {
        await loadFromCache();
        isFetchingRef.current = false;
        return;
      }

      try {
        const url = buildUrl(targetPage, searchOverride);
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });

        const resData = await response.json();

        if (resData.success) {
          const newItems: ProductItem[] = resData.data;
          const updatedItems = reset || targetPage === 1 ? newItems : [...items, ...newItems];
          setItems(updatedItems);
          setHasMore(newItems.length === PAGE_SIZE);
          if (reset || targetPage === 1) {
            setPage(2);
            await saveToCache(updatedItems);
          } else {
            setPage((prev) => prev + 1);
          }
        } else {
          setError(resData.error || 'İlanlar yüklenemedi.');
          await loadFromCache();
        }
      } catch (err) {
        setError('Bağlantı hatası.');
        await loadFromCache();
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
        setIsLoadingMore(false);
        isFetchingRef.current = false;
      }
    },
    [page, items, isOffline, latitude, longitude, radiusKm, selectedCategory, searchText, minPrice, maxPrice, selectedCondition, token]
  );

  const handleLoadMore = useCallback(() => {
    if (!hasMore || isLoadingMore || isFetchingRef.current) return;
    setIsLoadingMore(true);
    fetchGeospatialFeed({ reset: false, showLoading: false });
  }, [hasMore, isLoadingMore, fetchGeospatialFeed]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await refreshLocation();
    fetchGeospatialFeed({ reset: true, showLoading: false });
  }, [refreshLocation, fetchGeospatialFeed]);

  useEffect(() => {
    fetchGeospatialFeed({ reset: true, showLoading: true });
    const unsubscribe = navigation.addListener('focus', () => {
      fetchGeospatialFeed({ reset: true, showLoading: false });
    });
    return unsubscribe;
  }, [navigation, latitude, longitude, radiusKm, selectedCategory]);

  // ─── Debounced Search ───────────────────────────────────────────────────
  const handleSearchChange = (text: string) => {
    setSearchText(text);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    if (text === '') {
      fetchGeospatialFeed({ reset: true, showLoading: false, searchOverride: '' });
      return;
    }
    debounceTimer.current = setTimeout(() => {
      fetchGeospatialFeed({ reset: true, showLoading: true, searchOverride: text });
    }, DEBOUNCE_MS);
  };

  const handleSearchSubmit = () => {
    Keyboard.dismiss();
    if (searchText.trim()) {
      saveSearchHistory(searchText.trim());
      setIsSearchFocused(false);
    }
    fetchGeospatialFeed({ reset: true, showLoading: true });
  };

  const handleHistorySelect = (term: string) => {
    setSearchText(term);
    setIsSearchFocused(false);
    Keyboard.dismiss();
    fetchGeospatialFeed({ reset: true, showLoading: true, searchOverride: term });
  };

  const handleClearSearch = () => {
    setSearchText('');
    Keyboard.dismiss();
    setIsSearchFocused(false);
    fetchGeospatialFeed({ reset: true, showLoading: true, searchOverride: '' });
  };

  const handleResetFilters = () => {
    setMinPrice('');
    setMaxPrice('');
    setSelectedCondition(null);
    setIsFilterModalVisible(false);
    setTimeout(() => fetchGeospatialFeed({ reset: true, showLoading: true }), 100);
  };

  const renderFooter = () => {
    if (!isLoadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator color="#DEFF9A" size="small" />
        <Text style={styles.footerText}>Daha fazla yükleniyor...</Text>
      </View>
    );
  };

  // ─── Search Dropdown Overlay ──────────────────────────────────────────────
  const renderSearchOverlay = () => {
    if (!isSearchFocused) return null;
    return (
      <View style={styles.searchOverlay}>
        {/* Recent Searches */}
        {searchHistory.length > 0 && (
          <>
            <View style={styles.overlayHeader}>
              <View style={styles.overlayLabelRow}>
                <Clock size={13} color="#9CA3AF" />
                <Text style={styles.overlayLabel}>Son Aramalar</Text>
              </View>
              <TouchableOpacity onPress={clearSearchHistory}>
                <Text style={styles.clearAll}>Temizle</Text>
              </TouchableOpacity>
            </View>
            {searchHistory.map((term) => (
              <TouchableOpacity
                key={term}
                style={styles.historyItem}
                onPress={() => handleHistorySelect(term)}
              >
                <Clock size={13} color="#6B7280" />
                <Text style={styles.historyText}>{term}</Text>
                <ChevronRight size={13} color="#6B7280" />
              </TouchableOpacity>
            ))}
          </>
        )}

        {/* Trending */}
        {trendingItems.length > 0 && (
          <>
            <View style={[styles.overlayHeader, { marginTop: searchHistory.length > 0 ? 16 : 0 }]}>
              <View style={styles.overlayLabelRow}>
                <TrendingUp size={13} color="#DEFF9A" />
                <Text style={[styles.overlayLabel, { color: '#DEFF9A' }]}>Trend İlanlar</Text>
              </View>
            </View>
            {trendingItems.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.trendingItem}
                onPress={() => {
                  setIsSearchFocused(false);
                  Keyboard.dismiss();
                  navigation.navigate('ProductDetail', { product: item });
                }}
              >
                <Image source={{ uri: item.images?.[0] }} style={styles.trendingThumb} />
                <View style={{ flex: 1 }}>
                  <Text numberOfLines={1} style={styles.trendingTitle}>{item.title}</Text>
                  <Text style={styles.trendingPrice}>{item.price?.toLocaleString('tr-TR')} TL</Text>
                </View>
                <ChevronRight size={13} color="#6B7280" />
              </TouchableOpacity>
            ))}
          </>
        )}
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#0E1117' }}>
      <OfflineBanner />

      {/* Top Navigation Bar */}
      <View className="pt-16 pb-4 px-6 border-b border-dark-border bg-dark-card">
        <View className="flex-row justify-between items-center">
          <View>
            <Text className="text-muted text-[10px] uppercase font-bold tracking-widest">
              Yakınındaki İlanlar • Modosale
            </Text>
            <TouchableOpacity onPress={handleRefresh} className="flex-row items-center mt-1">
              <Text className="text-neon text-lg font-black tracking-tight mr-1.5">{locationName}</Text>
              {isRefreshing ? (
                <ActivityIndicator size="small" color="#DEFF9A" style={{ transform: [{ scale: 0.75 }] }} />
              ) : (
                <RefreshCw size={14} color="#DEFF9A" />
              )}
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            onPress={() => navigation.navigate('MapView')}
            className="w-10 h-10 rounded-full bg-dark-input flex justify-center items-center border border-dark-border"
          >
            <Map size={18} color="#DEFF9A" />
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View className="flex-row items-center mt-4">
          <View className="flex-1 flex-row items-center bg-dark-input border border-dark-border rounded-2xl px-4 h-12">
            <Search size={18} color="#9CA3AF" />
            <TextInput
              className="flex-1 text-light ml-3 text-sm h-full"
              placeholder="Ne aramıştınız? Örn: AirPods..."
              placeholderTextColor="#6B7280"
              value={searchText}
              onChangeText={handleSearchChange}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setTimeout(() => setIsSearchFocused(false), 150)}
              returnKeyType="search"
              onSubmitEditing={handleSearchSubmit}
              autoCorrect={false}
              autoCapitalize="none"
            />
            {searchText.length > 0 && (
              <TouchableOpacity onPress={handleClearSearch} style={{ padding: 4 }}>
                <X size={16} color="#9CA3AF" />
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            onPress={() => setIsFilterModalVisible(true)}
            activeOpacity={0.8}
            className="w-12 h-12 bg-dark-input border border-dark-border rounded-2xl justify-center items-center ml-3"
            style={{ position: 'relative' }}
          >
            <Sliders size={18} color="#DEFF9A" />
            {getAppliedFiltersCount() > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{getAppliedFiltersCount()}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Neighborhood Board Shortcut Banner */}
        <TouchableOpacity
          onPress={() => navigation.navigate('Neighborhood')}
          activeOpacity={0.85}
          className="mt-3.5 bg-neon/10 border border-neon/30 p-3.5 rounded-2xl flex-row items-center justify-between"
        >
          <View className="flex-row items-center flex-1 pr-4">
            <View className="w-8 h-8 rounded-xl bg-neon/20 justify-center items-center mr-3">
              <Megaphone size={14} color="#DEFF9A" />
            </View>
            <View className="flex-1">
              <Text className="text-light font-black text-xs">Semt Komşu Panosu 💬</Text>
              <Text className="text-muted text-[10px] mt-0.5 leading-relaxed" numberOfLines={1}>
                {locationName.split(',').pop()?.replace('📍', '').trim() || 'Semtinizdeki'} sakinlerin yardımlaşma & duyuru akışını gör!
              </Text>
            </View>
          </View>
          <ChevronRight size={16} color="#DEFF9A" />
        </TouchableOpacity>

        {/* Radius Chips */}
        <View className="flex-row items-center mt-5">
          <Text className="text-muted text-xs font-semibold mr-3">Mesafe:</Text>
          <View className="flex-row flex-1 justify-between">
            {[1, 5, 15].map((distance) => (
              <TouchableOpacity
                key={distance}
                onPress={() => setRadiusKm(distance)}
                className={`flex-1 mx-1.5 py-1.5 px-3 rounded-xl border items-center ${
                  radiusKm === distance ? 'bg-neon border-neon' : 'bg-dark-input border-dark-border'
                }`}
              >
                <Text className={`text-xs font-bold ${radiusKm === distance ? 'text-dark' : 'text-muted'}`}>
                  {distance} km
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      {/* Search Dropdown Overlay */}
      {renderSearchOverlay()}

      {/* Categories */}
      <View className="py-3 bg-dark-card border-b border-dark-border">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20 }}>
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat}
              onPress={() => setSelectedCategory(cat)}
              className={`mr-2.5 px-4 py-2 rounded-full border ${
                selectedCategory === cat ? 'bg-neon border-neon' : 'bg-dark-input border-dark-border'
              }`}
            >
              <Text className={`text-xs font-semibold ${selectedCategory === cat ? 'text-dark font-extrabold' : 'text-light'}`}>
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Main Content */}
      {isLoading ? (
        <SkeletonGrid count={6} />
      ) : error && items.length === 0 ? (
        <View className="flex-1 justify-center items-center p-6">
          <Text className="text-red-400 text-center font-bold text-sm">{error}</Text>
          <TouchableOpacity
            onPress={() => fetchGeospatialFeed({ reset: true })}
            className="mt-4 px-6 py-2.5 bg-dark-card border border-dark-border rounded-xl"
          >
            <Text className="text-neon text-xs font-bold">Tekrar Dene</Text>
          </TouchableOpacity>
        </View>
      ) : items.length === 0 ? (
        <View className="flex-1 justify-center items-center p-6">
          <Sliders size={48} color="#9CA3AF" />
          <Text className="text-light text-center font-bold text-lg mt-4">İlan Bulunamadı</Text>
          <Text className="text-muted text-center text-xs mt-2 max-w-[260px] leading-relaxed">
            Seçtiğiniz {radiusKm}km yarıçapta bu kategoriye uygun aktif ilan bulunamadı.
          </Text>
        </View>
      ) : (
        <FlatList
          data={items}
          renderItem={({ item }) => (
            <ProductCard
              item={item}
              onPress={() => navigation.navigate('ProductDetail', { product: item })}
            />
          )}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={{ paddingHorizontal: 12, paddingTop: 12, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          onRefresh={handleRefresh}
          refreshing={isRefreshing}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={renderFooter}
        />
      )}

      {/* ADVANCED FILTER MODAL */}
      <Modal
        visible={isFilterModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setIsFilterModalVisible(false)}
      >
        <View className="flex-1 bg-dark/75 justify-end">
          <View className="bg-dark-card border-t-2 border-dark-border rounded-t-[32px] p-6 pb-12">
            <View style={styles.modalHandle} />

            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-light text-xl font-black">Detaylı Filtreleme</Text>
              <TouchableOpacity onPress={() => setIsFilterModalVisible(false)}>
                <X size={20} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: '50%' } as any}>
              <Text className="text-muted text-xs font-bold uppercase tracking-widest pl-1 mb-2.5">Kategori</Text>
              <View className="flex-row flex-wrap mb-6">
                {CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    onPress={() => setSelectedCategory(cat)}
                    className={`mr-2 mb-2 px-3 py-1.5 rounded-xl border ${
                      selectedCategory === cat ? 'bg-neon border-neon' : 'bg-dark border-dark-border'
                    }`}
                  >
                    <Text className={`text-xs font-bold ${selectedCategory === cat ? 'text-dark font-extrabold' : 'text-light'}`}>
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text className="text-muted text-xs font-bold uppercase tracking-widest pl-1 mb-3">Fiyat Aralığı (TL)</Text>
              <View className="flex-row items-center mb-6">
                <View className="flex-1 bg-dark border border-dark-border rounded-2xl px-4 h-12 justify-center">
                  <TextInput
                    className="text-light text-sm h-full"
                    placeholder="Minimum"
                    placeholderTextColor="#6B7280"
                    keyboardType="numeric"
                    value={minPrice}
                    onChangeText={setMinPrice}
                    returnKeyType="done"
                  />
                </View>
                <Text className="text-muted text-xs font-bold mx-3">-</Text>
                <View className="flex-1 bg-dark border border-dark-border rounded-2xl px-4 h-12 justify-center">
                  <TextInput
                    className="text-light text-sm h-full"
                    placeholder="Maximum"
                    placeholderTextColor="#6B7280"
                    keyboardType="numeric"
                    value={maxPrice}
                    onChangeText={setMaxPrice}
                    returnKeyType="done"
                  />
                </View>
              </View>

              <Text className="text-muted text-xs font-bold uppercase tracking-widest pl-1 mb-3">Ürün Durumu</Text>
              <View className="flex-row mb-6">
                {[
                  { label: 'Sıfır Gibi ✨', value: 'new' },
                  { label: 'Temiz / İyi 👍', value: 'good' },
                  { label: 'Makul 🛠️', value: 'fair' },
                ].map((cond) => (
                  <TouchableOpacity
                    key={cond.value}
                    onPress={() => setSelectedCondition(selectedCondition === cond.value ? null : cond.value)}
                    className={`flex-1 mx-1 py-2 px-3 rounded-xl border items-center ${
                      selectedCondition === cond.value ? 'bg-neon border-neon' : 'bg-dark border-dark-border'
                    }`}
                  >
                    <Text className={`text-xs font-bold ${selectedCondition === cond.value ? 'text-dark font-black' : 'text-light'}`}>
                      {cond.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <View className="flex-row items-center justify-between mt-4 border-t border-dark-border pt-4">
              <TouchableOpacity
                onPress={handleResetFilters}
                className="w-[30%] h-12 bg-dark border border-dark-border rounded-2xl justify-center items-center"
              >
                <Text className="text-muted font-bold text-xs">Temizle</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  setIsFilterModalVisible(false);
                  fetchGeospatialFeed({ reset: true, showLoading: true });
                }}
                className="w-[65%] h-12 bg-neon rounded-2xl justify-center items-center"
              >
                <Text className="text-dark font-extrabold text-xs">Filtreleri Uygula</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    backgroundColor: '#DEFF9A',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#0E1117',
  },
  badgeText: { color: '#0E1117', fontWeight: '900', fontSize: 9 },
  footerLoader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  footerText: { color: '#9CA3AF', fontSize: 11, fontWeight: '600', marginLeft: 8 },
  modalHandle: {
    width: 48,
    height: 6,
    backgroundColor: '#1E2530',
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 24,
  },
  searchOverlay: {
    position: 'absolute',
    top: 220,
    left: 20,
    right: 20,
    zIndex: 999,
    backgroundColor: '#131820',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#1E2530',
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
  overlayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  overlayLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  overlayLabel: { color: '#9CA3AF', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  clearAll: { color: '#EF4444', fontSize: 11, fontWeight: '700' },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1E2530',
  },
  historyText: { flex: 1, color: '#D1D5DB', fontSize: 13, fontWeight: '500' },
  trendingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1E2530',
  },
  trendingThumb: { width: 40, height: 40, borderRadius: 10, backgroundColor: '#1E2530' },
  trendingTitle: { color: '#F9FAFB', fontSize: 13, fontWeight: '600' },
  trendingPrice: { color: '#DEFF9A', fontSize: 11, fontWeight: '800', marginTop: 2 },
});
