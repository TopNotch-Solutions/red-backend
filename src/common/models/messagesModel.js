const { DataTypes } = require('sequelize');
const sequelize = require('../../config/db')
const { randomUUID: uuidv4 } = require('crypto');
const usersModel = require('./usersModel');

const MessagesModel = sequelize.define('Messages', {
  id: {
    type: DataTypes.UUID,
    defaultValue: uuidv4,
    primaryKey: true,
    allowNull: false
  },
  issueId: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  senderId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  receiverId: {
    type: DataTypes.UUID,
    allowNull: true
  },
  senderType: {
    type: DataTypes.ENUM('app', 'portal'),
    allowNull: false
  },
  receiverType: {
    type: DataTypes.ENUM('app', 'portal'),
    allowNull: false
  },
  message: {
    type: DataTypes.STRING,
    allowNull: false
  },
  chatType: {
    type: DataTypes.ENUM('issue', 'direct'),
    defaultValue: 'issue'
  },
  isRead: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  timestamp: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  refNo: {
    type: DataTypes.STRING,
    allowNull: true
  },
  deletedAt: {
    type: DataTypes.STRING,
    allowNull: true
  },
  deletedBy: {
    type: DataTypes.STRING,
    allowNull: true
  },
  deleteReason: {
    type: DataTypes.STRING,
    allowNull: true
  },
  conversationId: {
    type: DataTypes.UUID,
    allowNull: true
  }
}, {
  tableName: 'messages',
  timestamps: false
});

MessagesModel.belongsTo(usersModel, { foreignKey: 'senderId', as: 'sender' });
MessagesModel.belongsTo(usersModel, { foreignKey: 'receiverId', as: 'receiver' });

module.exports = MessagesModel