/**
 * Input Sanitization Utilities
 * Provides functions to sanitize and validate user inputs
 */

/**
 * Validates email format
 * @param {string} email
 * @returns {boolean}
 */
export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Sanitizes email by trimming and converting to lowercase
 * @param {string} email
 * @returns {string}
 */
export const sanitizeEmail = (email) => {
  if (!email) return "";
  return email.trim().toLowerCase();
};

/**
 * Validates username (allows any characters, minimum 2 chars)
 * @param {string} username
 * @returns {boolean}
 */
export const isValidUsername = (username) => {
  if (!username) return false;
  return username.trim().length >= 2;
};

/**
 * Sanitizes username by trimming whitespace
 * @param {string} username
 * @returns {string}
 */
export const sanitizeUsername = (username) => {
  if (!username) return "";
  return username.trim();
};

/**
 * Removes potentially dangerous characters from strings
 * @param {string} input
 * @returns {string}
 */
export const sanitizeString = (input) => {
  if (!input) return "";
  return input
    .trim()
    .replace(/[<>\"'`]/g, "") // Remove HTML/script tags
    .slice(0, 255); // Limit length
};

/**
 * Validates phone number (basic validation for international format)
 * @param {string} phone
 * @returns {boolean}
 */
export const isValidPhone = (phone) => {
  const phoneRegex = /^[\d\s\-\+\(\)]{7,20}$/;
  return phoneRegex.test(phone);
};

/**
 * Sanitizes phone number by removing unwanted characters
 * @param {string} phone
 * @returns {string}
 */
export const sanitizePhone = (phone) => {
  if (!phone) return "";
  return phone.trim().replace(/[^\d\s\-\+\(\)]/g, "");
};

/**
 * Comprehensive input validation object
 */
export const validateInput = {
  email: (email) => {
    const sanitized = sanitizeEmail(email);
    return isValidEmail(sanitized);
  },
  username: (username) => {
    const sanitized = sanitizeUsername(username);
    return isValidUsername(sanitized);
  },
  phone: (phone) => {
    const sanitized = sanitizePhone(phone);
    return isValidPhone(sanitized);
  }
};

/**
 * Comprehensive input sanitization object
 */
export const sanitizeInput = {
  email: sanitizeEmail,
  username: sanitizeUsername,
  phone: sanitizePhone,
  string: sanitizeString
};
