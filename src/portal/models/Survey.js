const { DataTypes } = require('sequelize');
const sequelize = require('../../config/db');
const { v4: uuidv4 } = require('uuid');
const SurveyQuestion = require('./SurveyQuestion');

const Survey = sequelize.define("Survey", {
  id: {
    type: DataTypes.UUID,
    defaultValue: uuidv4,
    primaryKey: true,
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
  },
  startDate: {
    type: DataTypes.DATE,
    allowNull: true, 
  },
  endDate: {
    type: DataTypes.DATE,
    allowNull: true,
  }
});
Survey.hasMany(SurveyQuestion, { foreignKey: 'surveyId', onDelete: 'CASCADE' });
module.exports = Survey;
