const sequelize = require('../../config/db')
const { DataTypes } = require('sequelize')
const { v4: uuidv4 } = require('uuid')

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