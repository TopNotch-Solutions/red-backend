const { DataTypes } = require('sequelize')
const sequelize = require('../../config/db')
const { randomUUID: uuidv4 } = require('crypto')

const SurveyOption = sequelize.define("SurveyOption", {
  id: {
    type: DataTypes.UUID,
    defaultValue: uuidv4,
    primaryKey: true,
  },
  optionText: {
    type: DataTypes.STRING,
    allowNull: false,
  },
});

module.exports = SurveyOption;


