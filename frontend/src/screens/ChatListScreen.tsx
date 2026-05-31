import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  TextInput,
  StyleSheet,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { MessageSquare, Search, ChevronRight } from 'lucide-react-native';
import { useAuth, API_BASE_URL } from '../context/AuthContext';
import { SkeletonChatList } from '../components/SkeletonListItem';
import { OfflineBanner } from '../components/OfflineBanner';

interface ChatRoomItem {
  id: string;
  listing_title: string;
  listing_price: number;
  listing_thumbnail: string;
  partner_name: string;
  partner_avatar: string;
  last_message: string;
  last_message_time: string;
  unread: boolean;
}

const CACHE_KEY = 'modosale_chatrooms_cache';
const CACHE_TTL_MS = 3 * 60 * 1000; // 3 minutes

export const ChatListScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { user, token } = useAuth();
  const [rooms, setRooms] = useState<ChatRoomItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [isOffline, setIsOffline] = useState(false);

  // ─── NetInfo ──────────────────────────────────────────────────────────
  useEffect(() => {
    const unsub = NetInfo.addEventListener((state) => {
      setIsOffline(!state.isConnected);
    });
    return () => unsub();
  }, []);

  // ─── Cache ────────────────────────────────────────────────────────────
  const loadFromCache = async () => {
    try {
      const raw = await AsyncStorage.getItem(CACHE_KEY);
      if (raw) {
        const { data, timestamp } = JSON.parse(raw);
        if (Date.now() - timestamp < CACHE_TTL_MS) {
          setRooms(data);
          setIsLoading(false);
          return true;
        }
      }
    } catch {}
    return false;
  };

  const saveToCache = async (data: ChatRoomItem[]) => {
    try {
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify({ data, timestamp: Date.now() }));
    } catch {}
  };

  // ─── Fetch ────────────────────────────────────────────────────────────
  const fetchRooms = useCallback(
    async (showLoadingIndicator = true) => {
      if (!user) return;

      if (showLoadingIndicator) setIsLoading(true);

      // Offline: use cache
      if (isOffline) {
        await loadFromCache();
        return;
      }

      try {
        const response = await fetch(`${API_BASE_URL}/chat/rooms`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': user.id,
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });
        const resData = await response.json();

        if (resData.success && resData.data) {
          const mapped: ChatRoomItem[] = resData.data.map((r: any) => {
            const isBuyer = r.buyer_name === user.display_name;
            const partnerName = isBuyer ? r.seller_name : r.buyer_name;
            const partnerAvatar = isBuyer ? r.seller_avatar : r.buyer_avatar;

            return {
              id: r.room_id,
              listing_title: r.listing_title,
              listing_price: r.listing_price,
              listing_thumbnail:
                r.listing_thumbnail ||
                'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=150&q=80',
              partner_name: partnerName || 'ModoSale Üyesi',
              partner_avatar:
                partnerAvatar ||
                'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80',
              last_message: r.last_message || 'Sohbet odası oluşturuldu.',
              last_message_time: r.last_message_time
                ? new Date(r.last_message_time).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
                : 'Yeni',
              unread: false,
            };
          });

          setRooms(mapped);
          await saveToCache(mapped);
        }
      } catch (err) {
        console.error('Error fetching chat rooms:', err);
        await loadFromCache();
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [user, token, isOffline]
  );

  useEffect(() => {
    fetchRooms(true);

    const unsubscribe = navigation.addListener('focus', () => {
      fetchRooms(false);
    });
    return unsubscribe;
  }, [navigation, user]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchRooms(false);
  };

  const filteredRooms = rooms.filter(
    (room) =>
      room.partner_name.toLowerCase().includes(search.toLowerCase()) ||
      room.listing_title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <View className="flex-1 bg-dark">
      {/* Offline Banner */}
      <OfflineBanner />

      {/* Top Header */}
      <View className="pt-16 pb-4 px-6 border-b border-dark-border bg-dark-card">
        <View className="flex-row justify-between items-center">
          <Text className="text-light text-lg font-black tracking-tight">Mesajlarım</Text>
          {isOffline && (
            <View style={styles.offlineChip}>
              <Text style={styles.offlineChipText}>Çevrimdışı</Text>
            </View>
          )}
        </View>

        <View className="w-full h-11 bg-dark-input rounded-xl flex-row items-center px-3 border border-dark-border mt-4">
          <Search size={16} color="#6B7280" />
          <TextInput
            placeholder="Mesajlarda veya kişide ara..."
            placeholderTextColor="#6B7280"
            value={search}
            onChangeText={setSearch}
            className="flex-1 text-light ml-2.5 text-xs font-semibold"
          />
        </View>
      </View>

      {/* Main List */}
      {isLoading && rooms.length === 0 ? (
        <SkeletonChatList count={5} />
      ) : filteredRooms.length === 0 ? (
        <View className="flex-1 justify-center items-center p-6">
          <MessageSquare size={48} color="#9CA3AF" />
          <Text className="text-light text-center font-bold text-base mt-4">
            {search.length > 0 ? 'Sonuç Bulunamadı' : 'Henüz Mesajınız Yok'}
          </Text>
          <Text className="text-muted text-center text-xs mt-1.5 max-w-[240px] leading-relaxed">
            {search.length > 0
              ? `"${search}" için eşleşen bir sohbet bulunamadı.`
              : 'Satıcılarla kurduğunuz anlık mesajlaşma geçmişi burada listelenecektir.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredRooms}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          onRefresh={handleRefresh}
          refreshing={isRefreshing}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() =>
                navigation.navigate('ChatView', {
                  roomId: item.id,
                  product: {
                    title: item.listing_title,
                    price: item.listing_price,
                    images: [item.listing_thumbnail],
                  },
                })
              }
              style={[
                styles.roomCard,
                item.unread && styles.roomCardUnread,
              ]}
            >
              {/* Unread dot */}
              {item.unread && <View style={styles.unreadDot} />}

              {/* Partner Avatar */}
              <Image
                source={{ uri: item.partner_avatar }}
                style={styles.avatar}
              />

              {/* Message Details */}
              <View style={{ flex: 1, marginLeft: 12 }}>
                <View style={styles.rowBetween}>
                  <Text className="text-light font-black text-sm">{item.partner_name}</Text>
                  <Text className="text-muted" style={{ fontSize: 10, fontWeight: '600' }}>
                    {item.last_message_time}
                  </Text>
                </View>

                <Text numberOfLines={1} className="text-neon" style={{ fontSize: 10, fontWeight: '700', marginTop: 2 }}>
                  {item.listing_title}
                </Text>

                <Text numberOfLines={1} className="text-muted" style={{ fontSize: 12, marginTop: 6, fontWeight: '500' }}>
                  {item.last_message}
                </Text>
              </View>

              {/* Chevron */}
              <View style={{ marginLeft: 10 }}>
                <ChevronRight size={14} color="#6B7280" />
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  roomCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#131820',
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#1E2530',
    marginBottom: 10,
    position: 'relative',
  },
  roomCardUnread: {
    borderColor: '#DEFF9A33',
    backgroundColor: '#1a2233',
  },
  unreadDot: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#DEFF9A',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#1E2530',
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  offlineChip: {
    backgroundColor: '#EF4444',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  offlineChipText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
});
