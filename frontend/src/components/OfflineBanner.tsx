import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { WifiOff, Wifi } from 'lucide-react-native';

export const OfflineBanner: React.FC = () => {
  const [isConnected, setIsConnected] = React.useState<boolean | null>(true);
  const [wasOffline, setWasOffline] = React.useState(false);
  const [showReconnected, setShowReconnected] = React.useState(false);
  const slideAnim = useRef(new Animated.Value(-60)).current;
  const reconnectedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      const connected = state.isConnected;

      setIsConnected(connected);

      if (connected === false) {
        setWasOffline(true);
        setShowReconnected(false);
        // Slide in banner
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 100,
          friction: 12,
        }).start();
      } else if (connected === true && wasOffline) {
        // Show "reconnected" briefly then hide
        setShowReconnected(true);
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 100,
          friction: 12,
        }).start();

        reconnectedTimer.current = setTimeout(() => {
          Animated.timing(slideAnim, {
            toValue: -60,
            duration: 350,
            useNativeDriver: true,
          }).start(() => {
            setShowReconnected(false);
            setWasOffline(false);
          });
        }, 2500);
      }
    });

    return () => {
      unsubscribe();
      if (reconnectedTimer.current) clearTimeout(reconnectedTimer.current);
    };
  }, [wasOffline]);

  // Don't render anything if we're connected and never went offline
  if (isConnected && !wasOffline && !showReconnected) return null;

  const isOffline = !isConnected;

  return (
    <Animated.View
      style={[
        styles.banner,
        isOffline ? styles.offlineBg : styles.onlineBg,
        { transform: [{ translateY: slideAnim }] },
      ]}
    >
      {isOffline ? (
        <WifiOff size={14} color="#fff" />
      ) : (
        <Wifi size={14} color="#131820" />
      )}
      <Text style={[styles.text, !isOffline && styles.textDark]}>
        {isOffline
          ? 'İnternet bağlantısı yok — önbellek gösteriliyor'
          : '✓ Bağlantı yeniden kuruldu'}
      </Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 999,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    gap: 8,
  },
  offlineBg: {
    backgroundColor: '#EF4444',
  },
  onlineBg: {
    backgroundColor: '#DEFF9A',
  },
  text: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 12,
    marginLeft: 6,
  },
  textDark: {
    color: '#131820',
  },
});
