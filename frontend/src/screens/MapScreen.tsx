import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
  Image,
  Animated,
  ScrollView,
} from 'react-native';
import MapView, { Marker, Region, PROVIDER_DEFAULT } from 'react-native-maps';
import { useLocation } from '../context/LocationContext';
import { useAuth, API_BASE_URL } from '../context/AuthContext';
import { ProductItem } from '../components/ProductCard';
import { MapPin, X, Navigation, ChevronRight } from 'lucide-react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const BOTTOM_SHEET_HEIGHT = 180;

interface MapListing extends ProductItem {
  latitude: number;
  longitude: number;
}

export const MapScreen: React.FC<{ navigation: any; onClose?: () => void }> = ({ navigation, onClose }) => {
  const { latitude, longitude } = useLocation();
  const { token } = useAuth();
  const mapRef = useRef<MapView>(null);

  const [listings, setListings] = useState<MapListing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedListing, setSelectedListing] = useState<MapListing | null>(null);
  const bottomSheetAnim = useRef(new Animated.Value(BOTTOM_SHEET_HEIGHT)).current;

  const [region, setRegion] = useState<Region>({
    latitude: latitude || 41.015,
    longitude: longitude || 28.979,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  });

  // ─── Fetch listings for visible bbox ───────────────────────────────────────
  const fetchMapListings = useCallback(
    async (reg?: Region) => {
      const r = reg || region;
      const minLat = r.latitude - r.latitudeDelta / 2;
      const maxLat = r.latitude + r.latitudeDelta / 2;
      const minLng = r.longitude - r.longitudeDelta / 2;
      const maxLng = r.longitude + r.longitudeDelta / 2;

      try {
        const url = `${API_BASE_URL}/listings/feed?lat=${r.latitude}&lng=${r.longitude}&radius_km=50&min_lat=${minLat}&max_lat=${maxLat}&min_lng=${minLng}&max_lng=${maxLng}&limit=50`;
        const response = await fetch(url, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const resData = await response.json();
        if (resData.success) {
          const withCoords = (resData.data as any[]).filter((l) => l.latitude && l.longitude);
          setListings(withCoords);
        }
      } catch (err) {
        console.error('Map fetch error:', err);
      } finally {
        setIsLoading(false);
      }
    },
    [region, token]
  );

  useEffect(() => {
    fetchMapListings();
  }, []);

  useEffect(() => {
    if (latitude && longitude) {
      const newRegion = { ...region, latitude, longitude };
      setRegion(newRegion);
      mapRef.current?.animateToRegion(newRegion, 600);
    }
  }, [latitude, longitude]);

  // ─── Bottom sheet animation ───────────────────────────────────────────────
  const showBottomSheet = (listing: MapListing) => {
    setSelectedListing(listing);
    Animated.spring(bottomSheetAnim, {
      toValue: 0,
      useNativeDriver: true,
      tension: 100,
      friction: 14,
    }).start();
  };

  const hideBottomSheet = () => {
    Animated.timing(bottomSheetAnim, {
      toValue: BOTTOM_SHEET_HEIGHT + 30,
      duration: 260,
      useNativeDriver: true,
    }).start(() => setSelectedListing(null));
  };

  // ─── Region change handler (dynamic fetch) ────────────────────────────────
  const handleRegionChangeComplete = (newRegion: Region) => {
    setRegion(newRegion);
    fetchMapListings(newRegion);
  };

  // ─── Center on user location ──────────────────────────────────────────────
  const centerOnUser = () => {
    if (!latitude || !longitude) return;
    const r: Region = { latitude, longitude, latitudeDelta: 0.02, longitudeDelta: 0.02 };
    mapRef.current?.animateToRegion(r, 500);
    setRegion(r);
  };

  return (
    <View style={styles.container}>
      {/* Map */}
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_DEFAULT}
        initialRegion={region}
        onRegionChangeComplete={handleRegionChangeComplete}
        showsUserLocation
        showsMyLocationButton={false}
        mapType="standard"
        customMapStyle={darkMapStyle}
        onPress={() => selectedListing && hideBottomSheet()}
      >
        {listings.map((item) => (
          <Marker
            key={item.id}
            coordinate={{ latitude: item.latitude, longitude: item.longitude }}
            onPress={() => showBottomSheet(item)}
          >
            <View style={[styles.pin, selectedListing?.id === item.id && styles.pinSelected]}>
              <Text style={styles.pinPrice}>
                {item.price >= 1000
                  ? `${(item.price / 1000).toFixed(item.price % 1000 === 0 ? 0 : 1)}K`
                  : `${item.price}`}{' '}
                ₺
              </Text>
            </View>
          </Marker>
        ))}
      </MapView>

      {/* Header Overlay */}
      <View style={styles.headerOverlay}>
        <TouchableOpacity
          style={styles.closeBtn}
          onPress={() => {
            if (onClose) {
              onClose();
            } else {
              navigation.goBack();
            }
          }}
        >
          <X size={18} color="#F9FAFB" />
        </TouchableOpacity>
        <View style={styles.headerPill}>
          <MapPin size={13} color="#DEFF9A" />
          <Text style={styles.headerText}>{listings.length} ilan haritada</Text>
        </View>
      </View>

      {/* Center on user */}
      <TouchableOpacity style={styles.locationBtn} onPress={centerOnUser}>
        <Navigation size={18} color="#DEFF9A" />
      </TouchableOpacity>

      {/* Loading */}
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator color="#DEFF9A" size="large" />
        </View>
      )}

      {/* Bottom Sheet */}
      {selectedListing && (
        <Animated.View
          style={[styles.bottomSheet, { transform: [{ translateY: bottomSheetAnim }] }]}
        >
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => navigation.navigate('ProductDetail', { product: selectedListing })}
          >
            <View style={styles.sheetCard}>
              <Image source={{ uri: selectedListing.images?.[0] }} style={styles.sheetImage} />
              <View style={styles.sheetInfo}>
                <Text style={styles.sheetTitle} numberOfLines={2}>{selectedListing.title}</Text>
                <Text style={styles.sheetPrice}>{selectedListing.price.toLocaleString('tr-TR')} TL</Text>
                <Text style={styles.sheetLocation}>{selectedListing.city_district}</Text>
              </View>
              <View style={styles.sheetChevron}>
                <ChevronRight size={20} color="#DEFF9A" />
              </View>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.sheetClose} onPress={hideBottomSheet}>
            <X size={14} color="#9CA3AF" />
          </TouchableOpacity>
        </Animated.View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0E1117' },
  map: { flex: 1 },
  headerOverlay: {
    position: 'absolute',
    top: 60,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(14,17,23,0.88)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#1E2530',
  },
  headerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(14,17,23,0.88)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#1E2530',
  },
  headerText: { color: '#F9FAFB', fontSize: 13, fontWeight: '700' },
  locationBtn: {
    position: 'absolute',
    right: 16,
    bottom: BOTTOM_SHEET_HEIGHT + 110,
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(14,17,23,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#1E2530',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(14,17,23,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pin: {
    backgroundColor: '#131820',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1.5,
    borderColor: '#DEFF9A',
    shadowColor: '#DEFF9A',
    shadowOpacity: 0.3,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  pinSelected: {
    backgroundColor: '#DEFF9A',
    borderColor: '#DEFF9A',
  },
  pinPrice: {
    color: '#DEFF9A',
    fontSize: 11,
    fontWeight: '900',
  },
  bottomSheet: {
    position: 'absolute',
    bottom: 100,
    left: 16,
    right: 16,
    backgroundColor: '#131820',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#1E2530',
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
  },
  sheetCard: { flexDirection: 'row', alignItems: 'center' },
  sheetImage: { width: 72, height: 72, borderRadius: 14, backgroundColor: '#1E2530' },
  sheetInfo: { flex: 1, marginLeft: 12 },
  sheetTitle: { color: '#F9FAFB', fontSize: 14, fontWeight: '800', lineHeight: 20 },
  sheetPrice: { color: '#DEFF9A', fontSize: 15, fontWeight: '900', marginTop: 4 },
  sheetLocation: { color: '#9CA3AF', fontSize: 11, fontWeight: '600', marginTop: 3, textTransform: 'uppercase' },
  sheetChevron: { marginLeft: 10 },
  sheetClose: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#1E2530',
    borderWidth: 1,
    borderColor: '#2E3849',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

// Dark map style for night mode feel
const darkMapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#1a2233' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8ec3b9' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#1a3646' }] },
  { featureType: 'administrative.country', elementType: 'geometry.stroke', stylers: [{ color: '#4b6878' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#304a57' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#3c6373' }] },
  { featureType: 'water', elementType: 'geometry.fill', stylers: [{ color: '#0e1b2a' }] },
  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#263d45' }] },
];
