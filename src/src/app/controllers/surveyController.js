const { Op } = require("sequelize");
const { Survey, SurveyResponse, SurveyQuestion, SurveyOption } = require("../../portal/models/ModelRelationship");

exports.submit = async (req, res) => {
  const userId = req.user.id;
  try {
    const { answers } = req.body;

    if (!userId || !answers || !Array.isArray(answers) || answers.length === 0) {
      return res.status(400).json({
        status: "FAILED",
        message: "User ID and at least one answer are required."
      });
    }

    const responses = await SurveyResponse.bulkCreate(
      answers.map((a) => ({
        userId,
        questionId: a.questionId,
        optionId: a.optionId || null,
        answerText: a.answerText || null,
      }))
    );

    return res.status(201).json({
      status: "SUCCESS",
      message: "Responses saved successfully",
      data: responses
    });
  } catch (error) {
    console.error("Error submitting responses:", error);
    return res.status(500).json({
      status: "FAILED",
      error: "Internal server error"
    });
  }
};

exports.survey = async (req, res) => {
  const userId = req.user.id;

  if (!userId) {
    return res.status(400).json({
      status: "FAILED",
      error: "User ID not provided"
    });
  }

  try {
    const now = new Date();

    const surveys = await Survey.findAll({
      where: {
        startDate: { [Op.lte]: now },
        [Op.or]: [
          { endDate: null },
          { endDate: { [Op.gte]: now } }
        ]
      },
      include: [
        {
          model: SurveyQuestion,
          include: [
            SurveyOption,
            {
              model: SurveyResponse,
              where: { userId },
              required: false // include questions even if user hasn't answered
            }
          ]
        }
      ]
    });

    const surveysWithAnswers = surveys.map(survey => {
      const attempted = survey.SurveyQuestions.some(
        question => question.SurveyResponses.length > 0
      );

      const questions = survey.SurveyQuestions.map(q => {
        // Get user's answer(s) for this question
        const userAnswer = q.SurveyResponses.map(r => ({
          questionText: q.questionText,
          answerText: r.answerText || null,
          optionId: r.optionId || null
        }));

        return {
          id: q.id,
          questionText: q.questionText,
          type: q.type,
          options: q.SurveyOptions.map(opt => ({
            id: opt.id,
            optionText: opt.optionText
          })),
          userAnswer
        };
      });

      return {
        id: survey.id,
        title: survey.title,
        description: survey.description,
        startDate: survey.startDate,
        endDate: survey.endDate,
        attempted,
        questions
      };
    });

    return res.json({
      status: "SUCCESS",
      data: surveysWithAnswers
    });

  } catch (error) {
    console.error("Error fetching surveys:", error);
    return res.status(500).json({
      status: "FAILED",
      error: "Internal server error"
    });
  }
};