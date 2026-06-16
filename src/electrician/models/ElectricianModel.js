const { DataTypes } = require('sequelize')
const sequelize = require('../../config/db')
const {v4: uuidv4} = require('uuid')

const ElectricianModel = sequelize.define('Electrician', {
    id: {
        type: DataTypes.UUID,
        defaultValue: uuidv4,
        autoIncrement: true,
        primaryKey: true
    },
    firstName: {
        type: DataTypes.STRING,
        allowNull: false
    },
    lastName: {
        type: DataTypes.STRING,
        allowNull: false
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    cellphoneNumber: {
        type: DataTypes.STRING,
        allowNull: false
    },
    profileImage: {
        type: DataTypes.STRING,
        allowNull: true
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false
    }
}, {
    tableName: 'users_electrician',
    timestamps: false
})

module.exports = ElectricianModel