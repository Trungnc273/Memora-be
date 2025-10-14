const TStatus = {
  ok: "OK",
  error: "ERROR",
};

/**
 * @template T
 * @typedef {Object} IResponse
 * @property {'OK' | 'ERROR'} status
 * @property {string} [message]
 * @property {T} [data]
 */

module.exports = {
  TStatus,
};
