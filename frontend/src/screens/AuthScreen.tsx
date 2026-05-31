import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, Modal } from 'react-native';
import { useAuth, API_BASE_URL } from '../context/AuthContext';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Phone, Chrome, ChevronLeft, ShieldCheck } from 'lucide-react-native';

export const AuthScreen: React.FC = () => {
  const { loginWithPhone, loginWithGoogle } = useAuth();
  
  const [phoneNumber, setPhoneNumber] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [isPhoneMode, setIsPhoneMode] = useState(false);
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [devCode, setDevCode] = useState(''); // DEV ONLY: shows OTP on screen
  const [agreementAccepted, setAgreementAccepted] = useState(false);
  const [isAgreementModalVisible, setIsAgreementModalVisible] = useState(false);

  const handlePhoneSubmit = async () => {
    if (!phoneNumber || !displayName) {
      setError('Lütfen tüm alanları doldurun.');
      return;
    }
    if (!agreementAccepted) {
      setError('Üyelik için Kullanıcı ve İkinci El Satış Sözleşmesi\'ni kabul etmelisiniz.');
      return;
    }
    setError('');
    setIsLoading(true);
    
    try {
      // Connect to live request-otp endpoint
      const response = await fetch(`${API_BASE_URL}/auth/request-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone_number: phoneNumber,
        }),
      });

      const resData = await response.json();

      if (resData.success) {
        setIsOtpSent(true);
        // Show code on screen for dev/demo (backend returns code in response)
        if (resData.code) {
          setDevCode(resData.code);
          setOtpCode(resData.code); // Auto-fill for convenience
          console.log(`[Modosale Auth] Code received: ${resData.code}`);
        }
      } else {
        setError(resData.error || 'Kod gönderilemedi.');
      }
    } catch (err) {
      console.error('Request OTP error:', err);
      setError('Bağlantı hatası. Lütfen sunucunun açık olduğundan emin olun.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otpCode.length < 6) {
      setError('Lütfen 6 haneli doğrulama kodunu girin.');
      return;
    }
    setError('');
    setIsLoading(true);
    
    // Calls live auth register-verify on backend with 6-digit code
    const success = await loginWithPhone(phoneNumber, displayName, otpCode);
    setIsLoading(false);
    
    if (!success) {
      setError('Doğrulama başarısız oldu. Lütfen kodu kontrol edip tekrar deneyin.');
    }
  };

  const handleGoogleSubmit = async () => {
    setIsLoading(true);
    await loginWithGoogle();
    setIsLoading(false);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-dark"
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <View className="flex-1 justify-between px-6 pt-24 pb-12">
          
          {/* Top Back Nav */}
          <View className="h-10">
            {isPhoneMode && (
              <TouchableOpacity
                onPress={() => {
                  if (isOtpSent) {
                    setIsOtpSent(false);
                  } else {
                    setIsPhoneMode(false);
                  }
                  setError('');
                }}
                className="flex-row items-center"
              >
                <ChevronLeft size={20} color="#DEFF9A" />
                <Text className="text-neon text-base ml-1 font-semibold">Geri Dön</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Rebranded Typographic Logo */}
          <View className="items-center my-8">
            <Text className="text-neon text-5xl font-black tracking-tighter uppercase pl-2">
              MODOSALE
            </Text>
            <Text className="text-muted text-xs font-semibold tracking-widest mt-2 lowercase">
              sadece mobil • sadece yerel
            </Text>
          </View>

          {/* Form Area */}
          <View className="flex-1 justify-center max-w-md w-full self-center">
            {error ? (
              <View className="mb-4 p-3 bg-red-950/40 border border-red-500 rounded-xl">
                <Text className="text-red-400 text-xs font-semibold text-center">{error}</Text>
              </View>
            ) : null}

            {!isPhoneMode ? (
              /* Social Onboarding Mode */
              <View className="space-y-4">
                <Button
                  title="Google ile Devam Et"
                  variant="primary"
                  isLoading={isLoading}
                  leftIcon={<Chrome size={20} color="#121212" />}
                  onPress={handleGoogleSubmit}
                  className="mb-4"
                />

                <Button
                  title="Telefon Numarası ile Doğrula"
                  variant="outline"
                  leftIcon={<Phone size={20} color="#DEFF9A" />}
                  onPress={() => setIsPhoneMode(true)}
                />
              </View>
            ) : !isOtpSent ? (
              /* Step 1: Input Phone + Name */
              <View>
                <Input
                  label="Ad Soyad"
                  placeholder="Can Yılmaz"
                  value={displayName}
                  onChangeText={setDisplayName}
                  autoCorrect={false}
                />
                
                <Input
                  label="Telefon Numarası"
                  placeholder="+90 532 123 4567"
                  keyboardType="phone-pad"
                  value={phoneNumber}
                  onChangeText={setPhoneNumber}
                  leftIcon={<Phone size={16} color="#9CA3AF" />}
                />

                {/* Resmî 2. El Satış Sözleşmesi Checkbox */}
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 16, marginBottom: 12, paddingHorizontal: 4 }}>
                  <TouchableOpacity
                    onPress={() => setAgreementAccepted(!agreementAccepted)}
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 6,
                      borderWidth: 1.5,
                      borderColor: agreementAccepted ? '#DEFF9A' : '#1E2530',
                      backgroundColor: agreementAccepted ? '#DEFF9A' : '#131820',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {agreementAccepted && <Text style={{ color: '#0E1117', fontSize: 11, fontWeight: '900' }}>✓</Text>}
                  </TouchableOpacity>
                  
                  <TouchableOpacity onPress={() => setIsAgreementModalVisible(true)} style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={{ color: '#9CA3AF', fontSize: 11, lineHeight: 16 }}>
                      Üyeliğimi tamamlamak için <Text style={{ color: '#DEFF9A', fontWeight: 'bold', textDecorationLine: 'underline' }}>ModoSale Kullanıcı ve İkinci El Satış Sözleşmesi</Text>'ni okudum ve kabul ediyorum.
                    </Text>
                  </TouchableOpacity>
                </View>

                <Button
                  title="Doğrulama Kodu Gönder"
                  isLoading={isLoading}
                  onPress={handlePhoneSubmit}
                  className="mt-2"
                />
              </View>
            ) : (
              /* Step 2: Input OTP Verification */
              <View>
                <Text className="text-light text-center text-sm font-medium mb-4 flex-wrap leading-relaxed">
                  {phoneNumber} numarasına gönderilen 6 haneli kodu girin.
                </Text>

                {/* DEV MODE: Show code on screen */}
                {devCode ? (
                  <View style={{ backgroundColor: '#1A2940', borderRadius: 14, padding: 14, marginBottom: 16, borderWidth: 1.5, borderColor: '#DEFF9A40', alignItems: 'center' }}>
                    <Text style={{ color: '#9CA3AF', fontSize: 10, fontWeight: '700', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 6 }}>🔐 Test Kodu (Geliştirici)</Text>
                    <Text style={{ color: '#DEFF9A', fontSize: 28, fontWeight: '900', letterSpacing: 8 }}>{devCode}</Text>
                    <Text style={{ color: '#6B7280', fontSize: 10, marginTop: 4 }}>Kod otomatik dolduruldu</Text>
                  </View>
                ) : null}

                <Input
                  label="Doğrulama Kodu"
                  placeholder="123456"
                  keyboardType="number-pad"
                  maxLength={6}
                  value={otpCode}
                  onChangeText={(t) => { setOtpCode(t); setDevCode(''); }}
                  className="text-center font-extrabold tracking-[10px]"
                />

                <Button
                  title="Girişi Tamamla"
                  isLoading={isLoading}
                  onPress={handleVerifyOtp}
                  className="mt-4"
                />

                <TouchableOpacity
                  onPress={() => { setDevCode(''); handlePhoneSubmit(); }}
                  className="mt-6 items-center"
                >
                  <Text className="text-neon text-sm font-bold">Kodu Tekrar Gönder</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Policy footer */}
          <View className="items-center mt-6">
            <Text className="text-muted text-[10px] text-center max-w-[280px] leading-relaxed">
              Devam ederek Modosale Kullanıcı Sözleşmesi ve Gizlilik Politikası kurallarını kabul etmiş olursunuz.
            </Text>
          </View>

        </View>
      </ScrollView>

      {/* 📜 RESMÎ 2. EL SATIŞ VE ÜYELİK SÖZLEŞMESİ MODALI */}
      <Modal
        visible={isAgreementModalVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setIsAgreementModalVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: '#0E1117', paddingHorizontal: 24, paddingTop: 60, paddingBottom: 36 }}>
          {/* Header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <ShieldCheck size={22} color="#DEFF9A" style={{ marginRight: 8 }} />
              <Text style={{ color: '#F9FAFB', fontSize: 16, fontWeight: '900' }}>Kullanıcı ve İkinci El Satış Sözleşmesi</Text>
            </View>
          </View>

          {/* Legal Document Content */}
          <ScrollView style={{ flex: 1, backgroundColor: '#131820', borderRadius: 16, borderWidth: 1, borderColor: '#1E2530', padding: 18, marginBottom: 24 }} showsVerticalScrollIndicator={false}>
            <Text style={{ color: '#DEFF9A', fontSize: 13, fontWeight: '900', marginBottom: 12, textTransform: 'uppercase' }}>MODOSALE MESAFELİ İKİNCİ EL SATIŞ VE ÜYELİK SÖZLEŞMESİ</Text>
            <Text style={{ color: '#9CA3AF', fontSize: 10, fontWeight: '700', marginBottom: 16 }}>Son Güncelleme: 31 Mayıs 2026</Text>
            
            <Text style={{ color: '#F9FAFB', fontSize: 12, fontWeight: '800', marginTop: 12, marginBottom: 6 }}>1. TARAFLAR VE KAPSAM</Text>
            <Text style={{ color: '#9CA3AF', fontSize: 11, lineHeight: 18, marginBottom: 12 }}>
              İşbu sözleşme, ModoSale mobil uygulamasına üye olan "Kullanıcı" ile ModoSale platformu arasında akdedilmiştir. Uygulamaya kayıt olan her üye, bu sözleşmenin tüm şartlarını kayıtsız şartsız kabul etmiş sayılır.
            </Text>

            <Text style={{ color: '#F9FAFB', fontSize: 12, fontWeight: '800', marginTop: 12, marginBottom: 6 }}>2. ARACI HİZMET SAĞLAYICI ROLÜ</Text>
            <Text style={{ color: '#9CA3AF', fontSize: 11, lineHeight: 18, marginBottom: 12 }}>
              ModoSale, 6563 Sayılı Elektronik Ticaretin Düzenlenmesi Hakkında Kanun uyarınca sadece bir "Aracı Hizmet Sağlayıcı" konumundadır. Kullanıcılar tarafından yüklenen ilanların içeriğinden, ürünlerin doğruluğundan veya taraflar arasındaki ticari uyuşmazlıklardan ModoSale kesinlikle sorumlu tutulamaz.
            </Text>

            <Text style={{ color: '#F9FAFB', fontSize: 12, fontWeight: '800', marginTop: 12, marginBottom: 6 }}>3. 2. EL SATIŞ VE MÜLKİYET SORUMLULUĞU</Text>
            <Text style={{ color: '#9CA3AF', fontSize: 11, lineHeight: 18, marginBottom: 12 }}>
              Satıcı, ModoSale üzerinden yayınladığı ikinci el ürünün mülkiyetinin kendisine ait olduğunu ve ürünün yasal mevzuata uygun olduğunu taahhüt eder. Çalıntı, sahte, taklit veya satışı kanunen yasaklanmış (silah, ilaç vb.) ürünlerin ModoSale üzerinde satılması kesinlikle yasaktır. Tespiti halinde üyelik kalıcı olarak askıya alınır ve yasal mercilere bildirim yapılır.
            </Text>

            <Text style={{ color: '#F9FAFB', fontSize: 12, fontWeight: '800', marginTop: 12, marginBottom: 6 }}>4. ALICI VE SATICI ARASINDAKİ İLETİŞİM</Text>
            <Text style={{ color: '#9CA3AF', fontSize: 11, lineHeight: 18, marginBottom: 12 }}>
              Kullanıcılar arasındaki elden teslimat, pazarlık, ödeme ve kargo süreçleri tamamen tarafların kendi rızası ve sorumluluğundadır. ModoSale, bu süreçlerde yaşanabilecek dolandırıcılık, hasarlı ürün veya ödeme eksikliği durumlarında taraf veya arabulucu değildir.
            </Text>

            <Text style={{ color: '#F9FAFB', fontSize: 12, fontWeight: '800', marginTop: 12, marginBottom: 6 }}>5. KİŞİSEL VERİLERİN KORUNMASI (KVKK)</Text>
            <Text style={{ color: '#9CA3AF', fontSize: 11, lineHeight: 18, marginBottom: 12 }}>
              ModoSale, 6698 Sayılı Kişisel Verilerin Korunması Kanunu (KVKK) uyarınca üye bilgilerini şifreli olarak saklar. Konum bilginiz sadece yakınlardaki ilanları bulabilmek adına anlık olarak işlenir ve üçüncü şahıslarla asla paylaşılmaz.
            </Text>
          </ScrollView>

          {/* Action Buttons */}
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <TouchableOpacity
              onPress={() => {
                setAgreementAccepted(false);
                setIsAgreementModalVisible(false);
              }}
              style={{ flex: 1, height: 50, borderColor: '#1E2530', borderWidth: 1, borderRadius: 14, backgroundColor: '#131820', alignItems: 'center', justifyContent: 'center' }}
            >
              <Text style={{ color: '#EF4444', fontSize: 13, fontWeight: 'bold' }}>Reddet</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setAgreementAccepted(true);
                setIsAgreementModalVisible(false);
              }}
              style={{ flex: 2, height: 50, borderRadius: 14, backgroundColor: '#DEFF9A', alignItems: 'center', justifyContent: 'center' }}
            >
              <Text style={{ color: '#0E1117', fontSize: 14, fontWeight: '900' }}>Okudum, Kabul Ediyorum ✓</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
};
