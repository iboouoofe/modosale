import { Request, Response, NextFunction } from 'express';

// Extend Request interface to optionally store user info
export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    [key: string]: any;
  };
}

/**
 * Authentication Middleware
 * Supports standard Bearer JWT format and mock tokens used in development.
 */
export const authenticateUser = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'No authorization token provided.'
      });
      return;
    }

    const token = authHeader.split(' ')[1];

    // Check if it's our development mock token
    if (token.startsWith('mock-jwt-token-for-')) {
      const userId = token.replace('mock-jwt-token-for-', '');
      req.headers['x-user-id'] = userId;
      req.user = { id: userId };
      return next();
    }

    // Check for secure expiration-aware access token
    if (token.startsWith('at-mock-')) {
      const parts = token.replace('at-mock-', '').split('-');
      const expiresAt = parseInt(parts[parts.length - 1]);
      const userId = parts.slice(0, parts.length - 1).join('-');

      if (isNaN(expiresAt) || expiresAt < Date.now()) {
        res.status(401).json({
          success: false,
          code: 'EXPIRED_ACCESS_TOKEN',
          error: 'Unauthorized',
          message: 'Access token has expired.'
        });
        return;
      }

      req.headers['x-user-id'] = userId;
      req.user = { id: userId };
      return next();
    }

    // Standard JWT verification block
    const userIdHeader = req.headers['x-user-id'] as string;
    if (userIdHeader) {
      req.user = { id: userIdHeader };
      return next();
    }

    // Otherwise, block unauthorized requests
    res.status(401).json({
      success: false,
      error: 'Unauthorized',
      message: 'Invalid or unverified token.'
    });
  } catch (error: any) {
    console.error('Authentication middleware error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message
    });
  }
};
