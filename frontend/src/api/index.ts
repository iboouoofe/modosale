import AsyncStorage from '@react-native-async-storage/async-storage';
import { ApiResponse } from '../types';

// ─── Base URL ──────────────────────────────────────────────────────────────────
export const API_BASE = __DEV__
  ? 'http://localhost:4000/api/v1'
  : 'https://api.modosale.app/api/v1';

// ─── HTTP Client ───────────────────────────────────────────────────────────────
const getHeaders = async (): Promise<Record<string, string>> => {
  const token = await AsyncStorage.getItem('@modosale_token');
  const user = await AsyncStorage.getItem('@modosale_user');
  const userId = user ? JSON.parse(user).id : '';

  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(userId ? { 'x-user-id': userId } : {}),
  };
};

async function request<T>(
  method: string,
  path: string,
  body?: any
): Promise<ApiResponse<T>> {
  try {
    const headers = await getHeaders();
    const response = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await response.json();
    return data as ApiResponse<T>;
  } catch (error: any) {
    return { success: false, error: error.message || 'Ağ hatası.' };
  }
}

// ─── Exported API Methods ─────────────────────────────────────────────────────

export const api = {
  // Auth
  auth: {
    requestOtp: (phone_number: string) =>
      request('POST', '/auth/otp', { phone_number }),
    verify: (payload: { phone_number: string; display_name: string; code?: string; email?: string }) =>
      request('POST', '/auth/register', payload),
    refreshToken: (refresh_token: string) =>
      request('POST', '/auth/refresh', { refresh_token }),
    logout: (refresh_token?: string) =>
      request('POST', '/auth/logout', { refresh_token }),
    getProfile: () =>
      request('GET', '/auth/profile'),
    updateProfile: (payload: { display_name: string; email?: string; avatar_url?: string }) =>
      request('PATCH', '/auth/profile', payload),
  },

  // Listings
  listings: {
    getFeed: (params: Record<string, any>) => {
      const qs = new URLSearchParams(
        Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '').map(([k, v]) => [k, String(v)])
      ).toString();
      return request('GET', `/listings/feed?${qs}`);
    },
    getById: (id: string) =>
      request('GET', `/listings/${id}`),
    create: (payload: any) =>
      request('POST', '/listings', payload),
    delete: (id: string) =>
      request('DELETE', `/listings/${id}`),
    bump: (id: string) =>
      request('POST', `/listings/${id}/bump`),
    favorite: (id: string) =>
      request('POST', `/listings/${id}/favorite`),
    unfavorite: (id: string) =>
      request('DELETE', `/listings/${id}/favorite`),
  },

  // Chat
  chat: {
    getRooms: () =>
      request('GET', '/chat/rooms'),
    createRoom: (listing_id: string, buyer_id: string, seller_id: string) =>
      request('POST', '/chat/room', { listing_id, buyer_id, seller_id }),
    getMessages: (room_id: string) =>
      request('GET', `/chat/messages/${room_id}`),
  },

  // Reviews
  reviews: {
    submit: (payload: { reviewer_id: string; reviewee_id: string; listing_id?: string; rating: number; comment?: string }) =>
      request('POST', '/reviews', payload),
    getForUser: (userId: string) =>
      request('GET', `/reviews/user/${userId}`),
    getTrending: () =>
      request('GET', '/reviews/trending'),
  },

  // Notifications
  notifications: {
    registerToken: (user_id: string, push_token: string) =>
      request('POST', '/notifications/register-token', { user_id, push_token }),
    getAll: () =>
      request('GET', '/notifications'),
    markRead: (id: string) =>
      request('PATCH', `/notifications/${id}/read`, {}),
    markAllRead: () =>
      request('PATCH', '/notifications/read-all', {}),
  },
};
