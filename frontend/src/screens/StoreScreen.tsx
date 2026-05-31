import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Image, TouchableOpacity, ActivityIndicator, Alert, Dimensions, FlatList } from 'react-native';
import { ChevronLeft, UserPlus, UserCheck, MessageSquare, Star, ShieldCheck, MapPin } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth, API_BASE_URL } from '../context/AuthContext';
import { ProductCard } from '../components/ProductCard';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface StoreData {
  id: number;
  user_id: string;
  name: string;
  description: string;
  banner_url: string;
  logo_url: string;
  follower_count: number;
  is_following: boolean;
}

export const StoreScreen: React.FC<{ route: any; navigation: any }> = ({ route, navigation }) => {
  const insets = useSafeAreaInsets();
  const { userId } = route.params; // Owner of the storefront store
  const { user, token } = useAuth();

  const [isLoading, setIsLoading] = useState(true);
  const [store, setStore] = useState<StoreData | null>(null);
  const [listings, setListings] = useState<any[]>([]);

  const fetchStoreData = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/stores/user/${userId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user?.id || '',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      const resData = await response.json();
      if (resData.success) {
        setStore(resData.store);
        setListings(resData.listings || []);
      }
    } catch (err) {
      console.error('[StoreScreen] Error fetching store details:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStoreData();
  }, [userId]);

  const handleToggleFollow = async () => {
    if (!user) {
      Alert.alert('Giriş Yapın', 'Mağazaları takip edebilmek için giriş yapmalısınız.');
      return;
    }
    if (!store) return;

    try {
      const response = await fetch(`${API_BASE_URL}/stores/follow`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id,
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ storeId: store.id }),
      });
      const resData = await response.json();
      if (resData.success) {
        setStore(prev => prev ? {
          ...prev,
          is_following: resData.is_following,
          follower_count: resData.follower_count
        } : null);
      }
    } catch (err) {
      console.error('[StoreScreen] Follow error:', err);
    }
  };

  const handleSendMessage = () => {
    if (!user) return;
    if (listings.length > 0) {
      navigation.navigate('ChatView', {
        roomId: `room-for-${listings[0].id}`,
        product: listings[0],
      });
    } else {
      Alert.alert('Hata', 'Bu mağazanın aktif ilanı bulunmadığı için doğrudan sohbet başlatılamıyor.');
    }
  };

  if (isLoading) {
    return (
      <View className="flex-1 bg-dark items-center justify-center">
        <ActivityIndicator size="large" color="#DEFF9A" />
        <Text className="text-muted text-xs mt-3">Mağaza vitrini yükleniyor...</Text>
      </View>
    );
  }

  // If the user has not opened a store yet, show custom invite / empty view
  if (!store) {
    return (
      <View className="flex-1 bg-dark">
        <View 
          style={{ paddingTop: Math.max(insets.top, 16) }}
          className="px-6 pb-4 border-b border-dark-border bg-dark-card flex-row items-center"
        >
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            className="mr-3 w-8 h-8 rounded-full bg-dark flex justify-center items-center"
          >
            <ChevronLeft size={18} color="#DEFF9A" />
          </TouchableOpacity>
          <Text className="text-light font-black text-base">ModoStore 🏪</Text>
        </View>
        <View className="flex-1 items-center justify-center p-6">
          <Image 
            source={{ uri: 'https://images.unsplash.com/photo-1468436139062-f60a71c5c892?auto=format&fit=crop&w=300&q=80' }} 
            className="w-24 h-24 rounded-2xl opacity-50 mb-6" 
          />
          <Text className="text-light font-black text-lg mb-2">Mağaza Bulunamadı</Text>
          <Text className="text-muted text-xs text-center leading-relaxed max-w-xs">
            Bu kullanıcı henüz kendi fütüristik ModoMağazasını açmamış. Kendi mağazanızı açmak için Profilim sayfasını ziyaret edin!
          </Text>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            className="bg-neon/10 border border-neon/30 px-6 py-2.5 rounded-xl mt-6 active:scale-95"
          >
            <Text className="text-neon font-extrabold text-xs">Geri Dön</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const isOwner = user && String(store.user_id) === String(user.id);

  return (
    <View className="flex-1 bg-dark">
      <ScrollView 
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 16) + 32 }}
      >
        
        {/* Banner Section */}
        <View className="relative w-full h-44 bg-dark-input">
          <Image
            source={{ uri: store.banner_url || 'https://images.unsplash.com/photo-1468436139062-f60a71c5c892?auto=format&fit=crop&w=800&q=80' }}
            className="w-full h-full"
            resizeMode="cover"
          />
          
          {/* Floating Back Icon */}
          <TouchableOpacity
            style={{ top: Math.max(insets.top, 16) }}
            onPress={() => navigation.goBack()}
            className="absolute left-6 w-10 h-10 rounded-full bg-dark/85 justify-center items-center border border-dark-border z-10"
          >
            <ChevronLeft size={22} color="#DEFF9A" />
          </TouchableOpacity>

          {/* Absolute Dark Overlay for premium text visibility */}
          <View className="absolute inset-0 bg-gradient-to-t from-dark to-transparent opacity-80" />
        </View>

        {/* Profile Card & Info Widget */}
        <View className="px-6 -mt-10 items-center">
          <Image
            source={{ uri: store.logo_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80' }}
            className="w-20 h-20 rounded-full border-2 border-neon bg-dark-card"
          />

          <View className="flex-row items-center mt-3">
            <Text className="text-light font-black text-xl text-center">{store.name}</Text>
            <View className="ml-1.5 flex-row items-center bg-neon/10 px-2 py-0.5 rounded-full border border-neon/20">
              <ShieldCheck size={10} color="#DEFF9A" />
              <Text className="text-neon text-[8px] font-black uppercase tracking-wider ml-0.5">MAĞAZA</Text>
            </View>
          </View>

          {/* Rating */}
          <View className="flex-row items-center mt-1">
            <Star size={12} color="#DEFF9A" fill="#DEFF9A" />
            <Text className="text-neon text-xs font-black ml-1">4.9</Text>
            <Text className="text-muted text-xs font-semibold ml-2">• 14 Değerlendirme</Text>
          </View>

          <Text className="text-light/80 text-xs text-center leading-relaxed mt-3 max-w-sm">
            {store.description || 'Bu fütüristik ModoMağaza için henüz bir açıklama girilmemiş.'}
          </Text>

          {/* Stat metrics row */}
          <View className="flex-row items-center justify-around bg-dark-card border border-dark-border py-4 px-6 rounded-2xl w-full mt-5">
            <View className="items-center flex-1">
              <Text className="text-light text-lg font-black">{store.follower_count}</Text>
              <Text className="text-muted text-[9px] font-bold uppercase tracking-wider mt-0.5">Takipçi</Text>
            </View>
            <View className="h-6 w-[1px] bg-dark-border" />
            <View className="items-center flex-1">
              <Text className="text-light text-lg font-black">{listings.length}</Text>
              <Text className="text-muted text-[9px] font-bold uppercase tracking-wider mt-0.5">Aktif İlan</Text>
            </View>
          </View>

          {/* Actions Row */}
          {!isOwner && (
            <View className="flex-row items-center justify-between w-full mt-4">
              <TouchableOpacity
                onPress={handleToggleFollow}
                activeOpacity={0.8}
                className={`flex-row h-12 w-[48%] rounded-xl justify-center items-center active:scale-95 ${
                  store.is_following ? 'bg-dark-card border border-dark-border' : 'bg-neon'
                }`}
              >
                {store.is_following ? (
                  <>
                    <UserCheck size={16} color="#DEFF9A" />
                    <Text className="text-neon font-extrabold text-sm ml-2">Takip Ediliyor</Text>
                  </>
                ) : (
                  <>
                    <UserPlus size={16} color="#0E1117" />
                    <Text className="text-dark font-extrabold text-sm ml-2">Takip Et</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleSendMessage}
                activeOpacity={0.8}
                className="flex-row h-12 w-[48%] bg-dark-card border border-dark-border rounded-xl justify-center items-center active:scale-95"
              >
                <MessageSquare size={16} color="#DEFF9A" />
                <Text className="text-neon font-extrabold text-sm ml-2">Mesaj Gönder</Text>
              </TouchableOpacity>
            </View>
          )}

        </View>

        {/* Store Listings Vitrin */}
        <View className="px-6 mt-8">
          <Text className="text-muted text-xs font-bold uppercase tracking-widest mb-4 pl-0.5">Mağaza Vitrini</Text>
          {listings.length === 0 ? (
            <View className="py-12 items-center bg-dark-card border border-dark-border rounded-2xl p-6">
              <Text className="text-light font-extrabold text-sm mb-1 text-center">Aktif Ürün Bulunmuyor</Text>
              <Text className="text-muted text-xs text-center leading-relaxed">
                Bu mağazada şu an satılık aktif bir ilan bulunmamaktadır. Daha sonra tekrar kontrol edin!
              </Text>
            </View>
          ) : (
            <View className="flex-row flex-wrap justify-between">
              {listings.map((item) => (
                <ProductCard
                  key={item.id}
                  item={item}
                  onPress={() => navigation.navigate('ProductDetail', { product: item })}
                />
              ))}
            </View>
          )}
        </View>

      </ScrollView>
    </View>
  );
};
