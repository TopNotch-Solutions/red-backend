const { DataTypes } = require('sequelize')
const sequelize = require('../../config/db')
const {v4: uuidv4} = require('uuid')

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


