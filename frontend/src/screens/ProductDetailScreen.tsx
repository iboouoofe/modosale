import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Image, TouchableOpacity, Alert, Linking, Share, Modal, TextInput, ActivityIndicator } from 'react-native';
import { ChevronLeft, MessageSquare, Phone, MapPin, Calendar, ShieldCheck, Share2, Heart, RefreshCw, X, AlertCircle, Play } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth, API_BASE_URL } from '../context/AuthContext';
import { Video as ExpoVideo, ResizeMode } from 'expo-av';

const CATEGORY_EN_TO_TR: { [key: string]: string } = {
  'Electronics': 'Elektronik ⚡',
  'Fashion': 'Moda & Giyim 👕',
  'Home & Living': 'Ev & Yaşam 🏠',
  'Sports & Outdoor': 'Spor & Outdoor ⚽',
  'Books & Hobbies': 'Kitap & Hobi 📚',
  'Baby & Kids': 'Bebek & Çocuk 🧸',
  'Other': 'Diğer 📦'
};

export const ProductDetailScreen: React.FC<{ route: any; navigation: any }> = ({ route, navigation }) => {
  const { product } = route.params;
  const insets = useSafeAreaInsets();
  const { isFavorite, toggleFavorite, user, token } = useAuth();

  // --- Swap (Takas) States ---
  const [isSwapModalVisible, setIsSwapModalVisible] = useState(false);
  const [userListings, setUserListings] = useState<any[]>([]);
  const [isLoadingListings, setIsLoadingListings] = useState(false);
  const [selectedOfferedId, setSelectedOfferedId] = useState<string | null>(null);
  const [cashDiff, setCashDiff] = useState('');
  const [cashDirection, setCashDirection] = useState<'offerer' | 'seller' | 'none'>('none');
  const [swapNote, setSwapNote] = useState('');
  const [isSubmittingSwap, setIsSubmittingSwap] = useState(false);
  const [isVideoPlayerVisible, setIsVideoPlayerVisible] = useState(false);

  // Fetch user's listings when modal opens
  useEffect(() => {
    if (isSwapModalVisible && user) {
      (async () => {
        setIsLoadingListings(true);
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
            const activeListings = (resData.listings || []).filter((l: any) => l.is_active && l.id !== product.id);
            setUserListings(activeListings);
            if (activeListings.length > 0) {
              setSelectedOfferedId(activeListings[0].id);
            }
          }
        } catch (err) {
          console.error('[Swap] Error fetching user listings:', err);
        } finally {
          setIsLoadingListings(false);
        }
      })();
    }
  }, [isSwapModalVisible, user]);

  const handleSendSwapOffer = async () => {
    if (!selectedOfferedId) {
      Alert.alert('Hata', 'Lütfen takas etmek istediğiniz ilanı seçin.');
      return;
    }

    setIsSubmittingSwap(true);
    try {
      const response = await fetch(`${API_BASE_URL}/swaps`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user?.id || '',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          listing_id: product.id,
          offered_listing_id: selectedOfferedId,
          cash_difference: cashDiff ? parseInt(cashDiff) : 0,
          cash_direction: cashDirection,
          note: swapNote,
        }),
      });

      const resData = await response.json();
      setIsSubmittingSwap(false);

      if (resData.success) {
        Alert.alert('Tebrikler 🎉', 'Takas teklifiniz başarıyla gönderildi ve sohbet odasına eklendi.', [
          {
            text: 'Sohbete Git',
            onPress: () => {
              setIsSwapModalVisible(false);
              navigation.navigate('ChatView', {
                roomId: resData.chat_room_id,
                product: product,
              });
            },
          },
        ]);
      } else {
        Alert.alert('Hata', resData.error || 'Teklif gönderilemedi.');
      }
    } catch (err: any) {
      setIsSubmittingSwap(false);
      console.error('[Swap] Send offer error:', err);
      Alert.alert('Hata', 'Bir ağ hatası oluştu.');
    }
  };

  const handleSendMessage = () => {
    // Navigate directly to the ChatView Stack screen
    navigation.navigate('ChatView', {
      roomId: `room-for-${product.id}`,
      product: product,
    });
  };

  const handlePhoneCall = () => {
    if (!product.show_phone) {
      Alert.alert('Hata', 'Bu satıcı telefonla iletişimi kapatmış.');
      return;
    }
    
    // Simulate linking to default phone application
    const phoneUrl = `tel:+905551234567`;
    Linking.canOpenURL(phoneUrl)
      .then((supported) => {
        if (!supported) {
          Alert.alert('Hata', 'Telefon araması cihazınız tarafından desteklenmiyor.');
        } else {
          return Linking.openURL(phoneUrl);
        }
      })
      .catch((err) => console.error('Error linking dialer:', err));
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `${product.title} - ${product.price.toLocaleString('tr-TR')} TL fiyatıyla Modosale uygulamasında satılık. Hemen yakından incele!`,
      });
    } catch (error: any) {
      console.error('Error sharing product:', error.message);
    }
  };

  return (
    <View className="flex-1 bg-dark">
      
      {/* Scrollable specs */}
      <ScrollView 
        className="flex-1"
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 16) + 160 }} 
        showsVerticalScrollIndicator={false}
      >
        
        {/* Relative Image Display Box */}
        <View style={{ aspectRatio: 4 / 3 }} className="relative w-full bg-dark-input">
          <Image
            source={{ uri: product.images[0] }}
            className="w-full h-full"
            resizeMode="cover"
          />

          {/* Floating Absolute Nav Headers */}
          <View 
            style={{ top: Math.max(insets.top, 16) }}
            className="absolute left-6 right-6 flex-row justify-between items-center z-10"
          >
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              className="w-10 h-10 rounded-full bg-dark/85 justify-center items-center border border-dark-border"
            >
              <ChevronLeft size={22} color="#DEFF9A" />
            </TouchableOpacity>

            <View className="flex-row items-center">
              <TouchableOpacity
                onPress={handleShare}
                className="w-10 h-10 rounded-full bg-dark/85 justify-center items-center border border-dark-border mr-2"
              >
                <Share2 size={16} color="#DEFF9A" />
              </TouchableOpacity>

              {user && (
                <TouchableOpacity
                  onPress={() => toggleFavorite(product.id)}
                  className="w-10 h-10 rounded-full bg-dark/85 justify-center items-center border border-dark-border"
                >
                  <Heart
                    size={16}
                    color={isFavorite(product.id) ? '#EF4444' : '#DEFF9A'}
                    fill={isFavorite(product.id) ? '#EF4444' : 'transparent'}
                  />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Absolute Category Label */}
          <View className="absolute bottom-4 left-6 bg-neon px-3.5 py-1.5 rounded-xl shadow-lg">
            <Text className="text-dark font-extrabold text-[10px] uppercase tracking-widest">
              {CATEGORY_EN_TO_TR[product.category] || product.category}
            </Text>
          </View>

          {product.video_url && (
            <TouchableOpacity
              onPress={() => setIsVideoPlayerVisible(true)}
              activeOpacity={0.8}
              className="absolute bottom-4 right-6 bg-dark/90 border border-neon/50 px-3.5 py-1.5 rounded-xl shadow-lg flex-row items-center active:scale-95"
            >
              <Play size={10} color="#DEFF9A" fill="#DEFF9A" className="mr-1.5" />
              <Text className="text-neon font-extrabold text-[10px] uppercase tracking-widest">
                VİDEO İLAN ▶
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Content Box */}
        <View className="p-6">
          
          {/* Proximity Location and Date metadata list */}
          <View className="mb-5">
            <View className="flex-row items-center mb-2.5">
              <MapPin size={14} color="#DEFF9A" />
              <Text className="text-neon text-xs font-extrabold ml-2 flex-1" numberOfLines={1}>
                {product.distance_meters ? `${(product.distance_meters / 1000).toFixed(1)} km uzakta` : 'Yakınlarda'} • {product.city_district}
              </Text>
            </View>
            <View className="flex-row items-center">
              <Calendar size={14} color="#9CA3AF" />
              <Text className="text-muted text-xs font-bold ml-2 flex-1" numberOfLines={1}>
                2 saat önce yüklendi
              </Text>
            </View>
          </View>

          {/* Product Title */}
          <Text className="text-light text-2xl font-black tracking-tight leading-tight mb-3">
            {product.title}
          </Text>

          {/* Large Price Badge */}
          <Text className="text-neon text-3xl font-black tracking-tighter mb-4">
            {product.price.toLocaleString('tr-TR')} {product.currency || 'TL'}
          </Text>

          {/* Divider */}
          <View className="h-[1px] bg-dark-border my-5" />

          {/* Seller Widget Info card */}
          <Text className="text-muted text-xs font-bold uppercase tracking-widest mb-3 pl-0.5">Satıcı Bilgileri</Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('Store', { userId: product.user_id })}
            activeOpacity={0.8}
            className="flex-row items-center bg-dark-card p-4 rounded-2xl border border-dark-border mb-6 active:scale-95"
          >
            <Image
              source={{ uri: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80' }}
              className="w-12 h-12 rounded-full border border-neon"
            />
            <View className="ml-3 flex-1">
              <View className="flex-row items-center">
                <Text className="text-light font-black text-sm">Zeynep Yılmaz</Text>
                <View className="ml-1.5 flex-row items-center bg-neon/10 px-1.5 py-0.5 rounded-full">
                  <ShieldCheck size={10} color="#DEFF9A" />
                  <Text className="text-neon text-[8px] font-bold ml-0.5 uppercase tracking-wider">Onaylı</Text>
                </View>
              </View>
              <Text className="text-muted text-xs font-semibold mt-0.5">Katılım: Mart 2026 • 24 Aktif İlan • Mağazayı Gör 🏪</Text>
            </View>
          </TouchableOpacity>

          {/* Description Text */}
          <Text className="text-muted text-xs font-bold uppercase tracking-widest mb-3 pl-0.5">Ürün Açıklaması</Text>
          <Text className="text-light/90 text-base leading-relaxed font-normal mb-6">
            {product.description}
          </Text>

          {/* Barter / Swap Invitation Box */}
          {user && String(product.user_id) !== String(user.id) && (
            <View className="bg-neon/10 border border-neon/30 p-5 rounded-2xl mb-6 shadow-[0_0_15px_rgba(222,255,154,0.1)]">
              <View className="flex-row items-center mb-2.5">
                <View className="bg-neon px-2.5 py-1 rounded-lg mr-2">
                  <Text className="text-dark font-extrabold text-[9px] uppercase tracking-wider">TAKAS AKTİF 🔄</Text>
                </View>
                <Text className="text-neon font-black text-sm">Hemen Takas Teklif Et</Text>
              </View>
              <Text className="text-light/80 text-xs leading-relaxed mb-4">
                Kendi ilanlarından birini teklif et, gerekirse nakit fark belirterek satıcıyla anında güvenli takas anlaşması başlat.
              </Text>
              <TouchableOpacity
                onPress={() => setIsSwapModalVisible(true)}
                activeOpacity={0.8}
                className="bg-neon py-3.5 rounded-xl items-center justify-center flex-row shadow-lg active:scale-95"
              >
                <RefreshCw size={16} color="#0E1117" />
                <Text className="text-dark font-extrabold text-sm ml-1.5">Takas Teklifi Ver</Text>
              </TouchableOpacity>
            </View>
          )}

        </View>
      </ScrollView>

      {/* Sticky Bottom CTAs Panel */}
      <View 
        style={{ paddingBottom: Math.max(insets.bottom, 16) + 16 }}
        className="absolute bottom-0 left-0 right-0 p-6 bg-dark/95 border-t border-dark-border flex-row items-center justify-between z-20"
      >
        
        {user && String(product.user_id) === String(user.id) ? (
          <TouchableOpacity
            onPress={() => navigation.navigate('EditListing', { listing: product })}
            activeOpacity={0.8}
            className="flex-row h-14 w-full bg-neon rounded-2xl justify-center items-center active:scale-95"
          >
            <Text className="text-dark font-extrabold text-base">İlanı Düzenle / Revize Et ✏️</Text>
          </TouchableOpacity>
        ) : product.show_phone ? (
          <>
            <TouchableOpacity
              onPress={handlePhoneCall}
              activeOpacity={0.8}
              className="flex-row h-14 w-[30%] bg-dark-card border border-dark-border rounded-2xl justify-center items-center active:scale-95"
            >
              <Phone size={20} color="#DEFF9A" />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleSendMessage}
              activeOpacity={0.8}
              className="flex-row h-14 w-[65%] bg-neon rounded-2xl justify-center items-center active:scale-95"
            >
              <MessageSquare size={18} color="#121212" />
              <Text className="text-dark font-extrabold text-base ml-2.5">Mesaj Gönder</Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity
            onPress={handleSendMessage}
            activeOpacity={0.8}
            className="flex-row h-14 w-full bg-neon rounded-2xl justify-center items-center active:scale-95"
          >
            <MessageSquare size={18} color="#121212" />
            <Text className="text-dark font-extrabold text-base ml-2.5">Satıcıyla Mesajlaş</Text>
          </TouchableOpacity>
        )}

      </View>

      {/* 🔄 TAKAS TEKLİFİ MODALI */}
      <Modal
        visible={isSwapModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsSwapModalVisible(false)}
      >
        <View className="flex-1 bg-dark/95 justify-end">
          <View 
            style={{ 
              borderTopLeftRadius: 28, 
              borderTopRightRadius: 28,
              maxHeight: '90%',
              paddingBottom: Math.max(insets.bottom, 16) + 16
            }} 
            className="bg-dark-card border-t border-dark-border p-6"
          >
            {/* Header */}
            <View className="flex-row justify-between items-center mb-6">
              <View className="flex-row items-center">
                <RefreshCw size={20} color="#DEFF9A" />
                <Text className="text-light font-black text-lg ml-2">Takas Teklifi Oluştur</Text>
              </View>
              <TouchableOpacity 
                onPress={() => setIsSwapModalVisible(false)}
                className="w-8 h-8 rounded-full bg-dark justify-center items-center border border-dark-border"
              >
                <X size={16} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              
              {/* Product Info Summary */}
              <View className="flex-row items-center bg-dark p-3 rounded-xl mb-6 border border-dark-border">
                <Image source={{ uri: product.images[0] }} className="w-12 h-12 rounded-lg" />
                <View className="ml-3 flex-1">
                  <Text className="text-muted text-[10px] font-bold uppercase tracking-wider">Hedef Ürün</Text>
                  <Text className="text-light font-black text-sm" numberOfLines={1}>{product.title}</Text>
                  <Text className="text-neon text-xs font-extrabold mt-0.5">{product.price.toLocaleString('tr-TR')} TL</Text>
                </View>
              </View>

              {isLoadingListings ? (
                <View className="py-12 items-center">
                  <ActivityIndicator size="large" color="#DEFF9A" />
                  <Text className="text-muted text-xs mt-3">İlanlarınız yükleniyor...</Text>
                </View>
              ) : userListings.length === 0 ? (
                <View className="py-8 px-4 bg-dark rounded-xl items-center border border-dark-border mb-6">
                  <AlertCircle size={32} color="#EF4444" />
                  <Text className="text-light font-extrabold text-sm mt-3 text-center">Aktif İlanınız Bulunmuyor</Text>
                  <Text className="text-muted text-xs mt-1 text-center leading-relaxed">
                    Takas teklif edebilmek için önce yayında olan en az bir aktif ilanınız olmalıdır.
                  </Text>
                  <TouchableOpacity
                    onPress={() => {
                      setIsSwapModalVisible(false);
                      navigation.navigate('AddListing');
                    }}
                    className="bg-neon/10 border border-neon/30 px-6 py-2.5 rounded-lg mt-4"
                  >
                    <Text className="text-neon font-extrabold text-xs">Hemen İlan Yayınla ✨</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  {/* Select Offered Product */}
                  <Text className="text-light font-black text-sm mb-3">Hangi İlanınızı Teklif Ediyorsunuz?</Text>
                  <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false} 
                    className="flex-row mb-6"
                    contentContainerStyle={{ gap: 12 }}
                  >
                    {userListings.map((item) => {
                      const isSelected = selectedOfferedId === item.id;
                      return (
                        <TouchableOpacity
                          key={item.id}
                          onPress={() => setSelectedOfferedId(item.id)}
                          activeOpacity={0.9}
                          style={{ width: 140 }}
                          className={`bg-dark rounded-2xl p-2.5 border ${
                            isSelected ? 'border-neon bg-neon/5' : 'border-dark-border'
                          }`}
                        >
                          <Image source={{ uri: item.images[0] }} className="w-full h-24 rounded-xl mb-2" />
                          <Text className="text-light font-black text-xs" numberOfLines={1}>{item.title}</Text>
                          <Text className="text-neon font-black text-[10px] mt-0.5">{item.price.toLocaleString('tr-TR')} TL</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>

                  {/* Cash Difference Section */}
                  <Text className="text-light font-black text-sm mb-3">Nakit Fark Durumu (Opsiyonel)</Text>
                  
                  {/* Direction Selector */}
                  <View className="flex-row bg-dark p-1 rounded-xl mb-4 border border-dark-border">
                    <TouchableOpacity
                      onPress={() => { setCashDirection('none'); setCashDiff(''); }}
                      className={`flex-1 py-2.5 rounded-lg items-center ${cashDirection === 'none' ? 'bg-neon' : ''}`}
                    >
                      <Text className={`font-extrabold text-xs ${cashDirection === 'none' ? 'text-dark' : 'text-muted'}`}>Kafa Kafaya</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => setCashDirection('offerer')}
                      className={`flex-1 py-2.5 rounded-lg items-center ${cashDirection === 'offerer' ? 'bg-neon' : ''}`}
                    >
                      <Text className={`font-extrabold text-xs ${cashDirection === 'offerer' ? 'text-dark' : 'text-muted'}`}>Fark Öderim</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => setCashDirection('seller')}
                      className={`flex-1 py-2.5 rounded-lg items-center ${cashDirection === 'seller' ? 'bg-neon' : ''}`}
                    >
                      <Text className={`font-extrabold text-xs ${cashDirection === 'seller' ? 'text-dark' : 'text-muted'}`}>Fark Beklerim</Text>
                    </TouchableOpacity>
                  </View>

                  {cashDirection !== 'none' && (
                    <View className="bg-dark p-4 rounded-xl mb-6 border border-dark-border flex-row items-center">
                      <TextInput
                        placeholder="Nakit fark miktarı"
                        placeholderTextColor="#4B5563"
                        keyboardType="numeric"
                        value={cashDiff}
                        onChangeText={setCashDiff}
                        className="flex-1 text-light font-extrabold text-sm p-0 h-10"
                      />
                      <Text className="text-neon font-black text-sm ml-2">TL</Text>
                    </View>
                  )}

                  {/* Optional Note */}
                  <Text className="text-light font-black text-sm mb-3">Teklif Notu (İsteğe Bağlı)</Text>
                  <View className="bg-dark p-4 rounded-xl mb-6 border border-dark-border">
                    <TextInput
                      placeholder="Teklifinizle ilgili detayları veya sormak istediklerinizi yazın..."
                      placeholderTextColor="#4B5563"
                      multiline
                      numberOfLines={3}
                      value={swapNote}
                      onChangeText={setSwapNote}
                      className="text-light text-xs leading-relaxed p-0 min-h-[60px]"
                      style={{ textAlignVertical: 'top' }}
                    />
                  </View>

                  {/* Submit CTA */}
                  <TouchableOpacity
                    onPress={handleSendSwapOffer}
                    disabled={isSubmittingSwap}
                    activeOpacity={0.8}
                    className="bg-neon py-4 rounded-2xl items-center justify-center flex-row shadow-lg mt-2 active:scale-95"
                  >
                    {isSubmittingSwap ? (
                      <ActivityIndicator size="small" color="#0E1117" />
                    ) : (
                      <>
                        <RefreshCw size={16} color="#0E1117" />
                        <Text className="text-dark font-black text-base ml-2">Takas Teklifini Gönder</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </>
              )}

            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* 📹 FÜTÜRİSTİK VİDEO OYNATICI MODAL */}
      <Modal
        visible={isVideoPlayerVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setIsVideoPlayerVisible(false)}
      >
        <View className="flex-1 bg-dark/98 justify-center items-center p-6">
          <View className="w-full bg-dark-card border border-dark-border rounded-3xl overflow-hidden shadow-2xl relative">
            {/* Close Button */}
            <TouchableOpacity
              onPress={() => setIsVideoPlayerVisible(false)}
              className="absolute top-4 right-4 z-50 w-10 h-10 rounded-full bg-dark/85 justify-center items-center border border-dark-border"
            >
              <X size={20} color="#DEFF9A" />
            </TouchableOpacity>

            <Text className="text-light text-center font-black text-sm my-5 uppercase tracking-wider">Ürün Videosu</Text>

            {product.video_url && (
              <ExpoVideo
                source={{ uri: product.video_url }}
                rate={1.0}
                volume={1.0}
                isMuted={false}
                resizeMode={ResizeMode.CONTAIN}
                shouldPlay
                isLooping
                useNativeControls
                style={{ width: '100%', height: 350 }}
              />
            )}

            <View className="p-6 bg-dark-input flex-row justify-between items-center">
              <View className="flex-1 pr-4">
                <Text className="text-neon text-[10px] font-black uppercase tracking-wider">ModoSale Video Player</Text>
                <Text className="text-muted text-[11px] mt-0.5 leading-relaxed">Bu ilan satıcı tarafından eklenmiş bir tanıtım videosuna sahiptir.</Text>
              </View>
              <TouchableOpacity
                onPress={() => setIsVideoPlayerVisible(false)}
                className="bg-neon px-5 py-2.5 rounded-xl active:scale-95"
              >
                <Text className="text-dark font-black text-xs">Kapat</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </View>
  );
};
