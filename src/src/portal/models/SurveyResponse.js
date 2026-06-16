const { DataTypes } = require('sequelize')
const sequelize = require('../../config/db')
const {v4: uuidv4} = require('uuid');
const SurveyQuestion = require('./SurveyQuestion');

const SurveyResponse = sequelize.define("SurveyResponse", {
  id: {
    type: DataTypes.UUID,
    defaultValue: uuidv4,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.UUID, // FK to your User table
    allowNull: false,
  },
  answerText: {
    type: DataTypes.TEXT, // for text questions
  }, questionId: {                 // <-- foreign key to SurveyQuestion
    type: DataTypes.UUID,
    allowNull: false,
  },
  optionId: {                   // optional, for choice questions
    type: DataTypes.UUID,
    allowNull: true,
  }
});
SurveyQuestion.hasMany(SurveyResponse, { foreignKey: 'questionId', onDelete: 'CASCADE' });
SurveyResponse.belongsTo(SurveyQuestion, { foreignKey: 'questionId' });
module.exports = SurveyResponse;