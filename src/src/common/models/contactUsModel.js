const { DataTypes } = require('sequelize')
const sequelize = require('../../config/db')
const { randomUUID: uuidv4 } = require('crypto')
const usersModel = require('../models/usersModel')

const contactUsModel = sequelize.define('ContactUsModel', {
    id: {
        type: DataTypes.UUID,
        defaultValue: uuidv4,
        primaryKey: true,
        allowNull: false
    },
    fullName: {
        type: DataTypes.STRING,
        allowNull: false
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false
    },
    message: {
        type: DataTypes.STRING,
        allowNull: false
    },
    accountNo: {
        type: DataTypes.BIGINT,
        allowNull: true
    },
    contact:{
        type: DataTypes.STRING,
        allowNull: false
    },
    response: {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: null
    }, 
     category: {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: null
    }, 
    isCompleted: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
    },
     createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
    }
},
    {
        tableName: 'contactus',
        timestamps: false
    })

module.exports = contactUsModel