const sequelize = require('../../config/db')
const { DataTypes } = require('sequelize')

const MCodeModel = sequelize.define(
    "mcodes",
    {
        id: {
            type: DataTypes.BIGINT,
            autoIncrement: true,
            primaryKey: true,
            allowNull: false,
        },
        mcode: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        createdAt: {
            type: DataTypes.DATE,
            allowNull: false,
        },
        expiresAt: {
            type: DataTypes.DATE,
            allowNull: false,
        },
    },
    {
        timestamps: false,
        tableName: "mcodes"
    }
);

module.exports = MCodeModel;