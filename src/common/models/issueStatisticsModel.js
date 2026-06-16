const IssuesModel = require("./issuesModel")
const usersModel = require("./usersModel")
const { DataTypes } = require('sequelize')
const sequelize = require('../../config/db')

const IssueStatisticsModel = sequelize.define('IssueStatistics', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    issueId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: IssuesModel,
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
    dateAssigned: {
        type: DataTypes.DATE,
        allowNull: true
    },
    dateAccepted: {
        type: DataTypes.DATE,
        allowNull: true
    },
    dateCompleted: {
        type: DataTypes.DATE,
        allowNull: true
    }
}, {
    tableName: 'issue_statistics',
    timestamps: true
})

IssuesModel.hasOne(IssueStatisticsModel, { foreignKey: 'issueId', as: 'statistics' })
IssueStatisticsModel.belongsTo(IssuesModel, { foreignKey: 'issueId', as: 'issue' })

usersModel.hasMany(IssueStatisticsModel, { foreignKey: 'electricianId', onDelete: 'SET NULL' })
IssueStatisticsModel.belongsTo(usersModel, { foreignKey: 'electricianId', as: 'electrician' })

module.exports = IssueStatisticsModel
