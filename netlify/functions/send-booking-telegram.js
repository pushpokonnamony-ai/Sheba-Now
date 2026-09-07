const TELEGRAM_API_BASE = 'https://api.telegram.org/bot';

function escapeTelegramText(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getGoogleMapsUrl(location) {
  if (!location || typeof location !== 'object') return '';

  const suppliedUrl = location.googleMapsUrl || location.mapUrl || location.mapsUrl;
  if (typeof suppliedUrl === 'string' && /^https?:\/\//i.test(suppliedUrl)) {
    return suppliedUrl;
  }

  const latitude = Number(location.latitude);
  const longitude = Number(location.longitude);
  if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
    return `https://www.google.com/maps?q=${latitude},${longitude}`;
  }

  if (location.fullAddress) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location.fullAddress)}`;
  }

  return '';
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ message: 'Method not allowed.' }) };
  }

  const botToken = "8937594572:AAHCV3WPPPXoNkdfzPlCzHy5AYcBdMcNh7s";
const chatId = "6394284813";
  if (!botToken || !chatId) {
    console.error('Telegram notification environment variables are missing.');
    return { statusCode: 500, body: JSON.stringify({ message: 'Telegram notification is not configured.' }) };
  }

  try {
    const booking = JSON.parse(event.body || '{}');
    const locationUrl = getGoogleMapsUrl(booking.location);
    const locationLabel = booking.location?.fullAddress
      ? `${escapeTelegramText(booking.location.fullAddress)}${locationUrl ? ` - <a href="${escapeTelegramText(locationUrl)}">View on Map</a>` : ''}`
      : locationUrl
        ? `<a href="${escapeTelegramText(locationUrl)}">View on Map</a>`
        : '';
    const text = [
      '📢 <b>নতুন বুকিং এসেছে</b>',
      '',
      `🆔 <b>অর্ডার আইডি:</b> ${escapeTelegramText(booking.orderId)}`,
      `🛠️ <b>সেবা:</b> ${escapeTelegramText(booking.service)}`,
      `👤 <b>নাম:</b> ${escapeTelegramText(booking.name)}`,
      `📞 <b>ফোন:</b> ${escapeTelegramText(booking.phone)}`,
      `📍 <b>ঠিকানা:</b> ${escapeTelegramText(booking.address)}`,
      `📝 <b>বিস্তারিত:</b> ${escapeTelegramText(booking.description)}`,
      `📅 <b>তারিখ:</b> ${escapeTelegramText(booking.date)}`,
      `📧 <b>ইমেইল:</b> ${escapeTelegramText(booking.email || 'দেওয়া হয়নি')}`,
      locationLabel
        ? `🗺️ <b>লোকেশন:</b> ${locationLabel}`
        : ''
    ].filter(Boolean).join('\n');

    const response = await fetch(`${TELEGRAM_API_BASE}${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML'
      })
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('Telegram API rejected booking notification:', errorBody);
      return { statusCode: 502, body: JSON.stringify({ message: 'Telegram notification failed.' }) };
    }

    console.log('Telegram booking notification sent successfully.');
    return { statusCode: 200, body: JSON.stringify({ sent: true }) };
  } catch (error) {
    console.error('Booking notification failed:', error);
    return { statusCode: 400, body: JSON.stringify({ message: 'Invalid booking notification request.' }) };
  }
};