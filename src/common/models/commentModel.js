const { DataTypes } = require('sequelize')
const sequelize = require('../../config/db')
const IssuesModel = require('./issuesModel')

const CommentsModel = sequelize.define('Comments', {
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
    user: {
        type: DataTypes.STRING,
        allowNull: false,
    },
userId: {
        type: DataTypes.STRING,
        allowNull: false
    },
     type: {
        type: DataTypes.ENUM('user', 'admin'),
        allowNull: false,
        defaultValue: 'user'
    },
    comment: {
        type: DataTypes.TEXT,
        allowNull: false
    }
}, {
    tableName: 'comments',
    timestamps: true
})

IssuesModel.hasMany(CommentsModel, { 
    foreignKey: 'issueId', 
    as: 'comments',
    onDelete: 'CASCADE'
})

CommentsModel.belongsTo(IssuesModel, { 
    foreignKey: 'issueId', 
    as: 'issue'
})

module.exports = CommentsModel
