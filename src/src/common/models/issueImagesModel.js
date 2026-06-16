const { DataTypes } = require('sequelize')
const sequelize = require('../../config/db')
const { v4: uuidv4 } = require('uuid')
const IssuesModel = require('./issuesModel')

const IssueImageModel = sequelize.define('IssueImage', {
    id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: uuidv4
    },
    issueId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'issues',
            key: 'id'
        }
    },
    imagePath: {
        type: DataTypes.STRING,
        allowNull: false
    },
    userId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
            model: 'users',
            key: 'id'
        }
    }
}, {
    tableName: 'issueImages',
    timestamps: false
})

IssuesModel.hasMany(IssueImageModel, { foreignKey: 'issueId', as: 'images' });
IssueImageModel.belongsTo(IssuesModel, { foreignKey: 'issueId', as: 'images' });

module.exports = IssueImageModel