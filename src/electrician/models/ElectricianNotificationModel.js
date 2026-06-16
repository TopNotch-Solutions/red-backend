const {DataTypes} = require('sequelize')
const sequelize = require('../../config/db')
const usersModel = require('../../common/models/usersModel')

const ElectricianNotificationModel = sequelize.define('ElectricianNotification', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    electricianId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: usersModel,
            key: 'id'
        }
    },
    message: {
        type: DataTypes.STRING,
        allowNull: false
    },
    isread: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    }
}, {
    tableName: 'electrician_notifications',
    timeStamps: true
})

module.exports = ElectricianNotificationModel