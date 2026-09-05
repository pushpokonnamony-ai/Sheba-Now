const admin = require('firebase-admin');

function getFirebaseAdmin() {
  if (admin.apps.length) return admin;

  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: process.env.FIREBASE_DATABASE_URL || 'https://sheba-now-48771-default-rtdb.firebaseio.com'
  });
  return admin;
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ message: 'Method not allowed.' }) };
  }

  try {
    const { title, body, image, tokens } = JSON.parse(event.body || '{}');
    const cleanTokens = Array.isArray(tokens) ? [...new Set(tokens)].filter(Boolean) : [];

    if (!title || !body || !cleanTokens.length) {
      return { statusCode: 400, body: JSON.stringify({ message: 'Title, body, and FCM tokens are required.' }) };
    }

    const firebaseAdmin = getFirebaseAdmin();
    const messaging = firebaseAdmin.messaging();
    let successCount = 0;
    let failureCount = 0;

    for (let index = 0; index < cleanTokens.length; index += 500) {
      const batch = cleanTokens.slice(index, index + 500);
      const response = await messaging.sendEachForMulticast({
        tokens: batch,
        notification: {
          title,
          body,
          ...(image ? { image } : {})
        },
        data: {
          title: String(title),
          body: String(body),
          ...(image ? { image: String(image), offerImage: String(image) } : {}),
          clickUrl: '/index.html'
        },
        webpush: {
          notification: {
            title,
            body,
            icon: '/header-bg.jpg',
            ...(image ? { image } : {})
          },
          fcmOptions: { link: '/index.html' }
        }
      });

      successCount += response.successCount;
      failureCount += response.failureCount;
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ successCount, failureCount })
    };
  } catch (error) {
    console.error('Offer notification failed:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Notification service failed.' })
    };
  }
};
