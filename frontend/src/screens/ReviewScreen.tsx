import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useAuth, API_BASE_URL } from '../context/AuthContext';
import { Star, ChevronLeft, Send } from 'lucide-react-native';

interface ReviewScreenProps {
  navigation: any;
  route: {
    params: {
      revieweeId: string;
      revieweeName: string;
      listingId?: string;
      listingTitle?: string;
    };
  };
}

const RATING_LABELS = ['', 'Çok Kötü 😞', 'Kötü 🙁', 'Orta 😐', 'İyi 😊', 'Mükemmel 🤩'];

export const ReviewScreen: React.FC<any> = ({ navigation, route }) => {
  const { user, token } = useAuth();
  const { revieweeId, revieweeName, listingId, listingTitle } = route.params;

  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const displayRating = hoverRating || rating;

  const handleSubmit = async () => {
    if (rating === 0) {
      Alert.alert('Puan Seçin', 'Lütfen 1-5 arasında bir puan seçin.');
      return;
    }
    if (!user) {
      Alert.alert('Hata', 'Değerlendirme yapmak için giriş yapmanız gerekiyor.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          reviewer_id: user.id,
          reviewee_id: revieweeId,
          listing_id: listingId || null,
          rating,
          comment: comment.trim() || null,
        }),
      });

      const resData = await response.json();
      if (resData.success) {
        Alert.alert(
          'Değerlendirme Gönderildi ✅',
          `${revieweeName} için ${rating} yıldızlı değerlendirmeniz kaydedildi.`,
          [{ text: 'Tamam', onPress: () => navigation.goBack() }]
        );
      } else {
        Alert.alert('Hata', resData.error || 'Değerlendirme gönderilemedi.');
      }
    } catch (err) {
      Alert.alert('Bağlantı Hatası', 'Lütfen internet bağlantınızı kontrol edin.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <ChevronLeft size={22} color="#DEFF9A" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Değerlendirme Yaz</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
          {/* Context Card */}
          <View style={styles.contextCard}>
            <Text style={styles.contextLabel}>Değerlendirilen Kişi</Text>
            <Text style={styles.contextName}>{revieweeName}</Text>
            {listingTitle && (
              <>
                <Text style={styles.contextLabel2}>İlan</Text>
                <Text style={styles.contextSub}>{listingTitle}</Text>
              </>
            )}
          </View>

          {/* Star Rating */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Puan Ver</Text>
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity
                  key={star}
                  onPress={() => setRating(star)}
                  activeOpacity={0.8}
                  style={styles.starBtn}
                >
                  <Star
                    size={40}
                    color={star <= displayRating ? '#DEFF9A' : '#2E3849'}
                    fill={star <= displayRating ? '#DEFF9A' : 'transparent'}
                  />
                </TouchableOpacity>
              ))}
            </View>
            {displayRating > 0 && (
              <Text style={styles.ratingLabel}>{RATING_LABELS[displayRating]}</Text>
            )}
          </View>

          {/* Comment */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Yorum (İsteğe Bağlı)</Text>
            <View style={styles.inputBox}>
              <TextInput
                style={styles.textArea}
                placeholder="Satıcı veya alıcı hakkında deneyimlerinizi paylaşın..."
                placeholderTextColor="#6B7280"
                value={comment}
                onChangeText={setComment}
                multiline
                numberOfLines={5}
                maxLength={500}
                textAlignVertical="top"
              />
              <Text style={styles.charCount}>{comment.length}/500</Text>
            </View>
          </View>

          {/* Quick Tag Chips */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Hızlı Etiket</Text>
            <View style={styles.chipsRow}>
              {['Güvenilir', 'Hızlı İletişim', 'Paketi Özenli', 'Ürün Sıfır Gibiydi', 'Tavsiye Ederim'].map(
                (tag) => (
                  <TouchableOpacity
                    key={tag}
                    onPress={() =>
                      setComment((prev) =>
                        prev.includes(tag) ? prev.replace(tag + ' ', '') : prev + tag + ' '
                      )
                    }
                    style={[
                      styles.chip,
                      comment.includes(tag) && styles.chipActive,
                    ]}
                  >
                    <Text style={[styles.chipText, comment.includes(tag) && styles.chipTextActive]}>
                      {tag}
                    </Text>
                  </TouchableOpacity>
                )
              )}
            </View>
          </View>
        </ScrollView>

        {/* Submit Button */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.submitBtn, (rating === 0 || isSubmitting) && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            activeOpacity={0.85}
            disabled={rating === 0 || isSubmitting}
          >
            <Send size={16} color="#0E1117" />
            <Text style={styles.submitText}>
              {isSubmitting ? 'Gönderiliyor...' : 'Değerlendirmeyi Gönder'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0E1117',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#1E2530',
    backgroundColor: '#131820',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1E2530',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: '#F9FAFB',
    fontSize: 16,
    fontWeight: '800',
  },
  contextCard: {
    margin: 20,
    backgroundColor: '#131820',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#1E2530',
    padding: 18,
  },
  contextLabel: {
    color: '#9CA3AF',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  contextLabel2: {
    color: '#9CA3AF',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 4,
    marginTop: 12,
  },
  contextName: {
    color: '#DEFF9A',
    fontSize: 18,
    fontWeight: '900',
  },
  contextSub: {
    color: '#F9FAFB',
    fontSize: 13,
    fontWeight: '600',
  },
  section: {
    marginHorizontal: 20,
    marginBottom: 24,
  },
  sectionLabel: {
    color: '#9CA3AF',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 14,
  },
  starsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 12,
  },
  starBtn: {
    padding: 4,
  },
  ratingLabel: {
    color: '#DEFF9A',
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 4,
  },
  inputBox: {
    backgroundColor: '#131820',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1E2530',
    padding: 14,
  },
  textArea: {
    color: '#F9FAFB',
    fontSize: 14,
    minHeight: 110,
    lineHeight: 22,
  },
  charCount: {
    color: '#6B7280',
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'right',
    marginTop: 6,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#1E2530',
    backgroundColor: '#131820',
  },
  chipActive: {
    backgroundColor: '#DEFF9A20',
    borderColor: '#DEFF9A',
  },
  chipText: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '600',
  },
  chipTextActive: {
    color: '#DEFF9A',
    fontWeight: '800',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    paddingBottom: 36,
    backgroundColor: '#0E1117',
    borderTopWidth: 1,
    borderTopColor: '#1E2530',
  },
  submitBtn: {
    backgroundColor: '#DEFF9A',
    borderRadius: 18,
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  submitBtnDisabled: {
    opacity: 0.4,
  },
  submitText: {
    color: '#0E1117',
    fontSize: 15,
    fontWeight: '900',
    marginLeft: 8,
  },
});
