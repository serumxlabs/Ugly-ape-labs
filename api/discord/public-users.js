const app = require('../../server');

/** Vercel: explicit route — nested api/discord/* wins over api/[[...path]].js, so public-users was 404. */
module.exports = (req, res) => {
  const q = (req.url || '').includes('?') ? '?' + (req.url || '').split('?').slice(1).join('?') : '';
  req.url = '/api/discord/public-users' + q;
  return app(req, res);
};
