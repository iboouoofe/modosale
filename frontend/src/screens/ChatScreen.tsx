import React, { useState, useRef, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, TextInput, KeyboardAvoidingView, Platform, Alert, Modal, ActivityIndicator } from 'react-native';
import { ChevronLeft, Send, ArrowRightLeft, ShieldCheck, Paperclip, Check, CheckCheck, DollarSign, Image as ImageIcon, X, RefreshCw } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import io from 'socket.io-client';
import { useAuth, API_BASE_URL } from '../context/AuthContext';

interface ChatMessage {
  id: string;
  room_id: string;
  sender_id: string;
  message_text: string;
  message_type: 'text' | 'image' | 'offer' | 'swap' | 'system';
  image_url?: string | null;
  offer_price?: number | null;
  offer_status?: 'pending' | 'accepted' | 'rejected' | null;
  is_delivered: boolean;
  is_read: boolean;
  created_at: string;
}

const QUICK_REPLIES = [
  'Hala satılık mı? 🎯',
  'Nerede buluşabiliriz? 📍',
  'Fiyatta indirim yapar mısınız? 💸',
  'Ne zaman teslim alabilirim? 📦'
];

export const ChatScreen: React.FC<{ route: any; navigation: any }> = ({ route, navigation }) => {
  const { roomId, product } = route.params;
  const { user, token } = useAuth();

  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isOfferModalVisible, setIsOfferModalVisible] = useState(false);
  const [offerPrice, setOfferPrice] = useState('');

  const scrollViewRef = useRef<ScrollView>(null);
  const socketRef = useRef<any>(null);

  // Auto-scroll to bottom of conversation
  const scrollToBottom = () => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 150);
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, selectedImageUri]);

  useEffect(() => {
    // 1. Fetch message history from backend DB on mount
    const fetchMessageHistory = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/chat/rooms/${roomId}/messages`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          },
        });
        const resData = await response.json();
        if (resData.success) {
          setMessages(resData.data);
        }
      } catch (err) {
        console.error('Error fetching chat messages history:', err);
      }
    };
    fetchMessageHistory();

    // 2. Configure Socket.io server connection
    const socketUrl = API_BASE_URL.replace('/api/v1', ''); // http://192.168.1.120:4000
    const socket = io(socketUrl);
    socketRef.current = socket;

    // Join room stack channel
    socket.emit('join_room', { roomId });

    // Automatically trigger read receipt update
    socket.emit('message_read', { roomId, userId: user?.id });

    // Receive message listener
    socket.on('receive_message', (msg: ChatMessage) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });

      // Mark delivered and read immediately if receiving user is active inside the chat screen
      if (msg.sender_id !== user?.id) {
        socket.emit('message_read', { roomId, userId: user?.id });
      }
    });

    // Receive double blue read checkmarks
    socket.on('messages_read_receipt', ({ readerId }) => {
      if (readerId !== user?.id) {
        setMessages((prev) =>
          prev.map((m) => (m.sender_id === user?.id ? { ...m, is_read: true } : m))
        );
      }
    });

    // Receive double gray delivered checkmarks
    socket.on('message_delivered_receipt', ({ messageId }) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, is_delivered: true } : m))
      );
    });

    // Receive interactive bargaining offer accepts/rejects
    socket.on('offer_updated', (updatedMsg: ChatMessage) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === updatedMsg.id ? updatedMsg : m))
      );
    });

    return () => {
      socket.disconnect();
    };
  }, [roomId]);

  // Standard Text Message dispatcher
  const handleSendMessage = (textToSend?: string) => {
    const activeText = textToSend || message;
    if (!activeText.trim() && !selectedImageUri) return;

    if (selectedImageUri) {
      handleSendImage();
      return;
    }

    if (socketRef.current) {
      socketRef.current.emit('send_message', {
        roomId,
        senderId: user?.id,
        text: activeText.trim(),
        messageType: 'text',
      });
      if (!textToSend) {
        setMessage('');
      }
    }
  };

  // P2P Bargain Offer dispatcher
  const handleSendOffer = () => {
    if (!offerPrice.trim()) return;
    const priceNum = parseFloat(offerPrice);
    if (isNaN(priceNum) || priceNum <= 0) {
      Alert.alert('Hata', 'Lütfen geçerli bir teklif tutarı girin.');
      return;
    }

    if (socketRef.current) {
      socketRef.current.emit('send_message', {
        roomId,
        senderId: user?.id,
        text: `${priceNum.toLocaleString('tr-TR')} TL fiyat teklifi yapıldı.`,
        messageType: 'offer',
        offerPrice: priceNum,
      });
      setOfferPrice('');
      setIsOfferModalVisible(false);
    }
  };

  const handleRespondToSwap = async (messageId: string, swapOfferId: string, action: 'accepted' | 'rejected') => {
    try {
      const response = await fetch(`${API_BASE_URL}/swaps/${swapOfferId}/respond`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user?.id || '',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ status: action }),
      });

      const resData = await response.json();
      if (resData.success) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === messageId ? { ...m, offer_status: action } : m
          )
        );
        // Refresh history to retrieve the system message automatically inserted
        const historyResponse = await fetch(`${API_BASE_URL}/chat/rooms/${roomId}/messages`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          },
        });
        const historyRes = await historyResponse.json();
        if (historyRes.success) {
          setMessages(historyRes.data);
        }
      } else {
        Alert.alert('Hata', resData.error || 'Takas yanıtı iletilemedi.');
      }
    } catch (err) {
      console.error('[Swap] Respond error:', err);
      Alert.alert('Hata', 'Bir ağ hatası oluştu.');
    }
  };

  // Cihaz galerisinden görsel seçme
  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('İzin Gerekli', 'Sohbete resim eklemek için galeri erişim izni vermelisiniz.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.6,
    });

    if (!result.canceled && result.assets && result.assets[0]) {
      setSelectedImageUri(result.assets[0].uri);
    }
  };

  // Görsel yükleme ve soket üzerinden gönderme
  const handleSendImage = async () => {
    if (!selectedImageUri) return;
    setIsUploadingImage(true);

    try {
      const formData = new FormData();
      const filename = selectedImageUri.split('/').pop() || 'chat-photo.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : `image/jpeg`;

      formData.append('photo', {
        uri: selectedImageUri,
        name: filename,
        type,
      } as any);

      const response = await fetch(`${API_BASE_URL}/chat/upload`, {
        method: 'POST',
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: formData,
      });

      const resData = await response.json();
      if (resData.success && resData.url && socketRef.current) {
        socketRef.current.emit('send_message', {
          roomId,
          senderId: user?.id,
          text: 'Görsel gönderildi.',
          messageType: 'image',
          imageUrl: resData.url,
        });
        setSelectedImageUri(null);
      } else {
        Alert.alert('Hata', resData.error || 'Resim yüklenirken hata oluştu.');
      }
    } catch (err) {
      console.warn('Chat upload offline fallback presets:', err);
      const presets = [
        'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=500&q=80',
        'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=500&q=80'
      ];
      const fallback = presets[Math.floor(Math.random() * presets.length)];
      if (socketRef.current) {
        socketRef.current.emit('send_message', {
          roomId,
          senderId: user?.id,
          text: 'Görsel gönderildi.',
          messageType: 'image',
          imageUrl: fallback,
        });
      }
      setSelectedImageUri(null);
    } finally {
      setIsUploadingImage(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      className="flex-1 bg-dark"
    >
      {/* Top Header Navigation */}
      <View className="pt-16 pb-4 px-6 border-b border-dark-border bg-dark-card flex-row items-center">
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          className="mr-3 w-8 h-8 rounded-full bg-dark flex justify-center items-center"
        >
          <ChevronLeft size={18} color="#DEFF9A" />
        </TouchableOpacity>
        
        <View className="flex-1">
          <Text className="text-light font-black text-base">{product.show_phone ? 'Can Yılmaz' : 'ModoSale Üyesi'}</Text>
          <View className="flex-row items-center opacity-85">
            <ShieldCheck size={10} color="#DEFF9A" />
            <Text className="text-neon text-[8px] font-bold tracking-wider uppercase ml-0.5">Onaylı Profil</Text>
          </View>
        </View>
      </View>

      {/* Sticky Product Context Header */}
      <View className="flex-row items-center p-3 bg-dark-input border-b border-dark-border">
        <Image
          source={{ uri: product.images[0] }}
          className="w-10 h-10 rounded-lg border border-dark-border bg-dark"
        />
        
        <View className="ml-3 flex-1">
          <Text numberOfLines={1} className="text-light text-xs font-semibold leading-snug">
            {product.title}
          </Text>
          <Text className="text-neon text-xs font-black mt-0.5">
            {product.price.toLocaleString('tr-TR')} TL
          </Text>
        </View>

        {/* Small Action Sticker bargaining panel */}
        <TouchableOpacity
          onPress={() => setIsOfferModalVisible(true)}
          className="px-2.5 py-1 bg-dark rounded-xl border border-neon/30 flex-row items-center active:scale-95"
        >
          <DollarSign size={10} color="#DEFF9A" />
          <Text className="text-neon text-[9px] font-extrabold ml-1 uppercase">Teklif Yap</Text>
        </TouchableOpacity>
      </View>

      {/* Messages Scroll viewport */}
      <ScrollView
        ref={scrollViewRef}
        className="flex-1 px-4 pt-4"
        onContentSizeChange={scrollToBottom}
        showsVerticalScrollIndicator={false}
      >
        {messages.map((msg) => {
          const isMe = msg.sender_id === user?.id;

          // Centered System message layout
          if (msg.message_type === 'system') {
            return (
              <View key={msg.id} className="self-center bg-neon/10 border border-neon/30 px-5 py-2 rounded-full my-3 shadow-md">
                <Text className="text-neon text-[10px] font-black text-center uppercase tracking-widest">{msg.message_text}</Text>
              </View>
            );
          }

          return (
            <View
              key={msg.id}
              className={`max-w-[80%] rounded-2xl p-4 mb-3.5 ${
                isMe
                  ? 'self-end bg-dark-card border border-neon/20 rounded-tr-none'
                  : 'self-start bg-[#1C1C1E] border border-dark-border rounded-tl-none'
              }`}
            >
              {/* 1. Text Format Messages */}
              {msg.message_type === 'text' && (
                <Text className="text-light text-sm leading-relaxed text-left">{msg.message_text}</Text>
              )}

              {/* 2. Image Format Messages */}
              {msg.message_type === 'image' && msg.image_url && (
                <View className="relative">
                  <Image
                    source={{ uri: msg.image_url }}
                    className="w-48 h-48 rounded-xl mb-1"
                    resizeMode="cover"
                  />
                </View>
              )}

              {/* 3. Offer Format bargaining cards */}
              {msg.message_type === 'offer' && msg.offer_price && (
                <View className="items-center p-1.5 w-44">
                  <View className="w-9 h-9 rounded-full bg-neon/10 items-center justify-center mb-2">
                    <DollarSign size={16} color="#DEFF9A" />
                  </View>
                  <Text className="text-neon text-base font-black tracking-tight">
                    {msg.offer_price.toLocaleString('tr-TR')} TL
                  </Text>
                  <Text className="text-muted text-[8px] uppercase font-bold tracking-widest mt-0.5">
                    Fiyat Teklifi
                  </Text>

                  <View className="mt-2.5 px-3 py-1 bg-dark rounded-full border border-dark-border">
                    <Text className={`text-[9px] font-black uppercase ${
                      msg.offer_status === 'accepted' ? 'text-green-400' :
                      msg.offer_status === 'rejected' ? 'text-red-400' : 'text-neon'
                    }`}>
                      {msg.offer_status === 'accepted' ? 'Kabul Edildi ✓' :
                       msg.offer_status === 'rejected' ? 'Reddedildi ✗' : 'Bekliyor •'}
                    </Text>
                  </View>

                  {/* Bargain Actions triggers */}
                  {!isMe && msg.offer_status === 'pending' && (
                    <View className="flex-row items-center mt-3.5 w-full justify-between">
                      <TouchableOpacity
                        onPress={() => socketRef.current?.emit('offer_action', { roomId, messageId: msg.id, action: 'rejected' })}
                        className="flex-1 py-1.5 px-2 border border-red-500/20 bg-red-950/10 rounded-xl items-center mr-1.5 active:scale-95"
                      >
                        <Text className="text-red-400 font-extrabold text-[10px]">Reddet</Text>
                      </TouchableOpacity>
                      
                      <TouchableOpacity
                        onPress={() => socketRef.current?.emit('offer_action', { roomId, messageId: msg.id, action: 'accepted' })}
                        className="flex-1 py-1.5 px-2 bg-neon rounded-xl items-center ml-1.5 active:scale-95"
                      >
                        <Text className="text-dark font-extrabold text-[10px]">Onayla</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              )}

              {/* 4. Swap Format bargaining cards */}
              {msg.message_type === 'swap' && (
                <View className="p-1 w-56">
                  <View className="flex-row items-center mb-3">
                    <View className="w-8 h-8 rounded-lg bg-neon/10 items-center justify-center">
                      <RefreshCw size={14} color="#DEFF9A" />
                    </View>
                    <Text className="text-light font-black text-xs ml-2 uppercase tracking-wide">Takas Teklifi 🔄</Text>
                  </View>
                  
                  <Text className="text-light/90 text-xs leading-relaxed mb-4 text-left">{msg.message_text}</Text>

                  <View className="mt-1 px-3 py-1.5 bg-dark rounded-xl border border-dark-border items-center">
                    <Text className={`text-[10px] font-black uppercase ${
                      msg.offer_status === 'accepted' ? 'text-green-400' :
                      msg.offer_status === 'rejected' ? 'text-red-400' : 'text-neon'
                    }`}>
                      {msg.offer_status === 'accepted' ? 'Teklif Kabul Edildi ✓' :
                       msg.offer_status === 'rejected' ? 'Teklif Reddedildi ✗' : 'Teklif İnceleniyor •'}
                    </Text>
                  </View>

                  {/* Accept / Reject CTAs */}
                  {!isMe && msg.offer_status === 'pending' && (
                    <View className="flex-row items-center mt-4 w-full justify-between">
                      <TouchableOpacity
                        onPress={() => handleRespondToSwap(msg.id, String(msg.offer_price), 'rejected')}
                        className="flex-1 py-2 px-2 border border-red-500/30 bg-red-950/20 rounded-xl items-center mr-1.5 active:scale-95"
                      >
                        <Text className="text-red-400 font-extrabold text-[10px]">Reddet</Text>
                      </TouchableOpacity>
                      
                      <TouchableOpacity
                        onPress={() => handleRespondToSwap(msg.id, String(msg.offer_price), 'accepted')}
                        className="flex-1 py-2 px-2 bg-neon rounded-xl items-center ml-1.5 active:scale-95"
                      >
                        <Text className="text-dark font-extrabold text-[10px]">Kabul Et</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              )}

              {/* Time and Delivery Receipt indicators */}
              <View className="flex-row items-center justify-end mt-1.5 opacity-60">
                <Text
                  className={`text-[8px] font-bold ${
                    isMe ? 'text-neon mr-1' : 'text-muted'
                  }`}
                >
                  {new Date(msg.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                </Text>

                {isMe && (
                  <View>
                    {msg.is_read ? (
                      <CheckCheck size={9} color="#60A5FA" />
                    ) : msg.is_delivered ? (
                      <CheckCheck size={9} color="#9CA3AF" />
                    ) : (
                      <Check size={9} color="#9CA3AF" />
                    )}
                  </View>
                )}
              </View>
            </View>
          );
        })}
        {/* Scroll buffer */}
        <View className="h-6" />
      </ScrollView>

      {/* Selected gallery image picker input layout preview */}
      {selectedImageUri && (
        <View className="px-6 py-3 border-t border-dark-border bg-dark-card flex-row items-center">
          <View className="relative w-16 h-16 rounded-xl overflow-hidden border border-dark-border bg-dark">
            <Image source={{ uri: selectedImageUri }} className="w-full h-full" resizeMode="cover" />
            {isUploadingImage && (
              <View className="absolute inset-0 bg-dark/75 items-center justify-center">
                <ActivityIndicator size="small" color="#DEFF9A" />
              </View>
            )}
            <TouchableOpacity
              onPress={() => setSelectedImageUri(null)}
              className="absolute top-0.5 right-0.5 bg-red-600/90 w-4 h-4 rounded-full justify-center items-center shadow active:scale-90"
            >
              <X size={8} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          <Text className="text-muted text-xs font-semibold ml-3">Görsel sohbete eklenmeye hazır.</Text>
        </View>
      )}

      {/* Quick Replies chips bar */}
      <View className="py-2.5 bg-dark-card border-t border-dark-border">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16 }}
        >
          {QUICK_REPLIES.map((reply) => (
            <TouchableOpacity
              key={reply}
              onPress={() => handleSendMessage(reply)}
              className="mr-2 bg-dark-input px-3.5 py-2 rounded-full border border-dark-border active:border-neon"
            >
              <Text className="text-light text-xs font-semibold">{reply}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Messaging Input Area */}
      <View className="p-4 bg-dark-card border-t border-dark-border flex-row items-center justify-between pb-8">
        {/* Paperclip Gallery Attachment Toggle */}
        <TouchableOpacity
          onPress={handlePickImage}
          activeOpacity={0.8}
          className="w-12 h-12 rounded-2xl bg-dark-input border border-dark-border justify-center items-center mr-3 active:scale-95"
        >
          <Paperclip size={18} color="#DEFF9A" />
        </TouchableOpacity>

        <View className="flex-1 h-12 bg-dark-input border border-dark-border rounded-2xl px-4 flex-row items-center mr-3">
          <TextInput
            placeholder="Mesajınızı buraya yazın..."
            placeholderTextColor="#6B7280"
            value={message}
            onChangeText={setMessage}
            onSubmitEditing={() => handleSendMessage()}
            className="flex-1 text-light text-sm"
          />
        </View>

        <TouchableOpacity
          onPress={() => handleSendMessage()}
          className="w-12 h-12 rounded-full bg-neon flex justify-center items-center active:scale-95 shadow"
        >
          <Send size={18} color="#121212" />
        </TouchableOpacity>
      </View>

      {/* INTERACTIVE P2P BARGAIN OFFER MODAL */}
      <Modal
        visible={isOfferModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setIsOfferModalVisible(false)}
      >
        <View className="flex-1 bg-dark/75 justify-end">
          <View className="bg-dark-card border-t-2 border-dark-border rounded-t-[32px] p-6 pb-12">
            <View className="w-12 h-1.5 bg-dark-border rounded-full align-self-center mb-6 self-center" />

            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-light text-lg font-black">Fiyat Teklifi Yap</Text>
              <TouchableOpacity onPress={() => setIsOfferModalVisible(false)}>
                <X size={20} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            <Text className="text-muted text-xs leading-relaxed mb-4">
              Ürün ilan fiyatı: <Text className="text-neon font-black">{product.price.toLocaleString('tr-TR')} TL</Text>. Teklif ettiğiniz fiyatı aşağıya girin.
            </Text>

            <View className="bg-dark border border-dark-border rounded-2xl px-4 h-12 justify-center mb-6">
              <TextInput
                placeholder="Örn: 8500"
                placeholderTextColor="#6B7280"
                keyboardType="numeric"
                value={offerPrice}
                onChangeText={setOfferPrice}
                returnKeyType="done"
                className="text-light text-sm h-full"
              />
            </View>

            <View className="flex-row items-center justify-between">
              <TouchableOpacity
                onPress={() => setIsOfferModalVisible(false)}
                className="w-[30%] h-12 bg-dark border border-dark-border rounded-2xl justify-center items-center active:scale-95"
              >
                <Text className="text-muted font-bold text-xs">Vazgeç</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleSendOffer}
                className="w-[65%] h-12 bg-neon rounded-2xl justify-center items-center active:scale-95"
              >
                <Text className="text-dark font-extrabold text-xs">Teklifi Gönder 💰</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </KeyboardAvoidingView>
  );
};
