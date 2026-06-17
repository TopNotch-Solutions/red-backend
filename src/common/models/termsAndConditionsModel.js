const sequelize = require('../../config/db')
const { DataTypes } = require('sequelize')
const { randomUUID: uuidv4 } = require('crypto')

const TermsAndConditionsModel = sequelize.define('TermsAndConditions', {
    id: {
        type: DataTypes.UUID,
        defaultValue: uuidv4,
        primaryKey: true,
        allowNull: false
    },
    terms:{
        type: DataTypes.TEXT,
        allowNull: false
    }
},{
    tableName: 'termsAndConditions',
    timestamps: true
})

module.exports = TermsAndConditionsModel