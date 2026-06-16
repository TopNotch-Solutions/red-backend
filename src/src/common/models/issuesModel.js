const { DataTypes } = require('sequelize')
const sequelize = require('../../config/db')
const usersModel = require('./usersModel')
const UserModel = require('../../portal/models/UserModel')

const IssuesModel = sequelize.define('Issues', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    issueType: {
        type: DataTypes.STRING,
        allowNull: false
    },
    location: {
        type: DataTypes.STRING,
        allowNull: true
    },
    description: {
        type: DataTypes.STRING,
        allowNull: false
    },
    issueImage: {
        type: DataTypes.STRING,
        allowNull: true
    },
    streetName: {
        type: DataTypes.STRING,
        allowNull: true
    },
    erf: {
        type: DataTypes.STRING,
        allowNull: false
    },
    userId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: usersModel,
            key: 'id'
        }
    },
    electricianId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: usersModel,
            key: 'id'
        }
    },
    status: {
        type: DataTypes.STRING,
        allowNull: false
    },
    isAssigned: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    fullName: {
        type: DataTypes.STRING,
        allowNull: true
    },
    priority: {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: 'Low'
    },
    refNo: {
        type: DataTypes.STRING,
        allowNull: true
    },
    handlerId: {
        type: DataTypes.STRING,
        allowNull: true
    },
    cellphoneNumber: {
        type: DataTypes.STRING,
        allowNull: true
    },
    finalReason: {
        type: DataTypes.STRING,
        allowNull: false
    },
    isCompletedRemove:{
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
    },
    completedImage:{
         type: DataTypes.STRING,
        allowNull:true
    },
    completedImage2: {
  type: DataTypes.STRING,
  allowNull: true
}
}, {
    tableName: 'issues',
    timestamps: true
})

usersModel.hasMany(IssuesModel, { foreignKey: 'userId', as: 'issues' })
IssuesModel.belongsTo(usersModel, { foreignKey: 'userId', as: 'user' })
usersModel.hasMany(IssuesModel, { foreignKey: 'electricianId', onDelete: 'SET NULL' })
IssuesModel.belongsTo(usersModel, { foreignKey: 'electricianId' })
IssuesModel.belongsTo(UserModel, { foreignKey: 'handlerId', as: 'handler' })

module.exports = IssuesModel