const admin = require('firebase-admin')
const serviceAccount = require('../../../erongored-firebase-adminsdk-fbsvc-7dd05187c7.json')

if (!admin.getApps().length) {
    admin.initializeApp({
        credential: admin.cert(serviceAccount)
    });
}

module.exports = admin