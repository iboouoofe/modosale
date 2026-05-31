import React, { createContext, useState, useEffect, useContext, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface UserProfile {
  id: string;
  phone_number: string;
  email?: string | null;
  display_name: string;
  avatar_url?: string | null;
  is_phone_verified: boolean;
}

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  favorites: string[];
  toggleFavorite: (id: string) => Promise<void>;
  isFavorite: (id: string) => boolean;
  loginWithPhone: (phoneNumber: string, displayName: string, code?: string) => Promise<boolean>;
  loginWithGoogle: () => Promise<boolean>;
  updateProfile: (displayName: string, email?: string | null, avatarUrl?: string | null) => Promise<boolean>;
  logout: () => void;
}

// ─── API Base URL ──────────────────────────────────────────────────────────────
// Uses local network IP so physical devices can reach the dev backend.
// Update this if your machine's IP changes.
export const API_BASE_URL = __DEV__
  ? 'http://192.168.1.120:4000/api/v1'
  : 'https://api.modosale.com/api/v1';

// ─── Storage Keys ─────────────────────────────────────────────────────────────
const KEYS = {
  USER: 'modosale_user',
  TOKEN: 'modosale_token',
  REFRESH: 'modosale_refresh_token',
  FAVS: (uid: string) => `modosale_favorites_${uid}`,
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const tokenRef = useRef<string | null>(null);
  const refreshTokenRef = useRef<string | null>(null);

  useEffect(() => { tokenRef.current = token; }, [token]);
  useEffect(() => { refreshTokenRef.current = refreshToken; }, [refreshToken]);

  // ─── Restore session on mount ───────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const [storedUser, storedToken, storedRefresh] = await Promise.all([
          AsyncStorage.getItem(KEYS.USER),
          AsyncStorage.getItem(KEYS.TOKEN),
          AsyncStorage.getItem(KEYS.REFRESH),
        ]);

        if (storedUser && storedToken && storedRefresh) {
          const parsed = JSON.parse(storedUser) as UserProfile;
          setUser(parsed);
          setToken(storedToken);
          setRefreshToken(storedRefresh);

          const storedFavs = await AsyncStorage.getItem(KEYS.FAVS(parsed.id));
          if (storedFavs) setFavorites(JSON.parse(storedFavs));
        }
      } catch (err) {
        console.error('[Auth] Error restoring session:', err);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  // ─── Authenticated fetch helper ─────────────────────────────────────────────
  // Instead of overriding window.fetch (not safe in React Native),
  // use this helper for all authenticated calls.
  const authFetch = async (url: string, options: RequestInit = {}): Promise<Response> => {
    const currentToken = tokenRef.current;
    const headers = new Headers(options.headers || {});
    headers.set('Content-Type', 'application/json');
    if (currentToken) headers.set('Authorization', `Bearer ${currentToken}`);

    let response = await fetch(url, { ...options, headers });

    // Silent token refresh on 401
    if (response.status === 401 && refreshTokenRef.current) {
      try {
        const refreshRes = await fetch(`${API_BASE_URL}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh_token: refreshTokenRef.current }),
        });
        const refreshData = await refreshRes.json();

        if (refreshData.success) {
          const newToken = refreshData.access_token;
          setToken(newToken);
          tokenRef.current = newToken;
          await AsyncStorage.setItem(KEYS.TOKEN, newToken);

          headers.set('Authorization', `Bearer ${newToken}`);
          response = await fetch(url, { ...options, headers });
        } else {
          logout();
        }
      } catch {
        logout();
      }
    }

    return response;
  };

  // ─── Favorites ──────────────────────────────────────────────────────────────
  const saveFavorites = async (newFavs: string[]) => {
    if (!user) return;
    setFavorites(newFavs);
    await AsyncStorage.setItem(KEYS.FAVS(user.id), JSON.stringify(newFavs));
  };

  const toggleFavorite = async (id: string) => {
    if (!user) return;
    const isFav = favorites.includes(id);
    const newFavs = isFav ? favorites.filter((f) => f !== id) : [...favorites, id];

    await authFetch(`${API_BASE_URL}/listings/${id}/favorite`, {
      method: isFav ? 'DELETE' : 'POST',
    }).catch(() => {});
    await saveFavorites(newFavs);
  };

  const isFavorite = (id: string) => favorites.includes(id);

  // ─── Login with Phone (OTP) ──────────────────────────────────────────────────
  const loginWithPhone = async (phoneNumber: string, displayName: string, code?: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/auth/register-verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone_number: phoneNumber,
          display_name: displayName,
          avatar_url: `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=DEFF9A&color=0E1117&bold=true`,
          code,
        }),
      });

      const resData = await response.json();
      console.log('[Auth] register-verify response:', JSON.stringify(resData));

      if (resData.success) {
        const { access_token, refresh_token, user: userData } = resData;
        setToken(access_token);
        setRefreshToken(refresh_token);
        setUser(userData);

        await Promise.all([
          AsyncStorage.setItem(KEYS.TOKEN, access_token),
          AsyncStorage.setItem(KEYS.REFRESH, refresh_token),
          AsyncStorage.setItem(KEYS.USER, JSON.stringify(userData)),
        ]);

        const storedFavs = await AsyncStorage.getItem(KEYS.FAVS(userData.id));
        setFavorites(storedFavs ? JSON.parse(storedFavs) : []);

        return true;
      }

      console.warn('[Auth] register-verify failed:', resData.error);
      return false;
    } catch (err) {
      console.error('[Auth] loginWithPhone error:', err);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Login with Google (Demo) ────────────────────────────────────────────────
  const loginWithGoogle = async (): Promise<boolean> => {
    return loginWithPhone('+905559876543', 'Misafir Üye');
  };

  // ─── Update Profile ─────────────────────────────────────────────────────────
  const updateProfile = async (displayName: string, email?: string | null, avatarUrl?: string | null): Promise<boolean> => {
    if (!user) return false;
    setIsLoading(true);
    try {
      const response = await authFetch(`${API_BASE_URL}/auth/register-verify`, {
        method: 'POST',
        body: JSON.stringify({
          phone_number: user.phone_number,
          display_name: displayName,
          email: email ?? null,
          avatar_url: avatarUrl ?? user.avatar_url,
        }),
      });
      const resData = await response.json();

      if (resData.success) {
        setUser(resData.user);
        await AsyncStorage.setItem(KEYS.USER, JSON.stringify(resData.user));
        return true;
      }
      return false;
    } catch (err) {
      console.error('[Auth] updateProfile error:', err);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Logout ─────────────────────────────────────────────────────────────────
  const logout = async () => {
    try {
      if (refreshToken) {
        await fetch(`${API_BASE_URL}/auth/logout`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh_token: refreshToken }),
        }).catch(() => {});
      }
    } finally {
      setUser(null);
      setToken(null);
      setRefreshToken(null);
      setFavorites([]);
      await Promise.all([
        AsyncStorage.removeItem(KEYS.USER),
        AsyncStorage.removeItem(KEYS.TOKEN),
        AsyncStorage.removeItem(KEYS.REFRESH),
      ]);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        refreshToken,
        favorites,
        toggleFavorite,
        isFavorite,
        isAuthenticated: !!user,
        isLoading,
        loginWithPhone,
        loginWithGoogle,
        updateProfile,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
