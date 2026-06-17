const { DataTypes } = require('sequelize')
const sequelize = require('../../config/db')
const { randomUUID: uuidv4 } = require('crypto');
const SurveyOption = require('./SurveyOption');

const SurveyQuestion = sequelize.define("SurveyQuestion", {
  id: {
    type: DataTypes.UUID,
   defaultValue: uuidv4,
    primaryKey: true,
  },
  questionText: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  type: {
    type: DataTypes.ENUM("text", "single-choice", "multiple-choice"),
    defaultValue: "text",
  }, surveyId: {
    type: DataTypes.UUID,
    allowNull: false,
  }
});
SurveyQuestion.hasMany(SurveyOption, { foreignKey: 'questionId', onDelete: 'CASCADE' });

module.exports = SurveyQuestion;