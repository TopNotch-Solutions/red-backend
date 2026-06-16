const { DataTypes } = require('sequelize')
const sequelize = require('../../config/db')
const { v4: uuidv4 } = require('uuid')
const RoleModel = require('./roleModel')

const RoleCategory = sequelize.define('RoleCategories', {
    id: {
        type: DataTypes.UUID,
        defaultValue: uuidv4,
        primaryKey: true,
        allowNull: false
    },
    roleId: {
        type: DataTypes.UUID,
       references: {
      model: RoleModel,
      key: 'id'
    },
    onDelete: 'CASCADE'
  },category: {
        type: DataTypes.STRING,
        allowNull: true
    }
}, {
    tableName: 'role_categories',
    timestamps: false
})
RoleModel.hasMany(RoleCategory, {
  foreignKey: 'roleId',
  onDelete: 'CASCADE'
});

RoleCategory.belongsTo(RoleModel, {
  foreignKey: 'roleId',
  onDelete: 'CASCADE'
});
module.exports = RoleCategory
