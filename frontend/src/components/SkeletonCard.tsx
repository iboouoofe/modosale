import React, { useEffect, useRef } from 'react';
import { View, Dimensions, StyleSheet, Animated } from 'react-native';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CARD_WIDTH = (SCREEN_WIDTH - 24 * 2 - 8) / 2;

const ShimmerBox: React.FC<{ width: number | string; height: number; borderRadius?: number; style?: any }> = ({
  width,
  height,
  borderRadius = 10,
  style,
}) => {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 800, useNativeDriver: false }),
        Animated.timing(anim, { toValue: 0, duration: 800, useNativeDriver: false }),
      ])
    ).start();
  }, []);

  const backgroundColor = anim.interpolate({
    inputRange: [0, 1],
    outputRange: ['#1E2530', '#2E3849'],
  });

  return (
    <Animated.View
      style={[
        { width: width as any, height, borderRadius, backgroundColor },
        style,
      ]}
    />
  );
};

export const SkeletonCard: React.FC = () => {
  return (
    <View style={[styles.card, { width: CARD_WIDTH }]}>
      <ShimmerBox width="100%" height={CARD_WIDTH} borderRadius={16} />
      <ShimmerBox width="80%" height={12} borderRadius={6} style={{ marginTop: 10 }} />
      <ShimmerBox width="55%" height={10} borderRadius={6} style={{ marginTop: 6 }} />
      <ShimmerBox width="45%" height={22} borderRadius={8} style={{ marginTop: 10 }} />
    </View>
  );
};

export const SkeletonGrid: React.FC<{ count?: number }> = ({ count = 6 }) => {
  return (
    <View style={styles.grid}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#131820',
    borderRadius: 20,
    padding: 10,
    margin: 4,
    borderWidth: 1,
    borderColor: '#1E2530',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    paddingTop: 12,
  },
});
