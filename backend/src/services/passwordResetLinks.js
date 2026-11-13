const { env } = require('../config/env');
const isSeller = user => (user.platform_role || user.role) === 'QORI_SELLER';
function passwordResetUrl(token, user = {}) {
  const path = isSeller(user) ? '/seller/#recuperar=' : '/empresa/?reset_token=';
  return new URL(path + encodeURIComponent(token), env.publicAppUrl).toString();
}
module.exports = { passwordResetUrl, isSeller };
