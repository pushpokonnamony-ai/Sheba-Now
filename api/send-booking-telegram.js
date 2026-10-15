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

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed.' });
  }

  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    if (!botToken || !chatId) {
      const missingVariables = [
        !botToken && 'TELEGRAM_BOT_TOKEN',
        !chatId && 'TELEGRAM_CHAT_ID'
      ].filter(Boolean);
      console.error('Telegram notification environment variables are missing:', missingVariables);
      return res.status(500).json({
        error: 'Telegram notification is not configured.',
        details: `Set the following Vercel environment variable(s): ${missingVariables.join(', ')}.`
      });
    }

    const booking = req.body || {};
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

    let telegramResponse;
    let telegramResult;
    try {
      telegramResponse = await fetch(
        `https://api.telegram.org/bot${botToken}/sendMessage`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text,
            parse_mode: 'HTML'
          })
        }
      );
      const responseBody = await telegramResponse.text();
      try {
        telegramResult = JSON.parse(responseBody);
      } catch {
        telegramResult = { description: responseBody || 'Telegram returned an empty or invalid response.' };
      }
    } catch (error) {
      console.error('Telegram API request could not be completed:', error);
      return res.status(502).json({
        error: 'Could not reach the Telegram API.',
        details: error.message
      });
    }

    if (!telegramResponse.ok || telegramResult.ok !== true) {
      const details = telegramResult.description || 'Unknown Telegram API error.';
      console.error('Telegram API rejected booking notification:', {
        httpStatus: telegramResponse.status,
        errorCode: telegramResult.error_code || null,
        description: details
      });
      return res.status(502).json({
        error: 'Telegram API rejected the booking notification.',
        details,
        telegramErrorCode: telegramResult.error_code || null,
        telegramHttpStatus: telegramResponse.status
      });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Booking notification failed:', error);
    return res.status(400).json({ message: 'Invalid booking notification request.' });
  }
}
