const {DataTypes} = require('sequelize')
const sequelize = require('../../config/db')
const { v4: uuidv4 } = require('uuid')
const usersModel = require('../../common/models/usersModel')

const UserAccountsModel = sequelize.define('UserAccounts', {
    id: {
        type: DataTypes.UUID,
        defaultValue: uuidv4,
        primaryKey: true,
        allowNull: false
    },
    userId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: usersModel,
            key: 'id'
        }
    },
    accountNumber:{
        type: DataTypes.STRING,
        allowNull: true
    }
}, {
    tableName: 'userAccounts',
    timestamps: true
})

UserAccountsModel.belongsTo(usersModel, { foreignKey: 'userId', as: 'user' })
usersModel.hasMany(UserAccountsModel, { foreignKey: 'userId' })

module.exports = UserAccountsModel