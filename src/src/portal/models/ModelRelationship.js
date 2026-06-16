const Survey = require("./Survey");
const SurveyOption = require("./SurveyOption");
const SurveyQuestion = require("./SurveyQuestion");
const SurveyResponse = require("./SurveyResponse");

Survey.hasMany(SurveyQuestion, { foreignKey: "surveyId" });
SurveyQuestion.belongsTo(Survey, { foreignKey: "surveyId" });

SurveyQuestion.hasMany(SurveyOption, { foreignKey: "questionId" });
SurveyOption.belongsTo(SurveyQuestion, { foreignKey: "questionId" });

SurveyQuestion.hasMany(SurveyResponse, { foreignKey: "questionId" });
SurveyResponse.belongsTo(SurveyQuestion, { foreignKey: "questionId" });

SurveyOption.hasMany(SurveyResponse, { foreignKey: "optionId" });
SurveyResponse.belongsTo(SurveyOption, { foreignKey: "optionId" });

module.exports = {
  Survey,
  SurveyQuestion,   
    SurveyOption,
    SurveyResponse
};