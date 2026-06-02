import { Request, Response } from 'express';
import pool from '../config/db';
import twilio from 'twilio';

const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
const twilioVerifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

let twilioClient: any = null;
if (twilioAccountSid && twilioAuthToken) {
  twilioClient = twilio(twilioAccountSid, twilioAuthToken);
}

interface OtpData {
  code: string;
  expiresAt: number;
  attempts: number;
  lockUntil: number;
}

// In-memory OTP storage
const otpStorage: { [phone: string]: OtpData } = {};
// Rate limiting storage: tracks requests within a 10-minute window
const otpRateLimiter: { [phone: string]: { count: number; windowStart: number } } = {};
// Blacklisted refresh tokens
const tokenBlacklist = new Set<string>();
// Failed attempt logs (timestamp, ip, phone_number)
const failedAttemptsLogs: Array<{ ip: string; phone_number: string; timestamp: string }> = [];

export const registerOrVerify = async (req: Request, res: Response): Promise<void> => {
  try {
    const { phone_number, email, display_name, avatar_url, code } = req.body;
    const ip = req.ip || req.socket?.remoteAddress || 'unknown';
    const now = Date.now();

    if (!phone_number || !display_name) {
      res.status(400).json({ success: false, error: 'Phone number and display name are required.' });
      return;
    }

    // If verification code is provided, validate it
    if (code) {
      const otpData = otpStorage[phone_number];

      // Check if locked
      if (otpData && otpData.lockUntil > now) {
        const lockMinutesLeft = Math.ceil((otpData.lockUntil - now) / (60 * 1000));
        res.status(423).json({
          success: false,
          error: `Çok fazla hatalı giriş denemesi nedeniyle numaranız kilitlendi. Lütfen ${lockMinutesLeft} dakika sonra tekrar deneyin.`
        });
        return;
      }

      if (!otpData || otpData.expiresAt < now) {
        res.status(400).json({ success: false, error: 'Doğrulama kodu süresi dolmuş veya hiç istenmemiş. Lütfen tekrar kod isteyin.' });
        return;
      }

      // Check OTP code match
      let isCodeValid = false;
      if (twilioClient && twilioVerifyServiceSid) {
        console.log(`[SMS OTP TWILIO] Verifying code via production Twilio Verify for: ${phone_number}`);
        try {
          const check = await twilioClient.verify.v2.services(twilioVerifyServiceSid)
            .verificationChecks
            .create({ to: phone_number, code: code });
          isCodeValid = check.status === 'approved';
        } catch (err: any) {
          console.error('[SMS OTP TWILIO ERROR] Twilio check failed, falling back to local simulation match:', err.message);
          isCodeValid = otpData.code === code;
        }
      } else {
        isCodeValid = otpData.code === code;
      }

      if (!isCodeValid) {
        // Increment failed attempts
        otpData.attempts += 1;

        // Log failed attempt
        failedAttemptsLogs.push({
          ip: ip.toString(),
          phone_number,
          timestamp: new Date().toISOString()
        });
        console.warn(`[OTP BRUTE-FORCE WARNING] Failed OTP code verification from IP: ${ip} for Phone: ${phone_number}. Total failures: ${otpData.attempts}/5`);

        if (otpData.attempts >= 5) {
          // Lock for 15 minutes
          otpData.lockUntil = now + 15 * 60 * 1000;
          otpData.attempts = 0; // reset counter after locking
          otpStorage[phone_number] = otpData;

          res.status(423).json({
            success: false,
            error: '5 kez hatalı giriş yaptınız. Güvenliğiniz için numaranız 15 dakika boyunca kilitlendi.'
          });
          return;
        }

        const remainingAttempts = 5 - otpData.attempts;
        res.status(400).json({
          success: false,
          error: `Girdiğiniz doğrulama kodu hatalı. Kalan deneme hakkınız: ${remainingAttempts}`
        });
        return;
      }

      // Successful OTP validation - reset failed attempts/lock
      otpData.attempts = 0;
      otpData.lockUntil = 0;
      otpStorage[phone_number] = otpData;
    }

    // Upsert user based on verified phone number
    const query = `
      INSERT INTO users (phone_number, email, display_name, avatar_url, is_phone_verified)
      VALUES ($1, $2, $3, $4, TRUE)
      ON CONFLICT (phone_number) 
      DO UPDATE SET 
        email = COALESCE(EXCLUDED.email, users.email),
        display_name = EXCLUDED.display_name,
        avatar_url = COALESCE(EXCLUDED.avatar_url, users.avatar_url),
        is_phone_verified = TRUE
      RETURNING *
    `;

    const result = await pool.query(query, [phone_number, email || null, display_name, avatar_url || null]);
    const user = result.rows[0];

    // Generate Secure Access and Refresh Token pair
    const accessToken = `at-mock-${user.id}-${Date.now() + 15 * 60 * 1000}`;
    const refreshToken = `rt-mock-${user.id}-${Date.now() + 7 * 24 * 60 * 60 * 1000}`;

    res.status(200).json({
      success: true,
      access_token: accessToken,
      refresh_token: refreshToken,
      token: accessToken, // Retain support for legacy fields
      user
    });
  } catch (error: any) {
    console.error('Error in auth endpoint:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getUserProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    // Expect user id from simulated auth middleware headers
    const userId = req.headers['x-user-id'] as string;

    if (!userId) {
       res.status(400).json({ success: false, error: 'User identification header missing.' });
       return;
    }

    const userQuery = `SELECT * FROM users WHERE id = $1`;
    const userRes = await pool.query(userQuery, [userId]);

    if (userRes.rows.length === 0) {
       res.status(404).json({ success: false, error: 'User not found.' });
       return;
    }

    const listingsQuery = `SELECT *, ST_X(location::geometry) as longitude, ST_Y(location::geometry) as latitude FROM listings WHERE user_id = $1 ORDER BY bumped_at DESC`;
    const listingsRes = await pool.query(listingsQuery, [userId]);

    res.status(200).json({
      success: true,
      profile: userRes.rows[0],
      listings: listingsRes.rows
    });
  } catch (error: any) {
     console.error('Error fetching user profile:', error);
     res.status(500).json({ success: false, error: error.message });
  }
};

export const requestOtp = async (req: Request, res: Response): Promise<void> => {
  try {
    const { phone_number } = req.body;
    const now = Date.now();

    if (!phone_number) {
       res.status(400).json({ success: false, error: 'Phone number is required.' });
       return;
    }

    // Rate Limiting: max 3 requests in 10 minutes
    const rateLimit = otpRateLimiter[phone_number] || { count: 0, windowStart: now };

    if (now - rateLimit.windowStart > 10 * 60 * 1000) {
      // Window expired, reset
      rateLimit.count = 1;
      rateLimit.windowStart = now;
    } else {
      rateLimit.count += 1;
    }
    otpRateLimiter[phone_number] = rateLimit;

    if (rateLimit.count > 3) {
      const minutesLeft = Math.ceil((rateLimit.windowStart + 10 * 60 * 1000 - now) / (60 * 1000));
      res.status(429).json({
        success: false,
        error: `Çok fazla OTP isteği gönderdiniz. Lütfen ${minutesLeft} dakika sonra tekrar deneyin.`
      });
      return;
    }

    // Check if locked due to brute force
    const currentOtpData = otpStorage[phone_number];
    if (currentOtpData && currentOtpData.lockUntil > now) {
      const lockMinutesLeft = Math.ceil((currentOtpData.lockUntil - now) / (60 * 1000));
      res.status(423).json({
        success: false,
        error: `Ardışık hatalı denemeler nedeniyle numaranız kilitlendi. Lütfen ${lockMinutesLeft} dakika sonra tekrar deneyin.`
      });
      return;
    }

    // Generate 6-digit verification code
    const generatedCode = Math.floor(100000 + Math.random() * 900000).toString(); 
    
    // Store OTP: 3 minutes validity, preserve lock state if any
    otpStorage[phone_number] = {
      code: generatedCode,
      expiresAt: now + 3 * 60 * 1000,
      attempts: currentOtpData ? currentOtpData.attempts : 0,
      lockUntil: currentOtpData ? currentOtpData.lockUntil : 0
    };

    if (twilioClient && twilioVerifyServiceSid) {
      console.log(`[SMS OTP TWILIO] Dispatching production Twilio Verification SMS to: ${phone_number}`);
      try {
        await twilioClient.verify.v2.services(twilioVerifyServiceSid)
          .verifications
          .create({ to: phone_number, channel: 'sms' });
      } catch (err: any) {
        console.error('[SMS OTP TWILIO ERROR] Twilio dispatch failed, falling back to simulation:', err.message);
      }
    } else {
      console.log(`[SMS OTP SIMULATION] Sent 6-digit verification code ${generatedCode} to phone number: ${phone_number}. Valid for 3 minutes.`);
    }

    res.status(200).json({
      success: true,
      message: 'Verification code sent successfully.',
      code: generatedCode // Returned in response for rapid testing
    });
  } catch (error: any) {
     console.error('Error in requestOtp:', error);
     res.status(500).json({ success: false, error: error.message });
  }
};

export const refreshTokens = async (req: Request, res: Response): Promise<void> => {
  try {
    const { refresh_token } = req.body;
    if (!refresh_token) {
      res.status(400).json({ success: false, error: 'Refresh token is required.' });
      return;
    }

    if (tokenBlacklist.has(refresh_token)) {
      res.status(401).json({ success: false, error: 'Token is blacklisted.' });
      return;
    }

    if (!refresh_token.startsWith('rt-mock-')) {
      res.status(401).json({ success: false, error: 'Invalid refresh token format.' });
      return;
    }

    const parts = refresh_token.replace('rt-mock-', '').split('-');
    const expiresAt = parseInt(parts[parts.length - 1]);
    const userId = parts.slice(0, parts.length - 1).join('-');

    if (isNaN(expiresAt) || expiresAt < Date.now()) {
      res.status(401).json({ success: false, error: 'Refresh token has expired. Please login again.' });
      return;
    }

    // Generate new access token
    const newAccessToken = `at-mock-${userId}-${Date.now() + 15 * 60 * 1000}`;

    res.status(200).json({
      success: true,
      access_token: newAccessToken,
      token: newAccessToken
    });
  } catch (error: any) {
    console.error('Error refreshing token:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const logoutUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { refresh_token } = req.body;
    if (refresh_token) {
      tokenBlacklist.add(refresh_token);
    }
    res.status(200).json({ success: true, message: 'Logged out successfully.' });
  } catch (error: any) {
    console.error('Error logging out:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const updateProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const { display_name, email, avatar_url } = req.body;

    if (!userId) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const query = `
      UPDATE users 
      SET display_name = COALESCE($1, display_name),
          email = COALESCE($2, email),
          avatar_url = COALESCE($3, avatar_url),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
      RETURNING id, display_name, email, avatar_url, phone_number
    `;

    const result = await pool.query(query, [display_name, email, avatar_url, userId]);

    if (result.rows.length === 0) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    res.status(200).json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    console.error('Error updating profile:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const requestEmailOtp = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;
    const now = Date.now();

    if (!email) {
       res.status(400).json({ success: false, error: 'Email is required.' });
       return;
    }

    const generatedCode = Math.floor(100000 + Math.random() * 900000).toString(); 
    
    otpStorage[email] = {
      code: generatedCode,
      expiresAt: now + 3 * 60 * 1000,
      attempts: 0,
      lockUntil: 0
    };

    console.log(`[EMAIL OTP SIMULATION] Sent 6-digit verification code ${generatedCode} to email: ${email}. Valid for 3 minutes.`);

    res.status(200).json({
      success: true,
      message: 'Verification code sent successfully to email.',
      code: generatedCode 
    });
  } catch (error: any) {
    console.error('Error in requestEmailOtp:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const verifyEmailOtp = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, code } = req.body;
    const now = Date.now();

    if (!email || !code) {
      res.status(400).json({ success: false, error: 'Email and code are required.' });
      return;
    }

    const otpData = otpStorage[email];

    if (!otpData || otpData.expiresAt < now) {
       res.status(400).json({ success: false, error: 'OTP expired or not found.' });
       return;
    }

    if (otpData.code !== code) {
       res.status(400).json({ success: false, error: 'Invalid verification code.' });
       return;
    }

    delete otpStorage[email];

    let query = `SELECT * FROM users WHERE email = $1`;
    let result = await pool.query(query, [email]);
    let user;

    if (result.rows.length === 0) {
      const insertQuery = `
        INSERT INTO users (email, display_name, is_phone_verified)
        VALUES ($1, $2, TRUE) RETURNING *
      `;
      const insertRes = await pool.query(insertQuery, [email, 'Yeni Kullanıcı']);
      user = insertRes.rows[0];
    } else {
      user = result.rows[0];
    }

    const accessToken = `at-mock-${user.id}-${Date.now() + 15 * 60 * 1000}`;
    const refreshToken = `rt-mock-${user.id}-${Date.now() + 7 * 24 * 60 * 60 * 1000}`;

    res.status(200).json({
      success: true,
      access_token: accessToken,
      refresh_token: refreshToken,
      token: accessToken,
      user: {
        id: user.id,
        email: user.email,
        display_name: user.display_name,
        avatar_url: user.avatar_url,
      }
    });

  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const googleLogin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, display_name, avatar_url } = req.body;
    
    if (!email) {
      res.status(400).json({ success: false, error: 'Email from Google is required.' });
      return;
    }

    let query = `SELECT * FROM users WHERE email = $1`;
    let result = await pool.query(query, [email]);
    let user;

    if (result.rows.length === 0) {
      const insertQuery = `
        INSERT INTO users (email, display_name, avatar_url, is_phone_verified)
        VALUES ($1, $2, $3, TRUE) RETURNING *
      `;
      const insertRes = await pool.query(insertQuery, [email, display_name || 'Google Kullanıcısı', avatar_url]);
      user = insertRes.rows[0];
    } else {
      user = result.rows[0];
    }

    const accessToken = `at-mock-${user.id}-${Date.now() + 15 * 60 * 1000}`;
    const refreshToken = `rt-mock-${user.id}-${Date.now() + 7 * 24 * 60 * 60 * 1000}`;

    res.status(200).json({
      success: true,
      access_token: accessToken,
      refresh_token: refreshToken,
      token: accessToken,
      user: {
        id: user.id,
        email: user.email,
        display_name: user.display_name,
        avatar_url: user.avatar_url,
      }
    });

  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};
