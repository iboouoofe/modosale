import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  Keyboard,
  StyleSheet,
  Animated,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAuth, API_BASE_URL } from '../context/AuthContext';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import {
  Settings,
  ShieldCheck,
  LogOut,
  Trash2,
  ArrowUp,
  Globe,
  Edit2,
  Star,
  Award,
  ChevronRight,
  Bell,
  TrendingUp,
} from 'lucide-react-native';

// ─── Profile Completion Score ──────────────────────────────────────────────────
const calcCompletionScore = (user: any): { score: number; missing: string[] } => {
  const missing: string[] = [];
  let score = 0;
  if (user?.phone_number) score += 25; else missing.push('Telefon numarası');
  if (user?.display_name) score += 25; else missing.push('Ad soyad');
  if (user?.email) score += 25; else missing.push('E-posta adresi');
  if (user?.avatar_url) score += 25; else missing.push('Profil fotoğrafı');
  return { score, missing };
};

// ─── Star Rating Row ───────────────────────────────────────────────────────────
const StarRow: React.FC<{ rating: number; size?: number }> = ({ rating, size = 14 }) => {
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          size={size}
          color={s <= Math.round(rating) ? '#DEFF9A' : '#2E3849'}
          fill={s <= Math.round(rating) ? '#DEFF9A' : 'transparent'}
        />
      ))}
    </View>
  );
};

// ─── Completion Progress Bar ───────────────────────────────────────────────────
const CompletionBar: React.FC<{ score: number }> = ({ score }) => {
  const animWidth = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animWidth, {
      toValue: score,
      duration: 900,
      useNativeDriver: false,
    }).start();
  }, [score]);

  const color = score === 100 ? '#DEFF9A' : score >= 50 ? '#FCD34D' : '#F87171';

  return (
    <View style={styles.progressContainer}>
      <View style={styles.progressTrack}>
        <Animated.View
          style={[
            styles.progressFill,
            {
              backgroundColor: color,
              width: animWidth.interpolate({
                inputRange: [0, 100],
                outputRange: ['0%', '100%'],
              }),
            },
          ]}
        />
      </View>
      <Text style={[styles.progressText, { color }]}>{score}%</Text>
    </View>
  );
};

export const ProfileScreen: React.FC<{ navigation?: any }> = ({ navigation }) => {
  const { user, token, logout, updateProfile, favorites, toggleFavorite } = useAuth();

  const [userListings, setUserListings] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lang, setLang] = useState<'TR' | 'EN'>('TR');

  // Profile editing
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editName, setEditName] = useState(user?.display_name || '');
  const [editEmail, setEditEmail] = useState(user?.email || '');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // --- Storefront (Faz 5) States ---
  const [store, setStore] = useState<any>(null);
  const [isStoreModalVisible, setIsStoreModalVisible] = useState(false);
  const [storeName, setStoreName] = useState('');
  const [storeDesc, setStoreDesc] = useState('');
  const [isOpeningStore, setIsOpeningStore] = useState(false);

  // Reviews
  const [reviews, setReviews] = useState<any[]>([]);
  const [reviewStats, setReviewStats] = useState<{ total_reviews: number; avg_rating: number } | null>(null);
  const [isFetchingReviews, setIsFetchingReviews] = useState(false);

  // Favorites
  const [favoriteListings, setFavoriteListings] = useState<any[]>([]);
  const [isFetchingFavorites, setIsFetchingFavorites] = useState(false);
  const [activeTab, setActiveTab] = useState<'my_listings' | 'favorites' | 'reviews'>('my_listings');

  // ─── Avatar Picker ────────────────────────────────────────────────────────
  const handleAvatarPick = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('İzin Gerekli', 'Fotoğraf seçmek için galeri erişimi izni vermelisiniz.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled && result.assets && result.assets[0]) {
      const uri = result.assets[0].uri;
      try {
        const formData = new FormData();
        const filename = uri.split('/').pop() || 'avatar.jpg';
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : `image/jpeg`;

        formData.append('photos', {
          uri,
          name: filename,
          type,
        } as any);

        const response = await fetch(`${API_BASE_URL}/listings/upload`, {
          method: 'POST',
          headers: {
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          },
          body: formData,
        });

        const data = await response.json();
        if (data.success && data.urls && data.urls.length > 0) {
          const uploadedUrl = data.urls[0];
          await updateProfile(user?.display_name || '', user?.email || '', uploadedUrl);
          Alert.alert('Başarılı', 'Profil fotoğrafı güncellendi!');
        } else {
          throw new Error('Upload failed');
        }
      } catch (error) {
        console.error('Avatar upload error:', error);
        Alert.alert('Hata', 'Profil fotoğrafı yüklenemedi.');
      }
    }
  };

  // ─── Completion Score ───────────────────────────────────────────────────
  const { score: completionScore, missing: missingFields } = calcCompletionScore(user);

  // ─── Fetch Profile + Listings ────────────────────────────────────────────
  const fetchUserProfileData = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/auth/profile`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id,
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      const resData = await response.json();
      if (resData.success) {
        setUserListings(resData.listings);
        setEditName(resData.profile.display_name);
        setEditEmail(resData.profile.email || '');
      }
    } catch (err) {
      console.error('Error fetching user profile data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUserStore = async () => {
    if (!user) return;
    try {
      const response = await fetch(`${API_BASE_URL}/stores/user/${user.id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id,
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      const resData = await response.json();
      if (resData.success && resData.store) {
        setStore(resData.store);
        setStoreName(resData.store.name);
        setStoreDesc(resData.store.description || '');
      }
    } catch (err) {
      console.error('[ProfileScreen] Error fetching user store:', err);
    }
  };

  const handleOpenStore = async () => {
    if (!storeName.trim()) {
      Alert.alert('Hata', 'Mağaza adı boş bırakılamaz.');
      return;
    }

    setIsOpeningStore(true);
    try {
      const response = await fetch(`${API_BASE_URL}/stores`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user?.id || '',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          name: storeName.trim(),
          description: storeDesc.trim(),
          banner_url: store?.banner_url || 'https://images.unsplash.com/photo-1468436139062-f60a71c5c892?auto=format&fit=crop&w=800&q=80',
          logo_url: user?.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
        }),
      });

      const resData = await response.json();
      setIsOpeningStore(false);

      if (resData.success) {
        setStore(resData.data);
        setIsStoreModalVisible(false);
        Alert.alert('Tebrikler 🎉', 'ModoMağazanız başarıyla oluşturuldu / güncellendi!', [
          { text: 'Mağazama Git', onPress: () => navigation?.navigate('Store', { userId: user?.id }) }
        ]);
      } else {
        Alert.alert('Hata', resData.error || 'Mağaza açma işlemi başarısız.');
      }
    } catch (err) {
      setIsOpeningStore(false);
      console.error('[ProfileScreen] Open store error:', err);
      Alert.alert('Hata', 'Bir ağ hatası oluştu.');
    }
  };

  // ─── Fetch Reviews ────────────────────────────────────────────────────────
  const fetchUserReviews = async () => {
    if (!user) return;
    setIsFetchingReviews(true);
    try {
      const response = await fetch(`${API_BASE_URL}/reviews/user/${user.id}`, {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      const resData = await response.json();
      if (resData.success) {
        setReviews(resData.data);
        setReviewStats(resData.stats);
      }
    } catch (err) {
      console.error('Error fetching reviews:', err);
    } finally {
      setIsFetchingReviews(false);
    }
  };

  // ─── Fetch Favorites ──────────────────────────────────────────────────────
  const fetchUserFavorites = async () => {
    if (!user) return;
    setIsFetchingFavorites(true);
    try {
      const response = await fetch(`${API_BASE_URL}/listings/feed?favorites_only=true`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id,
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      const resData = await response.json();
      if (resData.success) setFavoriteListings(resData.data);
    } catch (err) {
      console.error('Error fetching favorites:', err);
    } finally {
      setIsFetchingFavorites(false);
    }
  };

  useEffect(() => {
    fetchUserProfileData();
    fetchUserReviews();
    fetchUserStore();
  }, [user]);

  useEffect(() => {
    if (activeTab === 'favorites') fetchUserFavorites();
    if (activeTab === 'reviews') fetchUserReviews();
  }, [activeTab, favorites]);

  // ─── Save Profile ──────────────────────────────────────────────────────────
  const handleSaveProfile = async () => {
    if (!editName.trim()) {
      Alert.alert('Hata', 'İsim alanı boş bırakılamaz.');
      return;
    }
    setIsSavingProfile(true);
    const success = await updateProfile(editName, editEmail, user?.avatar_url);
    setIsSavingProfile(false);
    if (success) {
      setIsEditModalVisible(false);
      Alert.alert('Başarılı', 'Profil bilgileriniz güncellendi.');
      fetchUserProfileData();
    } else {
      Alert.alert('Hata', 'Profil güncellenirken bir sorun oluştu.');
    }
  };

  // ─── Bump Listing ──────────────────────────────────────────────────────────
  const handleBump = async (id: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/listings/${id}/bump`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      const resData = await response.json();
      if (resData.success) {
        Alert.alert('Öne Çıkarıldı! 🚀', 'İlanınız başarıyla en üst sıraya yükseltildi.');
        fetchUserProfileData();
      } else {
        Alert.alert('Hata', resData.error || 'İlan öne çıkarılamadı.');
      }
    } catch (err) {
      Alert.alert('Hata', 'Bağlantı hatası.');
    }
  };

  // ─── Delete Listing ────────────────────────────────────────────────────────
  const handleDelete = (id: string) => {
    Alert.alert('İlanı Sil', 'Bu ilanı kalıcı olarak kaldırmak istediğinize emin misiniz?', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Evet, Sil',
        style: 'destructive',
        onPress: async () => {
          try {
            const response = await fetch(`${API_BASE_URL}/listings/${id}`, {
              method: 'DELETE',
              headers: {
                'Content-Type': 'application/json',
                'x-user-id': user?.id || '',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
              },
            });
            const resData = await response.json();
            if (resData.success) {
              Alert.alert('Silindi', 'İlanınız başarıyla kaldırıldı.');
              fetchUserProfileData();
            } else {
              Alert.alert('Hata', resData.error || 'İlan silinemedi.');
            }
          } catch (err) {
            Alert.alert('Hata', 'Bağlantı hatası.');
          }
        },
      },
    ]);
  };

  const toggleLanguage = () => {
    const nextLang = lang === 'TR' ? 'EN' : 'TR';
    setLang(nextLang);
    Alert.alert('Dil Değiştirildi', nextLang === 'TR' ? 'Uygulama dili Türkçe yapıldı.' : 'App language set to English.');
  };

  const isVerifiedMember = completionScore === 100 && user?.is_phone_verified;

  return (
    <View style={{ flex: 1, backgroundColor: '#0E1117' }}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profilim</Text>
        <TouchableOpacity 
          onPress={() => {
            setEditName(user?.display_name || '');
            setEditEmail(user?.email || '');
            setIsEditModalVisible(true);
          }}
          style={styles.headerIcon}
        >
          <Settings size={18} color="#DEFF9A" />
        </TouchableOpacity>
      </View>

      {isLoading && userListings.length === 0 ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator color="#DEFF9A" size="large" />
          <Text style={styles.loadingText}>Profil yükleniyor...</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
          {/* ── User Card ── */}
          <View style={styles.userCard}>
            {/* Avatar */}
            <View style={{ position: 'relative' }}>
              <TouchableOpacity onPress={handleAvatarPick} activeOpacity={0.8}>
                <Image
                  source={{
                    uri: user?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
                  }}
                  style={styles.avatar}
                />
                <View style={{ position: 'absolute', bottom: 4, right: 4, backgroundColor: '#0E1117', borderRadius: 12, padding: 4, borderWidth: 1, borderColor: '#DEFF9A' }}>
                  <Edit2 size={12} color="#DEFF9A" />
                </View>
              </TouchableOpacity>
              {user?.is_phone_verified && (
                <View style={[styles.verifiedBadge, { bottom: -5, right: -5 }]}>
                  <ShieldCheck size={18} color="#DEFF9A" />
                </View>
              )}
            </View>

            {/* Name + Edit */}
            <View style={styles.nameRow}>
              <Text style={styles.name}>{user?.display_name || 'Kullanıcı'}</Text>
              <TouchableOpacity
                onPress={() => {
                  setEditName(user?.display_name || '');
                  setEditEmail(user?.email || '');
                  setIsEditModalVisible(true);
                }}
                style={styles.editBtn}
              >
                <Edit2 size={12} color="#DEFF9A" />
              </TouchableOpacity>
            </View>

            <Text style={styles.phoneText}>{user?.phone_number || ''}</Text>
            {user?.email && <Text style={styles.emailText}>{user.email}</Text>}

            {/* ── Doğrulanmış Üye Rozeti ── */}
            {isVerifiedMember && (
              <View style={styles.verifiedMemberBadge}>
                <Award size={14} color="#0E1117" />
                <Text style={styles.verifiedMemberText}>Doğrulanmış Üye</Text>
              </View>
            )}

            {/* ── Star Rating Summary ── */}
            {reviewStats && reviewStats.total_reviews > 0 && (
              <View style={styles.ratingRow}>
                <StarRow rating={reviewStats.avg_rating} size={16} />
                <Text style={styles.ratingText}>
                  {reviewStats.avg_rating.toFixed(1)} ({reviewStats.total_reviews} değerlendirme)
                </Text>
              </View>
            )}

            {/* ── Profile Completion Bar ── */}
            <View style={styles.completionBox}>
              <View style={styles.completionHeader}>
                <Text style={styles.completionLabel}>Profil Tamamlama</Text>
                {completionScore === 100 ? (
                  <Text style={styles.completionDone}>Tamamlandı ✓</Text>
                ) : (
                  <Text style={styles.completionMissing}>
                    Eksik: {missingFields.join(', ')}
                  </Text>
                )}
              </View>
              <CompletionBar score={completionScore} />
            </View>

            {/* 🏪 ModoStore / Mağaza Açma/Görüntüleme Düğmesi */}
            <View style={{ width: '100%', marginTop: 12, marginBottom: 12, paddingHorizontal: 16 }}>
              {store ? (
                <TouchableOpacity
                  onPress={() => navigation?.navigate('Store', { userId: user?.id })}
                  activeOpacity={0.8}
                  style={{
                    backgroundColor: 'rgba(222,255,154,0.08)',
                    borderColor: '#DEFF9A',
                    borderWidth: 1,
                    borderRadius: 16,
                    paddingVertical: 14,
                    alignItems: 'center',
                    flexDirection: 'row',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ color: '#DEFF9A', fontWeight: '900', fontSize: 13, letterSpacing: 0.5 }}>
                    🏪 MODOSTORE MAĞAZAMI GÖR ➔
                  </Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  onPress={() => setIsStoreModalVisible(true)}
                  activeOpacity={0.8}
                  style={{
                    backgroundColor: '#DEFF9A',
                    borderRadius: 16,
                    paddingVertical: 14,
                    alignItems: 'center',
                    flexDirection: 'row',
                    justifyContent: 'center',
                    shadowColor: '#DEFF9A',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.15,
                    shadowRadius: 10,
                    elevation: 5,
                  }}
                >
                  <Text style={{ color: '#0E1117', fontWeight: '900', fontSize: 13, letterSpacing: 0.5 }}>
                    🏪 ÜCRETSİZ MODOSTORE MAĞAZANI AÇ
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Quick Stats */}
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{userListings.length}</Text>
                <Text style={styles.statLabel}>İlanlarım</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{reviewStats?.total_reviews || 0}</Text>
                <Text style={styles.statLabel}>Yorumlar</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{favorites?.length || 0}</Text>
                <Text style={styles.statLabel}>Favori</Text>
              </View>
            </View>
          </View>

          {/* Settings Options */}
          <View style={styles.settingsSection}>
            <Text style={styles.sectionLabel}>Hesap Ayarları</Text>

            <TouchableOpacity onPress={() => navigation?.navigate('WishList')} style={[styles.settingsRow, { marginBottom: 12 }]}>
              <View style={styles.settingsLeft}>
                <Bell size={18} color="#DEFF9A" />
                <Text style={styles.settingsText}>Fiyat Alarmlarım 🔔</Text>
              </View>
              <ChevronRight size={16} color="#DEFF9A" />
            </TouchableOpacity>

            <TouchableOpacity onPress={() => navigation?.navigate('Analytics')} style={[styles.settingsRow, { marginBottom: 12 }]}>
              <View style={styles.settingsLeft}>
                <TrendingUp size={18} color="#DEFF9A" />
                <Text style={styles.settingsText}>Satıcı Analitik Paneli 📊</Text>
              </View>
              <ChevronRight size={16} color="#DEFF9A" />
            </TouchableOpacity>

            {store && (
              <TouchableOpacity onPress={() => setIsStoreModalVisible(true)} style={[styles.settingsRow, { marginBottom: 12 }]}>
                <View style={styles.settingsLeft}>
                  <Settings size={18} color="#DEFF9A" />
                  <Text style={styles.settingsText}>ModoStore Ayarlarım 🏪</Text>
                </View>
                <ChevronRight size={16} color="#DEFF9A" />
              </TouchableOpacity>
            )}

            {((user as any)?.role === 'admin' || (user as any)?.email === 'admin@modosale.com') && (
              <TouchableOpacity
                onPress={() => navigation?.navigate('Admin')}
                style={[styles.settingsRow, { borderColor: '#DEFF9A', backgroundColor: 'rgba(222,255,154,0.05)', marginBottom: 12 }]}
              >
                <View style={styles.settingsLeft}>
                  <ShieldCheck size={18} color="#DEFF9A" />
                  <Text style={[styles.settingsText, { color: '#DEFF9A', fontWeight: '900' }]}>Yönetici (Admin) Paneli 🛡️</Text>
                </View>
                <ChevronRight size={16} color="#DEFF9A" />
              </TouchableOpacity>
            )}

            <TouchableOpacity onPress={toggleLanguage} style={styles.settingsRow}>
              <View style={styles.settingsLeft}>
                <Globe size={18} color="#DEFF9A" />
                <Text style={styles.settingsText}>Uygulama Dili / Language</Text>
              </View>
              <View style={styles.langChip}>
                <Text style={styles.langChipText}>{lang}</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() =>
                Alert.alert('Çıkış Yap', 'Hesabınızdan çıkış yapmak istediğinize emin misiniz?', [
                  { text: 'İptal', style: 'cancel' },
                  { text: 'Evet, Çıkış Yap', style: 'destructive', onPress: logout },
                ])
              }
              style={styles.logoutRow}
            >
              <View style={styles.settingsLeft}>
                <LogOut size={18} color="#EF4444" />
                <Text style={styles.logoutText}>Çıkış Yap</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Tab Bar */}
          <View style={styles.tabBar}>
            {[
              { key: 'my_listings', label: `İlanlarım (${userListings.length})` },
              { key: 'favorites', label: `Favoriler (${favorites?.length || 0})` },
              { key: 'reviews', label: `Yorumlar (${reviewStats?.total_reviews || 0})` },
            ].map((tab) => (
              <TouchableOpacity
                key={tab.key}
                onPress={() => setActiveTab(tab.key as any)}
                style={[styles.tab, activeTab === tab.key && styles.tabActive]}
              >
                <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Tab Content */}
          <View style={styles.tabContent}>
            {/* ─ MY LISTINGS ─ */}
            {activeTab === 'my_listings' && (
              <>
                <View style={styles.tabContentHeader}>
                  <Text style={styles.sectionLabel}>Aktif İlanlarım</Text>
                  <TouchableOpacity onPress={() => fetchUserProfileData()}>
                    <Text style={styles.refreshText}>Yenile 🔄</Text>
                  </TouchableOpacity>
                </View>
                {userListings.length === 0 ? (
                  <View style={styles.emptyBox}>
                    <Text style={styles.emptyText}>Yayında olan aktif bir ilanınız bulunmuyor.</Text>
                  </View>
                ) : (
                  userListings.map((item) => (
                    <View key={item.id} style={styles.listingCard}>
                      <Image source={{ uri: item.images[0] }} style={styles.listingThumb} />
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text numberOfLines={1} style={styles.listingTitle}>{item.title}</Text>
                        <Text style={styles.listingPrice}>{item.price.toLocaleString('tr-TR')} TL</Text>
                        <Text style={styles.listingLocation}>{item.city_district}</Text>
                      </View>
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        <TouchableOpacity onPress={() => navigation?.navigate('EditListing', { listing: item })} style={styles.bumpBtn}>
                          <Edit2 size={14} color="#DEFF9A" />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => handleBump(item.id)} style={styles.bumpBtn}>
                          <ArrowUp size={14} color="#DEFF9A" />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.deleteBtn}>
                          <Trash2 size={14} color="#EF4444" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))
                )}
              </>
            )}

            {/* ─ FAVORITES ─ */}
            {activeTab === 'favorites' && (
              <>
                <View style={styles.tabContentHeader}>
                  <Text style={styles.sectionLabel}>Favori İlanlarım</Text>
                  <TouchableOpacity onPress={() => fetchUserFavorites()}>
                    <Text style={styles.refreshText}>Yenile 🔄</Text>
                  </TouchableOpacity>
                </View>
                {isFetchingFavorites ? (
                  <ActivityIndicator color="#DEFF9A" style={{ marginTop: 24 }} />
                ) : favoriteListings.length === 0 ? (
                  <View style={styles.emptyBox}>
                    <Text style={styles.emptyText}>
                      Henüz favorilere eklediğiniz bir ilan yok. İlanları kalbe basarak kaydedebilirsiniz!
                    </Text>
                  </View>
                ) : (
                  favoriteListings.map((item) => (
                    <TouchableOpacity
                      key={item.id}
                      activeOpacity={0.85}
                      onPress={() => navigation?.navigate('ProductDetail', { product: item })}
                      style={styles.listingCard}
                    >
                      <Image source={{ uri: item.images[0] }} style={styles.listingThumb} />
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text numberOfLines={1} style={styles.listingTitle}>{item.title}</Text>
                        <Text style={styles.listingPrice}>{item.price.toLocaleString('tr-TR')} TL</Text>
                        <Text style={styles.listingLocation}>{item.city_district}</Text>
                      </View>
                      <TouchableOpacity
                        onPress={(e) => { (e as any).stopPropagation?.(); toggleFavorite(item.id); }}
                        style={styles.deleteBtn}
                      >
                        <Trash2 size={14} color="#EF4444" />
                      </TouchableOpacity>
                    </TouchableOpacity>
                  ))
                )}
              </>
            )}

            {/* ─ REVIEWS ─ */}
            {activeTab === 'reviews' && (
              <>
                <View style={styles.tabContentHeader}>
                  <Text style={styles.sectionLabel}>Aldığım Değerlendirmeler</Text>
                  {reviewStats && (
                    <View style={styles.avgBadge}>
                      <Star size={12} color="#DEFF9A" fill="#DEFF9A" />
                      <Text style={styles.avgBadgeText}>{reviewStats.avg_rating.toFixed(1)}</Text>
                    </View>
                  )}
                </View>
                {isFetchingReviews ? (
                  <ActivityIndicator color="#DEFF9A" style={{ marginTop: 24 }} />
                ) : reviews.length === 0 ? (
                  <View style={styles.emptyBox}>
                    <Text style={styles.emptyText}>
                      Henüz aldığınız bir değerlendirme yok. İlk satışınızı yapıp puan alın!
                    </Text>
                  </View>
                ) : (
                  reviews.map((rev) => (
                    <View key={rev.id} style={styles.reviewCard}>
                      <View style={styles.reviewHeader}>
                        <Image
                          source={{ uri: rev.reviewer_avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80' }}
                          style={styles.reviewAvatar}
                        />
                        <View style={{ flex: 1, marginLeft: 10 }}>
                          <Text style={styles.reviewerName}>{rev.reviewer_name}</Text>
                          <StarRow rating={rev.rating} size={13} />
                        </View>
                        <Text style={styles.reviewDate}>
                          {new Date(rev.created_at).toLocaleDateString('tr-TR')}
                        </Text>
                      </View>
                      {rev.comment && (
                        <Text style={styles.reviewComment}>{rev.comment}</Text>
                      )}
                    </View>
                  ))
                )}
              </>
            )}
          </View>
        </ScrollView>
      )}

      {/* EDIT PROFILE MODAL */}
      <Modal
        visible={isEditModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setIsEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <Text style={styles.modalTitle}>Profili Düzenle</Text>
              <TouchableOpacity onPress={() => setIsEditModalVisible(false)}>
                <Text style={styles.modalClose}>Kapat</Text>
              </TouchableOpacity>
            </View>

            {/* Modal Avatar Selection */}
            <View style={{ alignItems: 'center', marginBottom: 24, marginTop: 4 }}>
              <TouchableOpacity onPress={handleAvatarPick} activeOpacity={0.8}>
                <Image
                  source={{
                    uri: user?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
                  }}
                  style={{ width: 80, height: 80, borderRadius: 40, borderWidth: 2, borderColor: '#1E2530' }}
                />
                <View style={{ position: 'absolute', bottom: 0, right: 0, backgroundColor: '#0E1117', borderRadius: 12, padding: 4, borderWidth: 1, borderColor: '#DEFF9A' }}>
                  <Edit2 size={12} color="#DEFF9A" />
                </View>
              </TouchableOpacity>
              <Text style={{ color: '#DEFF9A', fontSize: 12, marginTop: 12, fontWeight: '700' }}>
                Profil Fotoğrafını Değiştir
              </Text>
            </View>

            <Input
              label="Ad Soyad"
              placeholder="Can Yılmaz"
              value={editName}
              onChangeText={setEditName}
              returnKeyType="done"
              onSubmitEditing={Keyboard.dismiss}
            />
            <Input
              label="E-posta Adresi"
              placeholder="can.yilmaz@example.com"
              keyboardType="email-address"
              value={editEmail}
              onChangeText={setEditEmail}
              autoCapitalize="none"
              returnKeyType="done"
              onSubmitEditing={Keyboard.dismiss}
            />
            <Button
              title="Değişiklikleri Kaydet 💾"
              isLoading={isSavingProfile}
              onPress={handleSaveProfile}
              className="mt-4"
            />
          </View>
        </View>
      </Modal>

      {/* 🏪 STOREFRONT MODOSTORE CREATION/EDIT MODAL */}
      <Modal
        visible={isStoreModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setIsStoreModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <Text style={styles.modalTitle}>{store ? 'Mağazamı Düzenle 🏪' : 'ModoStore Mağazanı Aç 🏪'}</Text>
              <TouchableOpacity onPress={() => setIsStoreModalVisible(false)}>
                <Text style={styles.modalClose}>Kapat</Text>
              </TouchableOpacity>
            </View>

            <Input
              label="Mağaza Adı"
              placeholder="Fütüristik Mağaza Adınız"
              value={storeName}
              onChangeText={setStoreName}
              returnKeyType="done"
              onSubmitEditing={Keyboard.dismiss}
            />
            <Input
              label="Mağaza Açıklaması / Bio"
              placeholder="Mağazanız ve sattığınız ürünlerle ilgili detaylı bilgi verin..."
              value={storeDesc}
              onChangeText={setStoreDesc}
              multiline
              numberOfLines={3}
              returnKeyType="done"
              onSubmitEditing={Keyboard.dismiss}
              style={{ minHeight: 60 }}
            />
            <Button
              title={store ? "Mağazayı Güncelle 💾" : "ModoMağazanı Aktif Et 🚀"}
              isLoading={isOpeningStore}
              onPress={handleOpenStore}
              className="mt-4"
            />
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    paddingTop: 60,
    paddingBottom: 14,
    paddingHorizontal: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#1E2530',
    backgroundColor: '#131820',
  },
  headerTitle: { color: '#F9FAFB', fontSize: 17, fontWeight: '900' },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#0E1117',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: { color: '#9CA3AF', fontSize: 12, fontWeight: '600', marginTop: 10 },

  userCard: {
    padding: 24,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#1E2530',
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 2,
    borderColor: '#DEFF9A',
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#0E1117',
    padding: 4,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: '#1E2530',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    gap: 8,
  },
  name: { color: '#F9FAFB', fontSize: 20, fontWeight: '900' },
  editBtn: {
    padding: 6,
    backgroundColor: '#1E2530',
    borderRadius: 99,
    borderWidth: 1,
    borderColor: '#2E3849',
  },
  phoneText: { color: '#9CA3AF', fontSize: 12, fontWeight: '600', marginTop: 4 },
  emailText: { color: '#9CA3AF', fontSize: 11, fontWeight: '600', marginTop: 2 },

  verifiedMemberBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#DEFF9A',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 99,
    marginTop: 12,
  },
  verifiedMemberText: { color: '#0E1117', fontSize: 12, fontWeight: '900' },

  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
  ratingText: { color: '#9CA3AF', fontSize: 12, fontWeight: '600' },

  completionBox: {
    width: '100%',
    marginTop: 16,
    backgroundColor: '#131820',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1E2530',
    padding: 14,
  },
  completionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  completionLabel: { color: '#9CA3AF', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 },
  completionDone: { color: '#DEFF9A', fontSize: 11, fontWeight: '800' },
  completionMissing: { color: '#F87171', fontSize: 10, fontWeight: '600', maxWidth: '55%', textAlign: 'right' },
  progressContainer: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  progressTrack: {
    flex: 1,
    height: 7,
    backgroundColor: '#1E2530',
    borderRadius: 99,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 99 },
  progressText: { fontSize: 12, fontWeight: '900', minWidth: 36, textAlign: 'right' },

  statsRow: {
    flexDirection: 'row',
    width: '100%',
    backgroundColor: '#131820',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1E2530',
    marginTop: 16,
    padding: 14,
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statItem: { alignItems: 'center' },
  statValue: { color: '#DEFF9A', fontSize: 18, fontWeight: '900' },
  statLabel: { color: '#9CA3AF', fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 4 },
  statDivider: { width: 1, height: 32, backgroundColor: '#1E2530' },

  settingsSection: { paddingHorizontal: 24, paddingVertical: 20 },
  sectionLabel: { color: '#9CA3AF', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 12 },
  settingsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#131820',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1E2530',
    marginBottom: 10,
  },
  settingsLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  settingsText: { color: '#F9FAFB', fontSize: 14, fontWeight: '600' },
  langChip: { backgroundColor: '#0E1117', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 10, borderWidth: 1, borderColor: '#1E2530' },
  langChipText: { color: '#DEFF9A', fontSize: 12, fontWeight: '900' },
  logoutRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(239,68,68,0.08)',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.2)',
    marginBottom: 10,
  },
  logoutText: { color: '#EF4444', fontSize: 14, fontWeight: '800' },

  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#1E2530',
    paddingHorizontal: 20,
  },
  tab: { flex: 1, paddingBottom: 12, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: '#DEFF9A' },
  tabText: { color: '#9CA3AF', fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  tabTextActive: { color: '#DEFF9A' },

  tabContent: { paddingHorizontal: 20, paddingTop: 20 },
  tabContentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  refreshText: { color: '#DEFF9A', fontSize: 12, fontWeight: '700' },

  emptyBox: {
    backgroundColor: '#131820',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1E2530',
    padding: 24,
    alignItems: 'center',
  },
  emptyText: { color: '#9CA3AF', fontSize: 12, fontWeight: '600', textAlign: 'center', lineHeight: 20 },

  listingCard: {
    backgroundColor: '#131820',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1E2530',
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  listingThumb: { width: 60, height: 60, borderRadius: 12, borderWidth: 1, borderColor: '#1E2530' },
  listingTitle: { color: '#F9FAFB', fontWeight: '800', fontSize: 13 },
  listingPrice: { color: '#DEFF9A', fontWeight: '900', fontSize: 12, marginTop: 3 },
  listingLocation: { color: '#9CA3AF', fontSize: 10, fontWeight: '600', marginTop: 2, textTransform: 'uppercase' },
  bumpBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#0E1117', borderWidth: 1, borderColor: '#1E2530', alignItems: 'center', justifyContent: 'center' },
  deleteBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(239,68,68,0.1)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)', alignItems: 'center', justifyContent: 'center' },

  avgBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#1E2530',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  avgBadgeText: { color: '#DEFF9A', fontSize: 12, fontWeight: '900' },

  reviewCard: {
    backgroundColor: '#131820',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1E2530',
    padding: 14,
    marginBottom: 10,
  },
  reviewHeader: { flexDirection: 'row', alignItems: 'center' },
  reviewAvatar: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: '#1E2530' },
  reviewerName: { color: '#F9FAFB', fontWeight: '800', fontSize: 13, marginBottom: 4 },
  reviewDate: { color: '#9CA3AF', fontSize: 10, fontWeight: '600' },
  reviewComment: { color: '#D1D5DB', fontSize: 13, marginTop: 10, lineHeight: 20 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(14,17,23,0.92)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: '#131820', borderTopLeftRadius: 28, borderTopRightRadius: 28, borderTopWidth: 1, borderColor: '#1E2530', padding: 24, paddingBottom: 48 },
  modalHandle: { width: 48, height: 5, backgroundColor: '#1E2530', borderRadius: 3, alignSelf: 'center', marginBottom: 20 },
  modalTitle: { color: '#F9FAFB', fontSize: 17, fontWeight: '900' },
  modalClose: { color: '#9CA3AF', fontSize: 14, fontWeight: '600' },
});
