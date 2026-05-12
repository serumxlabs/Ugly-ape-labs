const app = require('../../server');

/** Vercel: GET /api/wallets — list linked wallets (folder has link/unlink; index serves exact /api/wallets). */
module.exports = (req, res) => {
  const q = (req.url || '').includes('?') ? '?' + (req.url || '').split('?').slice(1).join('?') : '';
  req.url = '/api/wallets' + q;
  return app(req, res);
};
