import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useAuth, API_BASE_URL } from '../context/AuthContext';
import { Bell, CheckCheck, MessageSquare, Star, TrendingUp, ShieldCheck, Package } from 'lucide-react-native';
import { Notification, NotificationType } from '../types';

const TYPE_CONFIG: Record<NotificationType, { icon: any; color: string; bgColor: string }> = {
  message: { icon: MessageSquare, color: '#60A5FA', bgColor: '#1E3A5F' },
  offer: { icon: Package, color: '#DEFF9A', bgColor: '#2A3B1A' },
  review: { icon: Star, color: '#FCD34D', bgColor: '#3B2F0E' },
  listing_bump: { icon: TrendingUp, color: '#A78BFA', bgColor: '#2D1B69' },
  system: { icon: ShieldCheck, color: '#9CA3AF', bgColor: '#1E2530' },
};

const DEMO_NOTIFICATIONS: Notification[] = [
  {
    id: 'n1',
    user_id: 'demo',
    type: 'message',
    title: 'Yeni Mesaj',
    body: 'Ali Veli: "Ürünü hâlâ satıyor musunuz?"',
    is_read: false,
    created_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
  },
  {
    id: 'n2',
    user_id: 'demo',
    type: 'offer',
    title: '💰 Yeni Teklif',
    body: 'Sony WH-1000XM4 için 5.500 TL teklif verildi.',
    is_read: false,
    created_at: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
  },
  {
    id: 'n3',
    user_id: 'demo',
    type: 'review',
    title: '⭐ Yeni Değerlendirme',
    body: 'Zeynep H. sizi 5 yıldız ile değerlendirdi: "Çok güvenilir!"',
    is_read: true,
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'n4',
    user_id: 'demo',
    type: 'listing_bump',
    title: '🚀 İlan Öne Çıkarıldı',
    body: 'FujiFilm X-T30 II ilanınız başarıyla öne çıkarıldı.',
    is_read: true,
    created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'n5',
    user_id: 'demo',
    type: 'system',
    title: 'ModoSale\'e Hoş Geldiniz 🎉',
    body: 'Profilinizi tamamlayarak "Doğrulanmış Üye" rozetini kazanın!',
    is_read: true,
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

const formatTime = (iso: string): string => {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Az önce';
  if (mins < 60) return `${mins} dk önce`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} sa önce`;
  return `${Math.floor(hrs / 24)} gün önce`;
};

export const NotificationsScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { user, token } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/notifications`, {
        headers: {
          'x-user-id': user.id,
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      const resData = await response.json();
      if (resData.success && resData.data?.length > 0) {
        setNotifications(resData.data);
        setUnreadCount(resData.unread_count || 0);
      } else {
        // Use demo data when no real notifications exist
        setNotifications(DEMO_NOTIFICATIONS);
        setUnreadCount(DEMO_NOTIFICATIONS.filter((n) => !n.is_read).length);
      }
    } catch {
      setNotifications(DEMO_NOTIFICATIONS);
      setUnreadCount(DEMO_NOTIFICATIONS.filter((n) => !n.is_read).length);
    } finally {
      setIsLoading(false);
    }
  }, [user, token]);

  const markRead = async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
    try {
      await fetch(`${API_BASE_URL}/notifications/${id}/read`, {
        method: 'PATCH',
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
    } catch {}
  };

  const markAllRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
    try {
      await fetch(`${API_BASE_URL}/notifications/read-all`, {
        method: 'PATCH',
        headers: {
          'x-user-id': user?.id || '',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
    } catch {}
  };

  useEffect(() => {
    fetchNotifications();
    const unsub = navigation.addListener('focus', fetchNotifications);
    return unsub;
  }, [navigation]);

  const renderItem = ({ item }: { item: Notification }) => {
    const config = TYPE_CONFIG[item.type] || TYPE_CONFIG.system;
    const IconComponent = config.icon;

    return (
      <TouchableOpacity
        onPress={() => !item.is_read && markRead(item.id)}
        activeOpacity={0.82}
        style={[styles.card, !item.is_read && styles.cardUnread]}
      >
        {/* Icon badge */}
        <View style={[styles.iconBadge, { backgroundColor: config.bgColor }]}>
          <IconComponent size={18} color={config.color} />
        </View>

        {/* Content */}
        <View style={styles.content}>
          <View style={styles.rowBetween}>
            <Text style={[styles.title, !item.is_read && styles.titleUnread]} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={styles.time}>{formatTime(item.created_at)}</Text>
          </View>
          <Text style={styles.body} numberOfLines={2}>{item.body}</Text>
        </View>

        {/* Unread dot */}
        {!item.is_read && <View style={styles.unreadDot} />}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Bildirimler</Text>
          {unreadCount > 0 && (
            <Text style={styles.unreadLabel}>{unreadCount} okunmamış bildirim</Text>
          )}
        </View>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={markAllRead} style={styles.markAllBtn}>
            <CheckCheck size={14} color="#DEFF9A" />
            <Text style={styles.markAllText}>Tümünü Oku</Text>
          </TouchableOpacity>
        )}
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color="#DEFF9A" size="large" />
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.center}>
          <Bell size={52} color="#2E3849" />
          <Text style={styles.emptyTitle}>Bildirim Yok</Text>
          <Text style={styles.emptyBody}>Yeni mesajlar, teklifler ve değerlendirmeler burada görünecek.</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          onRefresh={fetchNotifications}
          refreshing={isLoading}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0E1117' },
  header: {
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    borderBottomWidth: 1,
    borderBottomColor: '#1E2530',
    backgroundColor: '#131820',
  },
  headerTitle: { color: '#F9FAFB', fontSize: 20, fontWeight: '900' },
  unreadLabel: { color: '#DEFF9A', fontSize: 11, fontWeight: '700', marginTop: 3 },
  markAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 7, backgroundColor: '#1E2530', borderRadius: 12, borderWidth: 1, borderColor: '#2E3849' },
  markAllText: { color: '#DEFF9A', fontSize: 11, fontWeight: '800' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  list: { padding: 16, paddingBottom: 100 },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#131820',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#1E2530',
    padding: 14,
    marginBottom: 10,
    position: 'relative',
  },
  cardUnread: { borderColor: '#DEFF9A20', backgroundColor: '#161D28' },
  iconBadge: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    flexShrink: 0,
  },
  content: { flex: 1 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  title: { color: '#9CA3AF', fontSize: 13, fontWeight: '700', flex: 1, marginRight: 8 },
  titleUnread: { color: '#F9FAFB', fontWeight: '900' },
  body: { color: '#6B7280', fontSize: 12, lineHeight: 18 },
  time: { color: '#6B7280', fontSize: 10, fontWeight: '600', flexShrink: 0 },
  unreadDot: { position: 'absolute', top: 14, right: 14, width: 8, height: 8, borderRadius: 4, backgroundColor: '#DEFF9A' },
  emptyTitle: { color: '#F9FAFB', fontSize: 17, fontWeight: '900', marginTop: 16, textAlign: 'center' },
  emptyBody: { color: '#6B7280', fontSize: 13, textAlign: 'center', marginTop: 8, lineHeight: 20, maxWidth: 280 },
});
