import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';

const ShimmerBox: React.FC<{ width: number | string; height: number; borderRadius?: number; style?: any }> = ({
  width,
  height,
  borderRadius = 8,
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
      style={[{ width: width as any, height, borderRadius, backgroundColor }, style]}
    />
  );
};

export const SkeletonListItem: React.FC = () => {
  return (
    <View style={styles.row}>
      <ShimmerBox width={48} height={48} borderRadius={24} />
      <View style={styles.lines}>
        <ShimmerBox width="60%" height={13} borderRadius={6} />
        <ShimmerBox width="40%" height={10} borderRadius={6} style={{ marginTop: 6 }} />
        <ShimmerBox width="75%" height={10} borderRadius={6} style={{ marginTop: 6 }} />
      </View>
      <ShimmerBox width={32} height={10} borderRadius={5} />
    </View>
  );
};

export const SkeletonChatList: React.FC<{ count?: number }> = ({ count = 5 }) => {
  return (
    <View style={styles.container}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonListItem key={i} />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { padding: 16 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#131820',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1E2530',
    padding: 14,
    marginBottom: 10,
  },
  lines: {
    flex: 1,
    marginHorizontal: 12,
  },
});
