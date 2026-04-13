/**
 * Vercel: /api/wait-list/* via rewrite (same pattern as raffles-proxy).
 */
const app = require('../server');

module.exports = (req, res) => {
  const path = req.query && req.query.path ? '/' + req.query.path : '';
  const q = (req.url || '').includes('?') ? '?' + (req.url || '').split('?').slice(1).join('?') : '';
  req.url = '/api/wait-list' + path + q;
  return app(req, res);
};
