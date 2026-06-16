const nodemailer = require('nodemailer');
require('dotenv').config()

exports.transporter = nodemailer.createTransport({
    host: process.env.SERVER,
    port: process.env.EMAIL_PORT,
    secure: false,
    requireTLS: true,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    },
    tls: {
        ciphers: 'SSLv3',
        rejectUnauthorized: false
    },
});

// exports.transporter = nodemailer.createTransport({
//     service: 'gmail',
//     auth: {
//         user: process.env.EMAIL_USER2,
//         pass: process.env.EMAIL_PASSWORD2
//     }
// })
