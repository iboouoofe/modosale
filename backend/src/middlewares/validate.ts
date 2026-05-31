import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';

// ─── Schemas ───────────────────────────────────────────────────────────────────

export const registerSchema = z.object({
  phone_number: z.string().min(10, 'Geçerli bir telefon numarası girin.'),
  display_name: z.string().min(2, 'İsim en az 2 karakter olmalıdır.').max(60),
  email: z.string().email('Geçerli bir e-posta adresi girin.').optional().or(z.literal('')),
  avatar_url: z.string().url().optional().or(z.literal('')),
  code: z.string().length(6, 'OTP kodu 6 haneli olmalıdır.').optional(),
});

export const listingCreateSchema = z.object({
  user_id: z.string().uuid('Geçersiz kullanıcı ID.'),
  title: z.string().min(3, 'Başlık en az 3 karakter olmalıdır.').max(120),
  description: z.string().max(2000).optional(),
  price: z.number().positive('Fiyat sıfırdan büyük olmalıdır.').max(10_000_000),
  currency: z.string().default('TL'),
  category: z.string().min(2).max(60),
  condition: z.enum(['new', 'good', 'fair']).optional(),
  city_district: z.string().min(2).max(120),
  longitude: z.number().min(-180).max(180),
  latitude: z.number().min(-90).max(90),
  show_phone: z.boolean().optional(),
  images: z.array(z.string()).max(8).optional(),
});

export const reviewSchema = z.object({
  reviewer_id: z.string().uuid(),
  reviewee_id: z.string().uuid(),
  listing_id: z.string().optional().nullable(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(500).optional().nullable(),
});

export const chatRoomSchema = z.object({
  listing_id: z.string().min(1),
  buyer_id: z.string().uuid(),
  seller_id: z.string().uuid(),
});

// ─── Middleware Factory ────────────────────────────────────────────────────────

export const validate = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const errors = (result.error as any).errors.map((e: any) => ({
        field: e.path.join('.'),
        message: e.message,
      }));
      res.status(422).json({
        success: false,
        error: 'Validasyon hatası.',
        details: errors,
      });
      return;
    }
    // Replace req.body with parsed (coerced) data
    req.body = result.data;
    next();
  };
};
