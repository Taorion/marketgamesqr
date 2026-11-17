const path = require('node:path');
const fs = require('node:fs/promises');
const sharp = require('sharp');
const QRCode = require('qrcode');
const { PDFDocument } = require('pdf-lib');
const { query } = require('../config/db');
const { env } = require('../config/env');
const { badRequest, notFound } = require('../utils/http');
const orders = require('./catalogOrderService');

const xml = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]));
function wrap(value, size = 29, max = 3) {
  const words = String(value).replace(/\s+/g, ' ').trim().split(' '), lines = [];
  for (const word of words) {
    if (!lines.length || (lines[lines.length - 1] + ' ' + word).length > size) lines.push(word);
    else lines[lines.length - 1] += ' ' + word;
  }
  return lines.slice(0, max).map((line, i) => (line.length > size ? line.slice(0, size - 1) + '…' : line) + (i === max - 1 && lines.length > max ? '…' : ''));
}
async function shareInfo(user, id) {
  const c = await orders.catalog({ query }, id);
  if (c.business_id !== user.business_id) throw notFound('Vitrina no encontrada.');
  const s = await orders.settings({ query }, id);
  if (!orders.canReceive(c) || !s?.config.enabled) throw badRequest('Publica la vitrina y habilita sus domicilios antes de generar el volante y el QR.');
  const products = await orders.products({ query }, c);
  if (!products.some(p => p.currency === 'COP' && p.price !== null && (!p.order_variants.length || p.order_variants.some(v => v.available)))) throw badRequest('Añade al menos un producto disponible con precio en COP antes de compartir.');
  const publicPath = '/c/' + encodeURIComponent(c.slug);
  const url = new URL(publicPath, env.publicAppUrl).href;
  const image = await QRCode.toDataURL(url, { width: 640, margin: 4, errorCorrectionLevel: 'M', color: { dark: '#102b49', light: '#ffffff' } });
  return { path: publicPath, url, image, title: c.title, brand_name: c.brand_name || c.business.name, receiving: require('./catalogOrderRules').receiving(s.config), paused: s.config.paused, slug: c.slug, local_only: ['localhost', '127.0.0.1', '[::1]'].includes(new URL(url).hostname) };
}
async function flyer(user, id, format = 'png') {
  if (!['png', 'pdf'].includes(format)) throw badRequest('Elige imagen PNG o PDF.');
  const data = await shareInfo(user, id);
  const brand = wrap(data.brand_name || data.title, 28, 2);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1528" viewBox="0 0 1080 1528">
    <rect width="1080" height="1528" fill="#f5f8fc"/>
    <rect x="32" y="32" width="1016" height="1464" rx="48" fill="white"/>
    <path d="M80 32H1000Q1048 32 1048 80V565H32V80Q32 32 80 32" fill="#102b49"/>
    <circle cx="1010" cy="65" r="230" fill="#173b60"/><circle cx="1040" cy="65" r="140" fill="#1c476e"/>
    <g font-family="Arial, sans-serif">
      <rect x="82" y="85" width="356" height="48" rx="24" fill="#dff6ee"/>
      <text x="106" y="118" font-size="23" font-weight="700" fill="#17664d">AHORA PEDIR ES MÁS FÁCIL</text>
      ${brand.map((line, i) => `<text x="82" y="${207 + i * 53}" font-size="45" font-weight="700" fill="#ffffff">${xml(line)}</text>`).join('')}
      <text x="82" y="365" font-size="78" font-weight="700" fill="#ffffff">Tu domicilio,</text>
      <text x="82" y="451" font-size="78" font-weight="700" fill="#75dbf0">desde el celular.</text>
      <text x="82" y="512" font-size="27" fill="#dbe7f5">Nuestra vitrina está a un escaneo de distancia.</text>
      <rect x="290" y="601" width="500" height="500" rx="32" fill="#ffffff" stroke="#dce5ef" stroke-width="3"/>
      <text x="540" y="1163" text-anchor="middle" font-size="39" font-weight="700" fill="#102b49">Escanea y haz tu pedido</text>
      <g font-size="24" fill="#445970" text-anchor="middle">
        <text x="207" y="1227">1. Abre la cámara</text><text x="540" y="1227">2. Elige productos</text><text x="873" y="1227">3. Pide tu domicilio</text>
      </g>
      <text x="540" y="1280" text-anchor="middle" font-size="24" fill="#445970">Sin crear una cuenta. Recibe un enlace para seguir tu pedido.</text>
      <line x1="82" x2="998" y1="1320" y2="1320" stroke="#dce5ef" stroke-width="2"/>
      <text x="82" y="1372" font-size="24" fill="#102b49">El establecimiento confirma disponibilidad, cobertura y entrega.</text>
      <text x="82" y="1412" font-size="22" fill="#62758a">Preparamos, entregamos y cobramos directamente tu pedido.</text>
      <text x="82" y="1460" font-size="20" fill="#62758a">${data.local_only ? 'VISTA PREVIA LOCAL · QR de prueba para este equipo' : 'Vitrina y pedidos con Qori'}</text>
    </g>
  </svg>`;
  const qr = await sharp(Buffer.from(data.image.split(',')[1], 'base64')).resize(452, 452, { kernel: 'nearest' }).png().toBuffer();
  const logo = await sharp(await fs.readFile(path.join(__dirname, '../../../img/qori-logo.png'))).trim().resize({ width: 124, height: 48, fit: 'inside' }).png().toBuffer();
  const png = await sharp(Buffer.from(svg)).composite([{ input: qr, top: 625, left: 314 }, { input: logo, top: 1425, left: 865 }]).png().toBuffer();
  let bytes = png, mime = 'image/png';
  if (format === 'pdf') {
    const pdf = await PDFDocument.create();
    pdf.setTitle('Pide a domicilio · ' + data.title); pdf.setAuthor('Qori');
    const page = pdf.addPage([419.528, 595.276]); // A5, 148 × 210 mm.
    page.drawImage(await pdf.embedPng(png), { x: 0, y: 0, width: page.getWidth(), height: page.getHeight() });
    bytes = Buffer.from(await pdf.save()); mime = 'application/pdf';
  }
  return { filename: 'domicilios-' + data.slug + '.' + format, data_url: 'data:' + mime + ';base64,' + bytes.toString('base64'), url: data.url };
}
module.exports = { shareInfo, flyer };
