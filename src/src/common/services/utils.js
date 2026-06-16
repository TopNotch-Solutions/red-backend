const ConversationsModel = require('../../common/models/conversationsModel');
const sequelize = require('../../config/db');
const { Op } = require('sequelize')

exports.isEmpty = (value) => {
    return value === undefined || value === null || (typeof value === 'string' && value.trim() === '') || (typeof value === 'number' && isNaN(value));
};

exports.CapitalizeFirstLetter = (str) => {
    if (typeof str !== 'string') {
        return str;
    }
    return str.charAt(0).toUpperCase() + str.slice(1);
};

exports.isValidPassword = (password) => {
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/
    return passwordRegex.test(password)
}

exports.isValidPin = (value) => {
    const regex = /^\d{4}$/
    return regex.test(value)
}

exports.isNumber = (value) => {
    return !isNaN(value) && Number.isFinite(Number(value))
}

exports.generateReference = (length = 10) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let ref = '';
    for (let i = 0; i < length; i++) {
        ref += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return ref;
}

exports.isValidCellphoneNumber = (cellphoneNumber) => {
    if(typeof cellphoneNumber !== 'string') {
        return false;
    }
    return cellphoneNumber.length === 12 && (cellphoneNumber.startsWith('264'));
}

exports.isValidEmail = (email) => {
    if (typeof email !== 'string') return false;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

exports.isValidPortalEmail = (email) => {
    if (typeof email !== 'string') return false;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}