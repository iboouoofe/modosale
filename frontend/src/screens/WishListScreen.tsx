import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Switch,
  StyleSheet,
  Modal,
  Keyboard,
} from 'react-native';
import { useAuth, API_BASE_URL } from '../context/AuthContext';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import {
  Bell,
  Plus,
  Trash2,
  Sliders,
  CheckCircle,
  X,
  Compass,
  ChevronLeft,
} from 'lucide-react-native';

const CATEGORIES = ['Tümü', 'Elektronik', 'Moda & Giyim', 'Ev & Yaşam', 'Spor & Outdoor', 'Kitap & Hobi', 'Bebek & Çocuk', 'Diğer'];

export const WishListScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { token, user } = useAuth();
  const [alerts, setAlerts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Alarm Create Modal States
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [keywords, setKeywords] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Tümü');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [radiusKm, setRadiusKm] = useState(15);
  const [frequency, setFrequency] = useState('instant');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchAlerts = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/wishlist`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          'x-user-id': user?.id || '',
        },
      });
      const resData = await response.json();
      if (resData.success) {
        setAlerts(resData.data || []);
      }
    } catch (err) {
      console.error('Error fetching wish alerts:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  const handleCreateAlert = async () => {
    if (!keywords.trim()) {
      Alert.alert('Eksik Bilgi', 'Lütfen aramak istediğiniz anahtar kelimeyi girin.');
      return;
    }

    setIsSubmitting(true);
    try {
      const keywordList = keywords.split(',').map((k) => k.trim()).filter((k) => k.length > 0);
      
      const response = await fetch(`${API_BASE_URL}/wishlist`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          'x-user-id': user?.id || '',
        },
        body: JSON.stringify({
          keywords: keywordList,
          category: selectedCategory === 'Tümü' ? null : selectedCategory,
          min_price: minPrice ? parseInt(minPrice) : null,
          max_price: maxPrice ? parseInt(maxPrice) : null,
          radius_km: radiusKm,
          notification_frequency: frequency,
        }),
      });

      const resData = await response.json();
      if (resData.success) {
        Alert.alert('Fiyat Alarmı Kuruldu! 🔔', 'Aradığınız ürün yüklendiğinde size anında bildirim göndereceğiz.');
        setIsModalVisible(false);
        setKeywords('');
        setSelectedCategory('Tümü');
        setMinPrice('');
        setMaxPrice('');
        setRadiusKm(15);
        setFrequency('instant');
        fetchAlerts();
      } else {
        Alert.alert('Hata', resData.error || 'Alarm oluşturulamadı.');
      }
    } catch (err) {
      Alert.alert('Hata', 'Bağlantı hatası.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleAlert = async (id: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`${API_BASE_URL}/wishlist/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ is_active: !currentStatus }),
      });
      const resData = await response.json();
      if (resData.success) {
        setAlerts(alerts.map((a) => (a.id === id ? { ...a, is_active: !currentStatus } : a)));
      }
    } catch (err) {
      console.error('Error toggling alert:', err);
    }
  };

  const handleDeleteAlert = (id: string) => {
    Alert.alert('Alarmı Kaldır', 'Bu arama alarmını tamamen kaldırmak istediğinize emin misiniz?', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Evet, Sil',
        style: 'destructive',
        onPress: async () => {
          try {
            const response = await fetch(`${API_BASE_URL}/wishlist/${id}`, {
              method: 'DELETE',
              headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
              },
            });
            const resData = await response.json();
            if (resData.success) {
              setAlerts(alerts.filter((a) => a.id !== id));
            }
          } catch (err) {
            Alert.alert('Hata', 'Alarm silinemedi.');
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={{ marginRight: 10, padding: 4 }}
            activeOpacity={0.7}
          >
            <ChevronLeft size={22} color="#DEFF9A" />
          </TouchableOpacity>
          <Bell size={18} color="#DEFF9A" style={{ marginRight: 6 }} />
          <Text style={styles.headerTitle}>Fiyat Alarmlarım</Text>
        </View>
        <TouchableOpacity
          onPress={() => setIsModalVisible(true)}
          style={styles.addButton}
        >
          <Plus size={16} color="#0E1117" />
          <Text style={styles.addButtonText}>YENİ</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#DEFF9A" />
          <Text style={styles.loaderText}>Alarmlar güncelleniyor...</Text>
        </View>
      ) : alerts.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Bell size={48} color="#2E3849" style={{ marginBottom: 16 }} />
          <Text style={styles.emptyTitle}>Henüz Bir Alarm Kurulmamış</Text>
          <Text style={styles.emptyText}>
            Aramak istediğiniz ürünlerin adını girip alarm kurun, ürün ModoSale'e eklendiği an telefonunuza bildirim gönderelim!
          </Text>
          <TouchableOpacity
            onPress={() => setIsModalVisible(true)}
            style={styles.emptyButton}
          >
            <Text style={styles.emptyButtonText}>İlk Arama Alarmını Kur 🔔</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
          {alerts.map((item) => (
            <View key={item.id} style={[styles.alertCard, !item.is_active && { opacity: 0.65 }]}>
              <View style={styles.alertCardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.alertKeywords}>
                    "{Array.isArray(item.keywords) ? item.keywords.join(', ') : item.keywords}"
                  </Text>
                  <Text style={styles.alertMeta}>
                    Kategori: {item.category || 'Tümü'} • Yarıçap: {item.radius_km}km
                  </Text>
                  {item.min_price || item.max_price ? (
                    <Text style={styles.alertPriceMeta}>
                      Fiyat: {item.min_price ? `${item.min_price}₺` : '0₺'} - {item.max_price ? `${item.max_price}₺` : '∞'}
                    </Text>
                  ) : null}
                  {item.match_count > 0 && (
                    <View style={styles.matchBadge}>
                      <Text style={styles.matchBadgeText}>{item.match_count} Yeni Eşleşme! 🔥</Text>
                    </View>
                  )}
                </View>

                {/* Switch Actions */}
                <View style={{ alignItems: 'flex-end', gap: 12 }}>
                  <Switch
                    value={item.is_active}
                    onValueChange={() => handleToggleAlert(item.id, item.is_active)}
                    trackColor={{ false: '#2A2A2A', true: '#DEFF9A' }}
                    thumbColor={item.is_active ? '#121212' : '#9CA3AF'}
                  />
                  <TouchableOpacity
                    onPress={() => handleDeleteAlert(item.id)}
                    style={styles.deleteBtn}
                  >
                    <Trash2 size={14} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      {/* 🔔 ALARM OLUŞTURMA MODALI */}
      <Modal
        visible={isModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Arama Alarmı Kur</Text>
              <TouchableOpacity onPress={() => setIsModalVisible(false)}>
                <X size={20} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: '75%' }}>
              <Input
                label="Ne Arıyorsunuz? (Anahtar Kelime)"
                placeholder="Örn: iPhone 13, Bisiklet"
                value={keywords}
                onChangeText={setKeywords}
                returnKeyType="done"
                onSubmitEditing={Keyboard.dismiss}
              />

              {/* Category selector */}
              <Text style={styles.inputLabel}>Kategori</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
                {CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    onPress={() => setSelectedCategory(cat)}
                    style={[
                      styles.chip,
                      selectedCategory === cat && styles.chipActive,
                    ]}
                  >
                    <Text style={[styles.chipText, selectedCategory === cat && styles.chipTextActive]}>
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Price range */}
              <Text style={styles.inputLabel}>Fiyat Aralığı (İsteğe Bağlı)</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                <View style={{ flex: 1 }}>
                  <Input
                    placeholder="Min ₺"
                    keyboardType="numeric"
                    value={minPrice}
                    onChangeText={setMinPrice}
                  />
                </View>
                <Text style={{ color: '#9CA3AF', fontWeight: 'bold' }}>-</Text>
                <View style={{ flex: 1 }}>
                  <Input
                    placeholder="Max ₺"
                    keyboardType="numeric"
                    value={maxPrice}
                    onChangeText={setMaxPrice}
                  />
                </View>
              </View>

              {/* Distance range */}
              <Text style={styles.inputLabel}>Bildirim Yarıçapı</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 20 }}>
                {[
                  { label: '1 km', value: 1 },
                  { label: '5 km', value: 5 },
                  { label: '15 km', value: 15 },
                  { label: 'Çevre İller', value: 50 },
                ].map((r) => (
                  <TouchableOpacity
                    key={r.value}
                    onPress={() => setRadiusKm(r.value)}
                    style={[
                      styles.radiusChip,
                      radiusKm === r.value && styles.radiusChipActive,
                    ]}
                  >
                    <Text style={[styles.radiusChipText, radiusKm === r.value && styles.radiusChipTextActive]}>
                      {r.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Frequency */}
              <Text style={styles.inputLabel}>Bildirim Sıklığı</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 30 }}>
                {[
                  { label: 'Anında ⚡', value: 'instant' },
                  { label: 'Günlük Özet 📅', value: 'daily' },
                  { label: 'Haftalık 🗓️', value: 'weekly' },
                ].map((f) => (
                  <TouchableOpacity
                    key={f.value}
                    onPress={() => setFrequency(f.value)}
                    style={[
                      styles.radiusChip,
                      frequency === f.value && styles.radiusChipActive,
                      { flex: 1 },
                    ]}
                  >
                    <Text style={[styles.radiusChipText, frequency === f.value && styles.radiusChipTextActive]}>
                      {f.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Button
                title="Alarmı Kaydet 🔔"
                isLoading={isSubmitting}
                onPress={handleCreateAlert}
                className="mb-8"
              />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0E1117' },
  header: {
    paddingTop: 60,
    paddingBottom: 14,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#131820',
    borderBottomWidth: 1,
    borderBottomColor: '#1E2530',
  },
  headerTitle: { color: '#F9FAFB', fontSize: 16, fontWeight: '900' },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DEFF9A',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  addButtonText: { color: '#0E1117', fontSize: 11, fontWeight: '900' },

  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loaderText: { color: '#9CA3AF', fontSize: 12, marginTop: 12, fontWeight: '600' },

  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 36 },
  emptyTitle: { color: '#F9FAFB', fontSize: 18, fontWeight: '900', marginTop: 12, textAlign: 'center' },
  emptyText: { color: '#9CA3AF', fontSize: 12, textAlign: 'center', lineHeight: 20, marginTop: 8, marginBottom: 24, maxW: '80%' } as any,
  emptyButton: { backgroundColor: '#DEFF9A20', borderWidth: 1.5, borderColor: '#DEFF9A', borderRadius: 20, paddingHorizontal: 24, paddingVertical: 14 },
  emptyButtonText: { color: '#DEFF9A', fontSize: 13, fontWeight: '900' },

  alertCard: {
    backgroundColor: '#131820',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#1E2530',
    padding: 18,
    marginBottom: 12,
  },
  alertCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  alertKeywords: { color: '#DEFF9A', fontSize: 16, fontWeight: '900' },
  alertMeta: { color: '#F9FAFB', fontSize: 11, fontWeight: '700', marginTop: 6 },
  alertPriceMeta: { color: '#9CA3AF', fontSize: 11, marginTop: 4, fontWeight: '600' },
  matchBadge: {
    backgroundColor: 'rgba(222,255,154,0.1)',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DEFF9A',
    marginTop: 10,
  },
  matchBadgeText: { color: '#DEFF9A', fontSize: 10, fontWeight: '900' },
  deleteBtn: {
    backgroundColor: 'rgba(239,68,68,0.1)',
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.2)',
  },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(14,17,23,0.85)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: '#131820',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderWidth: 1,
    borderTopColor: '#1E2530',
    paddingHorizontal: 24,
    paddingTop: 14,
    paddingBottom: 40,
  },
  modalHandle: {
    width: 48,
    height: 6,
    backgroundColor: '#1E2530',
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 20,
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { color: '#F9FAFB', fontSize: 18, fontWeight: '900' },

  inputLabel: { color: '#9CA3AF', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12, paddingLeft: 4 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1E2530',
    backgroundColor: '#0E1117',
    marginRight: 8,
  },
  chipActive: { backgroundColor: '#DEFF9A20', borderColor: '#DEFF9A' },
  chipText: { color: '#9CA3AF', fontSize: 12, fontWeight: '600' },
  chipTextActive: { color: '#DEFF9A', fontWeight: '800' },

  radiusChip: {
    flex: 1,
    height: 42,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1E2530',
    backgroundColor: '#0E1117',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radiusChipActive: { backgroundColor: '#DEFF9A20', borderColor: '#DEFF9A' },
  radiusChipText: { color: '#9CA3AF', fontSize: 12, fontWeight: '600' },
  radiusChipTextActive: { color: '#DEFF9A', fontWeight: '800' },
});
