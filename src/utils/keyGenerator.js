const { v4: uuidv4 } = require('uuid');

/**
 * Generate a random key random key
 * Example: "JnX84BQ1aP9mK2xL7vR3"
 */
function generateKey(length = 22) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Generate multiple keys
 */
function generateKeys(count = 1) {
  const keys = [];
  for (let i = 0; i < count; i++) {
    keys.push(generateKey());
  }
  return keys;
}

module.exports = { generateKey, generateKeys };
