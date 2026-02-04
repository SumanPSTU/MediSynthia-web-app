/**
 * Validates password strength
 * Requirements:
 * - Minimum 8 characters
 * 
 * @param {string} password - The password to validate
 * @returns {object} - { isValid: boolean, errors: array }
 */
export const validatePasswordStrength = (password) => {
  const errors = [];

  if (!password) {
    errors.push("Password is required");
    return { isValid: false, errors };
  }

  if (password.length < 8) {
    errors.push("Password must be at least 8 characters long");
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Check if password meets minimum requirements (simpler version)
 * @param {string} password
 * @returns {boolean}
 */
export const isValidPassword = (password) => {
  const { isValid } = validatePasswordStrength(password);
  return isValid;
};
