import React from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';
import { MapPin, Heart } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';

export interface ProductItem {
  id: string;
  user_id: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  images: string[];
  category: string;
  city_district: string;
  show_phone: boolean;
  distance_meters?: number;
  created_at: string;
  original_price?: number;
  video_url?: string | null;
}

interface ProductCardProps {
  item: ProductItem;
  onPress: () => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ item, onPress }) => {
  const { isFavorite, toggleFavorite, user } = useAuth();

  // Format distance
  const formatDistance = (meters?: number) => {
    if (meters === undefined) return 'Yakınlarda';
    if (meters < 1000) {
      return `${Math.round(meters)}m uzakta`;
    }
    return `${(meters / 1000).toFixed(1)}km uzakta`;
  };

  const discountPercentage = item.original_price && item.original_price > item.price
    ? Math.round(((item.original_price - item.price) / item.original_price) * 100)
    : 0;

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onPress}
      style={{ maxWidth: '48%' }}
      className="flex-1 m-1.5 bg-dark-card rounded-2xl overflow-hidden border border-dark-border"
    >
      {/* Product Image */}
      <View className="relative w-full aspect-square bg-dark-input">
        <Image
          source={{ uri: item.images[0] }}
          className="w-full h-full object-cover"
          resizeMode="cover"
        />

        {/* Price Drop Alert Badge */}
        {discountPercentage > 0 && (
          <View className="absolute top-2.5 left-2.5 bg-red-600/90 border border-red-500 px-2.5 py-1.5 rounded-xl shadow-lg">
            <Text className="text-white font-black text-[9px] uppercase tracking-wider">
              -%{discountPercentage} İndirim! 📉
            </Text>
          </View>
        )}

        {/* Absolute Distance Badge */}
        <View className="absolute bottom-2.5 left-2.5 px-2.5 py-1 bg-dark/85 backdrop-blur-md rounded-full flex-row items-center border border-dark-border">
          <MapPin size={10} color="#DEFF9A" />
          <Text className="text-neon text-[10px] font-bold ml-1">
            {formatDistance(item.distance_meters)}
          </Text>
        </View>

        {/* Absolute Heart Toggle Button */}
        {user && (
          <TouchableOpacity
            onPress={(e) => {
              e.stopPropagation();
              toggleFavorite(item.id);
            }}
            activeOpacity={0.7}
            className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-dark/75 backdrop-blur-md items-center justify-center border border-dark-border"
          >
            <Heart
              size={13}
              color={isFavorite(item.id) ? '#EF4444' : '#DEFF9A'}
              fill={isFavorite(item.id) ? '#EF4444' : 'transparent'}
            />
          </TouchableOpacity>
        )}

        {/* Glowing Video Badge (Phase 6) */}
        {item.video_url && (
          <View className="absolute bottom-2.5 right-2.5 px-2 py-0.5 bg-neon border border-neon rounded-full flex-row items-center">
            <Text className="text-dark text-[8px] font-black uppercase tracking-widest">▶ Video</Text>
          </View>
        )}
      </View>

      {/* Info Content */}
      <View className="p-3">
        <View className="flex-row items-center flex-wrap">
          <Text className="text-neon text-[16px] font-extrabold tracking-tight">
            {item.price.toLocaleString('tr-TR')} {item.currency || 'TL'}
          </Text>
          {item.original_price && item.original_price > item.price && (
            <Text className="text-muted text-[11px] line-through ml-2 font-semibold">
              {item.original_price.toLocaleString('tr-TR')} TL
            </Text>
          )}
        </View>
        
        <Text
          numberOfLines={1}
          className="text-light text-sm font-medium mt-1 leading-snug"
        >
          {item.title}
        </Text>

        <View className="flex-row items-center mt-2.5 opacity-80">
          <Text numberOfLines={1} className="text-muted text-[10px] font-semibold tracking-wider uppercase">
            {item.city_district} • {item.category}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};
