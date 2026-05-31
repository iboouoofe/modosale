import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, Image, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Animated } from 'react-native';
import { ChevronLeft, Send, Heart, MapPin, MessageSquare, AlertCircle, Share2, Megaphone, HelpCircle, Gift } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth, API_BASE_URL } from '../context/AuthContext';
import { useLocation } from '../context/LocationContext';
import io from 'socket.io-client';

interface NeighborhoodPost {
  id: number;
  user_id: string;
  user_name: string;
  user_avatar?: string;
  neighborhood: string;
  content: string;
  likes: number;
  created_at: string;
}

const MOCK_NEIGHBORS = [
  { id: '1', name: 'Zeynep', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80', active: true },
  { id: '2', name: 'Can', avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80', active: true },
  { id: '3', name: 'Burak', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80', active: false },
  { id: '4', name: 'Merve', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80', active: true },
  { id: '5', name: 'Alp', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80', active: false }
];

export const NeighborhoodScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { user, token } = useAuth();
  const { locationName } = useLocation();

  // Extract neighborhood name cleanly (e.g. Kadıköy from "Moda, Kadıköy 📍")
  const currentNeighborhood = locationName.split(',').pop()?.replace('📍', '').trim() || 'Kadıköy';

  const [posts, setPosts] = useState<NeighborhoodPost[]>([]);
  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeCategory, setActiveCategory] = useState<'all' | 'announcement' | 'question' | 'free'>('all');
  
  const socketRef = useRef<any>(null);
  const scrollRef = useRef<ScrollView>(null);
  const inputBorderAnim = useRef(new Animated.Value(0)).current;

  // Fetch posts
  const fetchPosts = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/neighborhood?neighborhood=${encodeURIComponent(currentNeighborhood)}`, {
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });
      const resData = await response.json();
      if (resData.success) {
        setPosts(resData.data || []);
      }
    } catch (err) {
      console.error('Error fetching neighborhood posts:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();

    // Setup Socket connection
    const socketUrl = API_BASE_URL.replace('/api/v1', '');
    socketRef.current = io(socketUrl);

    socketRef.current.emit('join_neighborhood', { neighborhood: currentNeighborhood });

    socketRef.current.on('receive_neighborhood_post', (newPost: NeighborhoodPost) => {
      setPosts(prev => [newPost, ...prev]);
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [currentNeighborhood]);

  const handleCreatePost = async () => {
    if (!content.trim()) return;
    setIsSubmitting(true);

    try {
      const response = await fetch(`${API_BASE_URL}/neighborhood`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user?.id || '',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          userName: user?.display_name || 'Komşu',
          userAvatar: user?.avatar_url || '',
          neighborhood: currentNeighborhood,
          content: content.trim()
        })
      });

      const resData = await response.json();
      if (resData.success) {
        // Emit via socket for real-time broadcast
        if (socketRef.current) {
          socketRef.current.emit('send_neighborhood_post', { post: resData.data });
        }
        setContent('');
      } else {
        Alert.alert('Hata', resData.error || 'Duyuru paylaşılamadı.');
      }
    } catch (err) {
      console.error('Create post error:', err);
      Alert.alert('Bağlantı Hatası', 'Duyuru gönderilemedi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLikePost = async (postId: number) => {
    try {
      // Local optimistic update
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, likes: p.likes + 1 } : p));

      await fetch(`${API_BASE_URL}/neighborhood/like`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ postId })
      });
    } catch (err) {
      console.error('Like error:', err);
    }
  };

  const onFocusInput = () => {
    Animated.timing(inputBorderAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: false
    }).start();
  };

  const onBlurInput = () => {
    Animated.timing(inputBorderAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: false
    }).start();
  };

  const borderInterpolate = inputBorderAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(35, 43, 56, 1)', 'rgba(222, 255, 154, 1)']
  });

  return (
    <View className="flex-1 bg-dark">
      {/* Header */}
      <View 
        style={{ paddingTop: Math.max(insets.top, 16) }} 
        className="pb-4 px-6 border-b border-dark-border bg-dark-card flex-row items-center justify-between"
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          className="w-10 h-10 rounded-full bg-dark/85 justify-center items-center border border-dark-border"
        >
          <ChevronLeft size={22} color="#DEFF9A" />
        </TouchableOpacity>
        
        <View className="items-center">
          <Text className="text-light text-base font-black tracking-tight uppercase">Komşu Panosu</Text>
          <View className="flex-row items-center mt-0.5">
            <MapPin size={10} color="#DEFF9A" />
            <Text className="text-neon text-[10px] font-black tracking-wider uppercase ml-1">{currentNeighborhood} Semti</Text>
          </View>
        </View>

        <View className="w-10" />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <ScrollView 
          ref={scrollRef}
          className="flex-1 px-6 pt-4"
          contentContainerStyle={{ paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Active Neighbors Stories Reel */}
          <Text className="text-muted text-[10px] font-black uppercase tracking-widest pl-1 mb-3">Çevrimiçi Komşular</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            className="flex-row mb-6"
            contentContainerStyle={{ gap: 14 }}
          >
            {MOCK_NEIGHBORS.map(neighbor => (
              <View key={neighbor.id} className="items-center">
                <View className="relative">
                  <Image source={{ uri: neighbor.avatar }} className="w-12 h-12 rounded-full border border-dark-border" />
                  {neighbor.active && (
                    <View className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-green-500 border-2 border-dark" />
                  )}
                </View>
                <Text className="text-light text-[10px] font-extrabold mt-1.5">{neighbor.name}</Text>
              </View>
            ))}
          </ScrollView>

          {/* Quick Categories Filter */}
          <View className="flex-row mb-6" style={{ gap: 8 }}>
            <TouchableOpacity
              onPress={() => setActiveCategory('all')}
              className={`px-4 py-2 rounded-xl border ${activeCategory === 'all' ? 'bg-neon border-neon' : 'bg-dark-card border-dark-border'}`}
            >
              <Text className={`text-[10px] font-black uppercase tracking-wider ${activeCategory === 'all' ? 'text-dark' : 'text-light'}`}>Tümü</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setActiveCategory('announcement')}
              className={`px-4 py-2 rounded-xl border flex-row items-center ${activeCategory === 'announcement' ? 'bg-neon border-neon' : 'bg-dark-card border-dark-border'}`}
            >
              <Megaphone size={10} color={activeCategory === 'announcement' ? '#0E1117' : '#DEFF9A'} className="mr-1" />
              <Text className={`text-[10px] font-black uppercase tracking-wider ${activeCategory === 'announcement' ? 'text-dark' : 'text-light'}`}>Duyuru</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setActiveCategory('question')}
              className={`px-4 py-2 rounded-xl border flex-row items-center ${activeCategory === 'question' ? 'bg-neon border-neon' : 'bg-dark-card border-dark-border'}`}
            >
              <HelpCircle size={10} color={activeCategory === 'question' ? '#0E1117' : '#DEFF9A'} className="mr-1" />
              <Text className={`text-[10px] font-black uppercase tracking-wider ${activeCategory === 'question' ? 'text-dark' : 'text-light'}`}>Soru-Cevap</Text>
            </TouchableOpacity>
          </View>

          {/* Feed List */}
          {isLoading ? (
            <View className="py-20 items-center justify-center">
              <ActivityIndicator color="#DEFF9A" size="large" />
              <Text className="text-muted text-xs mt-3">Komşu duyuruları yükleniyor...</Text>
            </View>
          ) : posts.length === 0 ? (
            <View className="py-20 bg-dark-card border border-dark-border rounded-2xl items-center p-6">
              <AlertCircle size={32} color="#9CA3AF" className="opacity-50" />
              <Text className="text-light font-black text-sm mt-3">Semtte Henüz Duyuru Yok</Text>
              <Text className="text-muted text-xs text-center mt-1 leading-relaxed">
                {currentNeighborhood} semtinde ilk duyuruyu veya soruyu sorarak topluluğu canlandırın!
              </Text>
            </View>
          ) : (
            <View className="space-y-4">
              {posts.map((post) => (
                <View 
                  key={post.id} 
                  className="bg-dark-card border border-dark-border p-5 rounded-2xl relative shadow-md"
                >
                  {/* User Badge Info */}
                  <View className="flex-row items-center justify-between mb-3.5">
                    <View className="flex-row items-center">
                      <Image 
                        source={{ uri: post.user_avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80' }} 
                        className="w-9 h-9 rounded-full border border-dark-border"
                      />
                      <View className="ml-3">
                        <View className="flex-row items-center">
                          <Text className="text-light font-black text-xs">{post.user_name}</Text>
                          <View className="bg-neon/10 border border-neon/30 px-1.5 py-0.5 rounded-full ml-2">
                            <Text className="text-neon text-[7px] font-black uppercase tracking-widest">{post.neighborhood}</Text>
                          </View>
                        </View>
                        <Text className="text-muted text-[8px] mt-0.5">Semt Sakini</Text>
                      </View>
                    </View>
                    <Text className="text-muted text-[8px] font-bold">Yeni</Text>
                  </View>

                  {/* Content */}
                  <Text className="text-light/90 text-sm leading-relaxed mb-4 text-left">{post.content}</Text>

                  {/* Divider */}
                  <View className="h-[1px] bg-dark-border mb-3.5" />

                  {/* Post Actions */}
                  <View className="flex-row items-center" style={{ gap: 16 }}>
                    <TouchableOpacity 
                      onPress={() => handleLikePost(post.id)}
                      className="flex-row items-center bg-dark px-3 py-1.5 rounded-xl border border-dark-border active:scale-95"
                    >
                      <Heart size={12} color="#EF4444" fill={post.likes > 0 ? '#EF4444' : 'transparent'} />
                      <Text className="text-light font-black text-[10px] ml-1.5">{post.likes}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                      className="flex-row items-center bg-dark px-3 py-1.5 rounded-xl border border-dark-border"
                    >
                      <MessageSquare size={12} color="#9CA3AF" />
                      <Text className="text-muted font-bold text-[10px] ml-1.5">Yanıtla</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                      className="flex-row items-center bg-dark px-3 py-1.5 rounded-xl border border-dark-border ml-auto"
                    >
                      <Share2 size={11} color="#9CA3AF" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}
        </ScrollView>

        {/* Input Dock */}
        <View className="absolute bottom-0 left-0 right-0 p-4 bg-dark/95 border-t border-dark-border flex-row items-center justify-between">
          <Animated.View 
            style={{ 
              borderColor: borderInterpolate,
              borderWidth: 1.5,
              borderRadius: 20,
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: '#131820',
              paddingHorizontal: 16,
              height: 48,
              marginRight: 12
            }}
          >
            <TextInput
              placeholder={`${currentNeighborhood} sakinlerine bir şeyler duyur...`}
              placeholderTextColor="#4B5563"
              value={content}
              onChangeText={setContent}
              onFocus={onFocusInput}
              onBlur={onBlurInput}
              className="flex-1 text-light text-xs font-semibold p-0"
            />
          </Animated.View>

          <TouchableOpacity
            onPress={handleCreatePost}
            disabled={isSubmitting || !content.trim()}
            className={`w-12 h-12 rounded-full justify-center items-center active:scale-95 ${
              content.trim() ? 'bg-neon' : 'bg-dark-card border border-dark-border opacity-50'
            }`}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#0E1117" size="small" />
            ) : (
              <Send size={16} color={content.trim() ? '#0E1117' : '#9CA3AF'} />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};
