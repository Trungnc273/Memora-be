// auth.dto.js

/**
 * @typedef {Object} IAuthResponse
 * @property {string} token
 */

/**
 * @typedef {Object} ISignInRequest
 * @property {string} email
 * @property {string} username
 * @property {string} password_hash
 * @property {string} display_name
 * @property {string} role
 */

/**
 * @typedef {Object} ISignUpRequest
 * @property {string} email
 * @property {string} password
 * @property {string} [role] - optional
 */
