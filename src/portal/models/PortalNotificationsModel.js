const {DataTypes} = require('sequelize')
const sequelize = require('../../config/db')
const IssuesModel = require('../../common/models/issuesModel')
const { randomUUID: uuidv4 } = require('crypto')

const PortalNotificationsModel = sequelize.define('PortalNotifications', {
    id: {
        type: DataTypes.UUID,
        defaultValue: uuidv4,
        primaryKey: true
    },
    isRead: {
        type: DataTypes.BOOLEAN,
        allowNull: false
    },
    message: {
        type: DataTypes.STRING,
        allowNull: false
    },
    userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'users_portal',
            key: 'id'
        }
    },
    issueId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: IssuesModel,
            key: 'id'
        },
        onDelete: 'SET NULL'
    },
    type: {
        type: DataTypes.STRING,
        defaultValue: 'Info'
    }
},{
    tableName: 'portal_notifications',
    timestamps: true
})


module.exports = PortalNotificationsModel