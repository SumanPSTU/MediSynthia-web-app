/**
 * Rate Limiting Middleware
 * Prevents brute force attacks on sensitive endpoints
 */

const rateLimitStore = {};

/**
 * Simple rate limiter middleware
 * @param {number} maxAttempts - Maximum attempts allowed
 * @param {number} windowMs - Time window in milliseconds
 * @returns {function} Express middleware
 */
export const createRateLimiter = (maxAttempts = 5, windowMs = 15 * 60 * 1000) => {
  return (req, res, next) => {
    const key = req.ip || req.connection.remoteAddress;
    const now = Date.now();

    // Initialize or get existing rate limit data
    if (!rateLimitStore[key]) {
      rateLimitStore[key] = {
        attempts: 0,
        resetTime: now + windowMs
      };
    }

    const userData = rateLimitStore[key];

    // Reset if window has passed
    if (now > userData.resetTime) {
      userData.attempts = 0;
      userData.resetTime = now + windowMs;
    }

    // Increment attempts
    userData.attempts++;

    // Set rate limit headers
    res.set('X-RateLimit-Limit', maxAttempts);
    res.set('X-RateLimit-Remaining', Math.max(0, maxAttempts - userData.attempts));
    res.set('X-RateLimit-Reset', userData.resetTime);

    // Check if limit exceeded
    if (userData.attempts > maxAttempts) {
      const retryAfter = Math.ceil((userData.resetTime - now) / 1000);
      return res.status(429).json({
        success: false,
        message: `Too many attempts. Please try again after ${retryAfter} seconds.`,
        retryAfter
      });
    }

    next();
  };
};

/**
 * Email-based rate limiter (for email verification endpoints)
 * @param {number} maxAttempts - Maximum attempts allowed
 * @param {number} windowMs - Time window in milliseconds
 * @returns {function} Express middleware
 */
export const createEmailRateLimiter = (maxAttempts = 3, windowMs = 60 * 60 * 1000) => {
  return (req, res, next) => {
    const email = req.params.email || req.body.email;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required for rate limiting"
      });
    }

    const key = `email:${email.toLowerCase()}`;
    const now = Date.now();

    // Initialize or get existing rate limit data
    if (!rateLimitStore[key]) {
      rateLimitStore[key] = {
        attempts: 0,
        resetTime: now + windowMs
      };
    }

    const userData = rateLimitStore[key];

    // Reset if window has passed
    if (now > userData.resetTime) {
      userData.attempts = 0;
      userData.resetTime = now + windowMs;
    }

    // Increment attempts
    userData.attempts++;

    // Set rate limit headers
    res.set('X-RateLimit-Limit', maxAttempts);
    res.set('X-RateLimit-Remaining', Math.max(0, maxAttempts - userData.attempts));
    res.set('X-RateLimit-Reset', userData.resetTime);

    // Check if limit exceeded
    if (userData.attempts > maxAttempts) {
      const retryAfter = Math.ceil((userData.resetTime - now) / 1000);
      return res.status(429).json({
        success: false,
        message: `Too many attempts for this email. Please try again after ${retryAfter} seconds.`,
        retryAfter
      });
    }

    next();
  };
};

/**
 * Resend verification email rate limiter (allows resend after 2 minutes)
 * @returns {function} Express middleware
 */
export const createResendVerificationLimiter = () => {
  return (req, res, next) => {
    const email = req.params.email || req.body.email;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required for rate limiting"
      });
    }

    const key = `resend:${email.toLowerCase()}`;
    const now = Date.now();
    const windowMs = 2 * 60 * 1000; // 2 minutes

    // Initialize or get existing rate limit data
    if (!rateLimitStore[key]) {
      rateLimitStore[key] = {
        lastAttempt: now,
        resetTime: now + windowMs
      };
    }

    const userData = rateLimitStore[key];

    // Reset if window has passed
    if (now > userData.resetTime) {
      userData.lastAttempt = now;
      userData.resetTime = now + windowMs;
    } else if (now - userData.lastAttempt < windowMs) {
      // User tried too soon
      const retryAfter = Math.ceil((userData.resetTime - now) / 1000);
      return res.status(429).json({
        success: false,
        message: `Please wait before resending verification email. Try again after ${retryAfter} seconds.`,
        retryAfter
      });
    }

    userData.lastAttempt = now;
    next();
  };
};

/**
 * Cleanup old entries to prevent memory leaks (run periodically)
 */
export const cleanupRateLimitStore = () => {
  const now = Date.now();
  for (const key in rateLimitStore) {
    if (rateLimitStore[key].resetTime < now) {
      delete rateLimitStore[key];
    }
  }
};

// Run cleanup every 10 minutes
setInterval(cleanupRateLimitStore, 10 * 60 * 1000);
