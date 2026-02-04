import { TokenBlacklist } from '../models/tokenBlacklistModel.js';
import jwt from 'jsonwebtoken';

/**
 * Add token to blacklist
 * @param {string} token - The token to blacklist
 * @param {string} type - 'access' or 'refresh'
 * @param {string} userId - Optional user ID
 * @param {string} adminId - Optional admin ID
 */
export const blacklistToken = async (token, type = 'access', userId = null, adminId = null) => {
  try {
    if (!token) return false;

    try {
      // Decode token to get expiration
      const SECRET_KEY = type === 'refresh' 
        ? process.env.REFRESH_SECRET_KEY || process.env.SECRET_KEY 
        : process.env.SECRET_KEY;

      const decoded = jwt.decode(token);
      if (!decoded || !decoded.exp) {
        return false;
      }

      // Convert exp timestamp to Date
      const expiresAt = new Date(decoded.exp * 1000);

      // Add to blacklist
      await TokenBlacklist.create({
        token,
        userId,
        adminId,
        expiresAt
      });

      return true;
    } catch (error) {
      console.error('Error decoding token for blacklist:', error);
      return false;
    }
  } catch (error) {
    console.error('Error blacklisting token:', error);
    return false;
  }
};

/**
 * Check if token is blacklisted
 * @param {string} token - The token to check
 * @returns {boolean}
 */
export const isTokenBlacklisted = async (token) => {
  try {
    if (!token) return false;

    const blacklistedToken = await TokenBlacklist.findOne({ token });
    return !!blacklistedToken;
  } catch (error) {
    console.error('Error checking blacklist:', error);
    return false;
  }
};

/**
 * Blacklist all tokens for a user (logout)
 * @param {string} userId - User ID
 */
export const blacklistUserTokens = async (userId) => {
  try {
    if (!userId) return false;

    // In a real scenario, you'd need to track issued tokens
    // For now, this is a placeholder for future implementation
    return true;
  } catch (error) {
    console.error('Error blacklisting user tokens:', error);
    return false;
  }
};

/**
 * Blacklist all tokens for an admin (logout)
 * @param {string} adminId - Admin ID
 */
export const blacklistAdminTokens = async (adminId) => {
  try {
    if (!adminId) return false;

    // In a real scenario, you'd need to track issued tokens
    // For now, this is a placeholder for future implementation
    return true;
  } catch (error) {
    console.error('Error blacklisting admin tokens:', error);
    return false;
  }
};

/**
 * Clean up expired blacklist entries
 */
export const cleanupBlacklist = async () => {
  try {
    const now = new Date();
    const result = await TokenBlacklist.deleteMany({
      expiresAt: { $lt: now }
    });
    (`Cleaned up ${result.deletedCount} expired tokens from blacklist`);
  } catch (error) {
    console.error('Error cleaning up blacklist:', error);
  }
};
