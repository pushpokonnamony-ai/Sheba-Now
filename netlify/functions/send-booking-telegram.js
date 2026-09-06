const TELEGRAM_API_BASE = 'https://api.telegram.org/bot';

function escapeTelegramText(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ message: 'Method not allowed.' }) };
  }

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!botToken || !chatId) {
    console.error('Telegram notification environment variables are missing.');
    return { statusCode: 500, body: JSON.stringify({ message: 'Telegram notification is not configured.' }) };
  }

  try {
    const booking = JSON.parse(event.body || '{}');
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
      booking.location?.fullAddress
        ? `🗺️ <b>লোকেশন:</b> ${escapeTelegramText(booking.location.fullAddress)}`
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

    return { statusCode: 200, body: JSON.stringify({ sent: true }) };
  } catch (error) {
    console.error('Booking notification failed:', error);
    return { statusCode: 400, body: JSON.stringify({ message: 'Invalid booking notification request.' }) };
  }
};