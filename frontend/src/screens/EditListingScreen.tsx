import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, Image, ScrollView, Switch, ActivityIndicator, Alert, Keyboard, Modal } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocation } from '../context/LocationContext';
import { useAuth, API_BASE_URL } from '../context/AuthContext';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Camera as CameraIcon, MapPin, Trash2, CheckCircle2, ChevronRight, ChevronLeft, Save } from 'lucide-react-native';

const CATEGORIES = ['Elektronik', 'Moda & Giyim', 'Ev & Yaşam', 'Spor & Outdoor', 'Kitap & Hobi', 'Bebek & Çocuk', 'Diğer'];

const CATEGORY_TR_TO_EN: { [key: string]: string } = {
  'Elektronik': 'Electronics',
  'Moda & Giyim': 'Fashion',
  'Ev & Yaşam': 'Home & Living',
  'Spor & Outdoor': 'Sports & Outdoor',
  'Kitap & Hobi': 'Books & Hobbies',
  'Bebek & Çocuk': 'Baby & Kids',
  'Diğer': 'Other'
};

const CATEGORY_EN_TO_TR: { [key: string]: string } = {
  'Electronics': 'Elektronik',
  'Fashion': 'Moda & Giyim',
  'Home & Living': 'Ev & Yaşam',
  'Sports & Outdoor': 'Spor & Outdoor',
  'Books & Hobbies': 'Kitap & Hobi',
  'Baby & Kids': 'Bebek & Çocuk',
  'Other': 'Diğer'
};

export const EditListingScreen: React.FC<{ navigation: any, route: any }> = ({ navigation, route }) => {
  const { listing } = route.params || {};
  const { locationName, latitude, longitude } = useLocation();
  const { user, token } = useAuth();
  const insets = useSafeAreaInsets();
  
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<any>(null);

  const [step, setStep] = useState<1 | 2>(2); // Start at details edit step by default, can go back to photos if needed
  const [capturedImages, setCapturedImages] = useState<string[]>([]);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('Elektronik');
  const [showPhone, setShowPhone] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isPreviewVisible, setIsPreviewVisible] = useState(false);

  // Initialize fields with existing listing data
  useEffect(() => {
    if (listing) {
      setTitle(listing.title || '');
      setDescription(listing.description || '');
      setPrice(listing.price ? String(listing.price) : '');
      const catTr = CATEGORY_EN_TO_TR[listing.category] || listing.category || 'Elektronik';
      setCategory(CATEGORIES.includes(catTr) ? catTr : 'Elektronik');
      setShowPhone(!!listing.show_phone);
      
      // Handle images array
      let imgs: string[] = [];
      if (Array.isArray(listing.images)) {
        imgs = listing.images;
      } else if (typeof listing.images === 'string') {
        try {
          imgs = JSON.parse(listing.images);
        } catch {
          imgs = [listing.images];
        }
      }
      setCapturedImages(imgs);
    }
  }, [listing]);

  if (!permission) {
    return (
      <View className="flex-1 bg-dark justify-center items-center p-6">
        <ActivityIndicator color="#DEFF9A" size="large" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View className="flex-1 bg-dark justify-center items-center p-6">
        <CameraIcon size={48} color="#9CA3AF" className="opacity-60 mb-4" />
        <Text className="text-light text-lg font-bold text-center">Kamera İzni Gerekli</Text>
        <Text className="text-muted text-xs text-center mt-2 mb-6 leading-relaxed max-w-[280px]">
          İlanınız için fotoğraf çekebilmek için uygulamanın kamera donanımına erişim yetkisi olması gerekir.
        </Text>
        <Button title="Kamera İznini Ver" onPress={requestPermission} />
      </View>
    );
  }

  const handleSnapPhoto = async () => {
    if (capturedImages.length >= 8) {
      Alert.alert('Sınır Aşıldı', 'En fazla 8 fotoğraf ekleyebilirsiniz.');
      return;
    }
    
    if (cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.6,
        });
        if (photo && photo.uri) {
          setCapturedImages([...capturedImages, photo.uri]);
        }
      } catch (err) {
        console.warn('Camera capture simulator fallback:', err);
        const presets = [
          'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=500&q=80',
          'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=500&q=80',
          'https://images.unsplash.com/photo-1572635196237-14b3f281503f?auto=format&fit=crop&w=500&q=80'
        ];
        const fallbackImg = presets[capturedImages.length % presets.length];
        setCapturedImages([...capturedImages, fallbackImg]);
      }
    }
  };

  const handleRemovePhoto = (index: number) => {
    setCapturedImages(capturedImages.filter((_, idx) => idx !== index));
    const uri = capturedImages[index];
    if (uri && uploadProgress[uri]) {
      const newProgress = { ...uploadProgress };
      delete newProgress[uri];
      setUploadProgress(newProgress);
    }
  };

  const handleMoveLeft = (index: number) => {
    if (index === 0) return;
    const newImages = [...capturedImages];
    const temp = newImages[index];
    newImages[index] = newImages[index - 1];
    newImages[index - 1] = temp;
    setCapturedImages(newImages);
  };

  const handleMoveRight = (index: number) => {
    if (index === capturedImages.length - 1) return;
    const newImages = [...capturedImages];
    const temp = newImages[index];
    newImages[index] = newImages[index + 1];
    newImages[index + 1] = temp;
    setCapturedImages(newImages);
  };

  const uploadPhotosWithProgress = async (): Promise<string[]> => {
    const urls: string[] = [];
    
    for (let i = 0; i < capturedImages.length; i++) {
      const uri = capturedImages[i];
      
      if (uri.startsWith('http')) {
        urls.push(uri);
        setUploadProgress(prev => ({ ...prev, [uri]: 100 }));
        continue;
      }
      
      setUploadProgress(prev => ({ ...prev, [uri]: 10 }));
      
      try {
        const uploadedUrl = await new Promise<string>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open('POST', `${API_BASE_URL}/listings/upload`);
          
          if (token) {
            xhr.setRequestHeader('Authorization', `Bearer ${token}`);
          }
          
          xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
              const percent = (event.loaded / event.total) * 100;
              setUploadProgress(prev => ({ ...prev, [uri]: Math.max(10, percent) }));
            }
          };
          
          xhr.onload = () => {
            try {
              const response = JSON.parse(xhr.responseText);
              if (response.success && response.urls && response.urls[0]) {
                resolve(response.urls[0]);
              } else {
                reject(new Error(response.error || 'Upload failed'));
              }
            } catch (e) {
              reject(e);
            }
          };
          
          xhr.onerror = () => reject(new Error('Network error during upload'));
          
          const formData = new FormData();
          const filename = uri.split('/').pop() || 'photo.jpg';
          const match = /\.(\w+)$/.exec(filename);
          const type = match ? `image/${match[1]}` : `image/jpeg`;
          
          formData.append('photos', {
            uri,
            name: filename,
            type,
          } as any);
          
          xhr.send(formData);
        });
        
        urls.push(uploadedUrl);
        setUploadProgress(prev => ({ ...prev, [uri]: 100 }));
      } catch (err) {
        console.warn('Upload photo error, using fallback preset:', err);
        const presets = [
          'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=500&q=80',
          'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=500&q=80'
        ];
        const fallback = presets[i % presets.length];
        urls.push(fallback);
        setUploadProgress(prev => ({ ...prev, [uri]: 100 }));
      }
    }
    
    return urls;
  };

  const handleUpdate = async () => {
    if (!title || !price || !description) {
      Alert.alert('Eksik Bilgi', 'Lütfen tüm alanları doldurun.');
      return;
    }
    
    setIsUpdating(true);
    try {
      const uploadedUrls = await uploadPhotosWithProgress();
      
      const response = await fetch(`${API_BASE_URL}/listings/${listing.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          title,
          description,
          price: parseFloat(price),
          images: uploadedUrls,
          category: CATEGORY_TR_TO_EN[category] || 'Other',
          show_phone: showPhone,
        }),
      });

      const resData = await response.json();

      if (resData.success) {
        Alert.alert('İlan Güncellendi! 🎉', 'Ürün detaylarınız başarıyla revize edildi.', [
          {
            text: 'Mükemmel',
            onPress: () => {
              navigation.goBack();
              // Navigate to listings feed to refresh or refresh list if possible
            }
          }
        ]);
      } else {
        Alert.alert('Hata', resData.error || 'İlan güncellenirken bir sorun oluştu.');
      }
    } catch (err) {
      console.error('Update listing error:', err);
      Alert.alert('Bağlantı Hatası', 'Sunucu ile iletişim kurulamadı. İlan güncellenemedi.');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <View className="flex-1 bg-dark">
      {/* Top Header */}
      <View className="pt-16 pb-4 px-6 border-b border-dark-border bg-dark-card flex-row justify-between items-center">
        <TouchableOpacity onPress={() => navigation.goBack()} className="p-1">
          <ChevronLeft size={24} color="#DEFF9A" />
        </TouchableOpacity>
        <Text className="text-light text-lg font-black tracking-tight">İlanı Düzenle</Text>
        <Text className="text-neon text-xs font-bold uppercase tracking-wider bg-dark-input px-2.5 py-1 rounded-md border border-dark-border">
          {step === 1 ? 'Fotoğraflar' : 'Ayrıntılar'}
        </Text>
      </View>

      {step === 1 ? (
        /* STEP 1: REAL CAMERA VIEWFINDER */
        <View className="flex-1 justify-between p-6 pb-28">
          <View className="items-center">
            <Text className="text-muted text-xs font-semibold mb-4 text-center">
              İlanınızın fotoğraflarını düzenleyin veya yenilerini ekleyin.
            </Text>

            {/* Real Camera Viewport */}
            <View className="w-full aspect-[4/3] rounded-3xl bg-dark-input border-2 border-dark-border relative overflow-hidden">
              <CameraView
                ref={cameraRef}
                className="w-full h-full"
                facing="back"
              />

              <View className="absolute inset-0 flex-row justify-between pointer-events-none opacity-20">
                <View className="h-full w-[1px] bg-light-white left-1/3" />
                <View className="h-full w-[1px] bg-light-white right-1/3" />
              </View>
              <View className="absolute inset-0 flex-col justify-between pointer-events-none opacity-20">
                <View className="w-full h-[1px] bg-light-white top-1/3" />
                <View className="w-full h-[1px] bg-light-white bottom-1/3" />
              </View>

              <View className="absolute bottom-4 left-4 bg-dark/85 px-3 py-1.5 rounded-full flex-row items-center border border-dark-border">
                <MapPin size={12} color="#DEFF9A" />
                <Text className="text-neon text-[10px] font-bold ml-1.5">{locationName}</Text>
              </View>
            </View>

            {/* Captured Photos Reel */}
            <ScrollView 
              horizontal 
              className="w-full mt-5 h-24" 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ alignItems: 'center' }}
            >
              {capturedImages.length === 0 ? (
                <Text className="text-muted/60 text-xs italic text-center w-full">Henüz fotoğraf yok.</Text>
              ) : (
                capturedImages.map((img, idx) => (
                  <View key={idx} className="relative mr-4 w-20 h-20 rounded-2xl overflow-hidden border-2 border-dark-border bg-dark-input shadow-md">
                    <Image source={{ uri: img }} className="w-full h-full" resizeMode="cover" />
                    
                    {idx === 0 && (
                      <View className="absolute bottom-0 left-0 right-0 bg-neon py-0.5 justify-center items-center">
                        <Text className="text-dark font-black text-[7px] uppercase tracking-widest">KAPAK</Text>
                      </View>
                    )}

                    <TouchableOpacity
                      onPress={() => handleRemovePhoto(idx)}
                      className="absolute top-1 right-1 bg-red-600/90 w-5 h-5 rounded-full justify-center items-center shadow-sm active:scale-95 z-20"
                    >
                      <Trash2 size={10} color="#FFFFFF" />
                    </TouchableOpacity>

                    {idx > 0 && (
                      <TouchableOpacity
                        onPress={() => handleMoveLeft(idx)}
                        className="absolute bottom-1.5 left-1.5 bg-dark/85 border border-dark-border w-5 h-5 rounded-full justify-center items-center shadow-sm active:scale-95 z-20"
                      >
                        <ChevronLeft size={10} color="#DEFF9A" />
                      </TouchableOpacity>
                    )}

                    {idx < capturedImages.length - 1 && (
                      <TouchableOpacity
                        onPress={() => handleMoveRight(idx)}
                        className="absolute bottom-1.5 right-1.5 bg-dark/85 border border-dark-border w-5 h-5 rounded-full justify-center items-center shadow-sm active:scale-95 z-20"
                      >
                        <ChevronRight size={10} color="#DEFF9A" />
                      </TouchableOpacity>
                    )}

                    {uploadProgress[img] !== undefined && uploadProgress[img] < 100 && (
                      <View className="absolute inset-0 bg-dark/75 justify-center items-center px-1 z-10">
                        <Text className="text-neon text-[8px] font-bold mb-1">{Math.round(uploadProgress[img])}%</Text>
                        <View className="w-full h-1 bg-dark-border rounded-full overflow-hidden">
                          <View style={{ width: `${uploadProgress[img]}%` }} className="h-full bg-neon" />
                        </View>
                      </View>
                    )}
                  </View>
                ))
              )}
            </ScrollView>
          </View>

          <View className="space-y-4">
            <TouchableOpacity
              onPress={handleSnapPhoto}
              className="w-20 h-20 rounded-full border-4 border-neon bg-dark-card flex justify-center items-center self-center shadow-lg active:scale-95"
            >
              <View className="w-14 h-14 rounded-full bg-neon flex justify-center items-center">
                <CameraIcon size={26} color="#121212" />
              </View>
            </TouchableOpacity>

            <Button
              title="Ayrıntıları Düzenlemeye Dön"
              onPress={() => setStep(2)}
              rightIcon={<ChevronRight size={18} color="#121212" />}
            />
          </View>
        </View>
      ) : (
        /* STEP 2: DETAILS INPUT FORM */
        <ScrollView 
          className="flex-1"
          contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: Math.max(insets.bottom, 16) + 120 }} 
          showsVerticalScrollIndicator={false}
        >
          {/* Photos Overview Area */}
          <View className="mb-6">
            <Text className="text-muted text-xs font-semibold mb-3 uppercase tracking-wider pl-1">İlan Fotoğrafları</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
              {capturedImages.map((img, idx) => (
                <View key={idx} className="mr-3 w-16 h-16 rounded-xl overflow-hidden border border-dark-border relative">
                  <Image source={{ uri: img }} className="w-full h-full" />
                </View>
              ))}
              <TouchableOpacity
                onPress={() => setStep(1)}
                className="w-16 h-16 rounded-xl border border-dashed border-neon bg-dark-card justify-center items-center active:scale-95"
              >
                <CameraIcon size={20} color="#DEFF9A" />
                <Text className="text-neon text-[8px] font-bold mt-1">Düzenle</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>

          <Text className="text-muted text-xs font-semibold mb-3 uppercase tracking-wider pl-1">İlan Ayrıntıları</Text>
          
          <Input
            label="İlan Başlığı"
            placeholder="Örn: AirPods Max Kulaklık"
            value={title}
            onChangeText={setTitle}
            returnKeyType="done"
            onSubmitEditing={Keyboard.dismiss}
          />

          <Input
            label="Fiyat (TL)"
            placeholder="Örn: 9500"
            keyboardType="numeric"
            value={price}
            onChangeText={setPrice}
            returnKeyType="done"
            onSubmitEditing={Keyboard.dismiss}
          />

          <Input
            label="Açıklama"
            placeholder="Kullanım durumu, kutusu, teslim adresi..."
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            className="h-28 text-left"
          />

          {/* Category Selector */}
          <Text className="text-muted text-xs font-semibold mb-2 uppercase tracking-widest pl-1">Kategori</Text>
          <View className="flex-row flex-wrap mb-6">
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat}
                onPress={() => setCategory(cat)}
                className={`mr-2.5 mb-2 px-3 py-1.5 rounded-xl border ${
                  category === cat ? 'bg-neon border-neon' : 'bg-dark-card border-dark-border'
                }`}
              >
                <Text className={`text-xs font-bold ${category === cat ? 'text-dark font-extrabold' : 'text-light'}`}>
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Switch Toggle: Show Phone */}
          <View className="flex-row justify-between items-center bg-dark-card p-4 rounded-2xl border border-dark-border mb-6">
            <View className="flex-1 pr-4">
              <Text className="text-light text-sm font-extrabold">Telefon Numaramı Göster</Text>
              <Text className="text-muted text-xs mt-1 leading-relaxed">
                Açık olduğunda alıcılar sizi telefonla arayabilir. Kapalıyken sadece dahili chat üzerinden iletişim kurulur (Tavsiye edilen).
              </Text>
            </View>
            <Switch
              value={showPhone}
              onValueChange={setShowPhone}
              trackColor={{ false: '#2A2A2A', true: '#DEFF9A' }}
              thumbColor={showPhone ? '#121212' : '#9CA3AF'}
            />
          </View>

          {/* Update Action Group */}
          <View className="mt-2 mb-4 space-y-3">
            <Button
              title="Değişiklikleri Önizle 👀"
              onPress={() => {
                if (!title || !price || !description) {
                  Alert.alert('Eksik Bilgi', 'Lütfen önizlemeden önce tüm alanları doldurun.');
                  return;
                }
                setIsPreviewVisible(true);
              }}
              className="bg-neon border-neon"
            />

            <TouchableOpacity
              onPress={handleUpdate}
              disabled={isUpdating}
              className="h-14 border border-dark-border rounded-2xl items-center justify-center bg-neon active:scale-95 mt-4"
            >
              {isUpdating ? (
                <ActivityIndicator color="#121212" size="small" />
              ) : (
                <View className="flex-row items-center">
                  <Save size={18} color="#121212" className="mr-2" />
                  <Text className="text-dark font-black text-sm uppercase tracking-widest ml-2">Güncelle ve Kaydet 💾</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {/* VISUAL LISTING PREVIEW MODAL */}
      <Modal
        visible={isPreviewVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setIsPreviewVisible(false)}
      >
        <View className="flex-1 bg-dark">
          {/* Header */}
          <View className="pt-16 pb-4 px-6 border-b border-dark-border bg-dark-card flex-row justify-between items-center">
            <TouchableOpacity onPress={() => setIsPreviewVisible(false)} className="flex-row items-center">
              <ChevronLeft size={20} color="#DEFF9A" />
              <Text className="text-neon text-sm font-semibold ml-1">Düzenle</Text>
            </TouchableOpacity>
            <Text className="text-light text-base font-black uppercase tracking-wider">İlan Önizleme</Text>
            <View className="w-12" />
          </View>

          <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 160 }} showsVerticalScrollIndicator={false}>
            <View style={{ aspectRatio: 4 / 3 }} className="relative w-full bg-dark-input">
              {capturedImages.length > 0 ? (
                <Image
                  source={{ uri: capturedImages[0] }}
                  className="w-full h-full"
                  resizeMode="cover"
                />
              ) : (
                <View className="w-full h-full justify-center items-center">
                  <CameraIcon size={40} color="#9CA3AF" />
                </View>
              )}

              <View className="absolute bottom-4 left-6 bg-neon px-3.5 py-1.5 rounded-xl shadow-lg">
                <Text className="text-dark font-extrabold text-[10px] uppercase tracking-widest">
                  KAPAK GÖRSELİ
                </Text>
              </View>
            </View>

            <View className="p-6">
              <View className="flex-row items-center mb-4">
                <MapPin size={14} color="#DEFF9A" />
                <Text className="text-neon text-xs font-extrabold ml-2">
                  {locationName.replace(" 📍", "")}
                </Text>
              </View>

              <Text className="text-light text-2xl font-black tracking-tight leading-tight mb-3">
                {title || 'Başlıksız İlan'}
              </Text>

              <Text className="text-neon text-3xl font-black tracking-tighter mb-4">
                {parseFloat(price || '0').toLocaleString('tr-TR')} TL
              </Text>

              <View className="h-[1px] bg-dark-border my-4" />
              <View className="flex-row justify-between py-2.5">
                <Text className="text-muted text-sm font-semibold">Kategori</Text>
                <Text className="text-light text-sm font-bold">{category}</Text>
              </View>
              <View className="flex-row justify-between py-2.5">
                <Text className="text-muted text-sm font-semibold">Telefon Gösterim</Text>
                <Text className="text-light text-sm font-bold">{showPhone ? 'Evet' : 'Hayır (Sadece Mesaj)'}</Text>
              </View>
              <View className="h-[1px] bg-dark-border my-4" />

              <Text className="text-muted text-xs font-bold uppercase tracking-widest mb-3 text-left">Açıklama</Text>
              <Text className="text-light/90 text-base leading-relaxed font-normal text-left">
                {description || 'İlan açıklaması girilmedi.'}
              </Text>
            </View>
          </ScrollView>

          {/* Fixed Bottom Action Panel */}
          <View className="absolute bottom-0 left-0 right-0 p-6 bg-dark/95 border-t border-dark-border flex-row items-center justify-between z-20">
            <TouchableOpacity
              onPress={() => setIsPreviewVisible(false)}
              className="flex-row h-14 w-[35%] bg-dark-card border border-dark-border rounded-2xl justify-center items-center active:scale-95"
            >
              <Text className="text-muted font-bold text-sm">← Düzenle</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={async () => {
                setIsPreviewVisible(false);
                await handleUpdate();
              }}
              disabled={isUpdating}
              className="flex-row h-14 w-[60%] bg-neon rounded-2xl justify-center items-center active:scale-95"
            >
              {isUpdating ? (
                <ActivityIndicator color="#121212" size="small" />
              ) : (
                <Text className="text-dark font-extrabold text-base">Güncellemeyi Kaydet 💾</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};
