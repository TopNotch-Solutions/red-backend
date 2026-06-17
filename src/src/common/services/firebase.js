const admin = require('firebase-admin')
const { getMessaging } = require('firebase-admin/messaging')
const serviceAccount = require('../../../erongored-firebase-adminsdk-fbsvc-7dd05187c7.json')

if (!admin.getApps().length) {
    admin.initializeApp({
        credential: admin.cert(serviceAccount)
    });
}

// firebase-admin v14 removed legacy namespace APIs (admin.messaging, etc.)
admin.messaging = getMessaging

module.exports = admin