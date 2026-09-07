const TELEGRAM_BOT_TOKEN = '8937594572:AAHCV3WPPPXoNkdfzPlCzHy5AYcBdMcNh7s';
const TELEGRAM_CHAT_ID = '6394284813';

function escapeTelegramText(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed.' });
  }

  try {
    const booking = req.body || {};
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

    const telegramResponse = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHAT_ID,
          text,
          parse_mode: 'HTML'
        })
      }
    );

    if (!telegramResponse.ok) {
      const errorBody = await telegramResponse.text();
      console.error('Telegram API rejected booking notification:', errorBody);
      return res.status(502).json({ message: 'Telegram notification failed.' });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Booking notification failed:', error);
    return res.status(400).json({ message: 'Invalid booking notification request.' });
  }
}
