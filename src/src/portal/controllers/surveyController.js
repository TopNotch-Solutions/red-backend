const FcmTokensModel = require("../../common/models/fcmTokensModel");
const { Survey, SurveyQuestion, SurveyOption, SurveyResponse } = require("../models/ModelRelationship");
const { Op } = require("sequelize");
const NotificationsModel = require("../models/NotificationsModel");
const usersModel = require("../../common/models/usersModel");
const UserNotifications = require("../../common/models/UsersNotificationModel");
const admin = require("../../../src/common/services/firebase")

exports.create = async (req, res) => {
  try {
    const { title, description, questions, startDate, endDate } = req.body;

    if (!title || !questions || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({
        status: 'FAILED',
        message: 'Title and at least one question are required.'
      });
    }

    const surveyStartDate = startDate ? new Date(startDate) : new Date();
    let surveyEndDate = endDate ? new Date(endDate) : null;

    if (surveyEndDate && surveyEndDate <= surveyStartDate) {
      return res.status(400).json({
        status: 'FAILED',
        message: 'End date must be after start date.'
      });
    }

    // Create survey
    const survey = await Survey.create(
      {
        title,
        description,
        startDate: surveyStartDate,
        endDate: surveyEndDate,
        SurveyQuestions: questions.map((q) => ({
          questionText: q.questionText,
          type: q.type,
          SurveyOptions: q.options || []
        })),
      },
      { include: [{ model: SurveyQuestion, include: [SurveyOption] }] }
    );

    const now = new Date();
    if (surveyStartDate <= now) {
      const newNotification = await NotificationsModel.create({
        title: "New Survey Available",
        message: `A new survey, '${title}', is now available.`,
        notificationType: 'Survey'
      });

      const allUsers = await usersModel.findAll({ attributes: ['id'] });
      const userIds = allUsers.map(user => user.id);

      const userNotificationsData = userIds.map(id => ({
        userId: id,
        notificationId: newNotification.id,
        isRead: false,
        createdAt: new Date(),
        notificationType: 'Quiz'
      }));

      await UserNotifications.bulkCreate(userNotificationsData);

      const fcmTokensWithUsers = await FcmTokensModel.findAll({
        attributes: ['fcmToken']
      });
      const fcmTokens = fcmTokensWithUsers.map(tokenRecord => tokenRecord.fcmToken);

      if (fcmTokens.length > 0) {
        const message = {
          notification: {
            title: "New Survey",
            body: `Survey: ${title} is out now`
          },
          data: {
            navigationId: 'Survey'
          },
          tokens: fcmTokens
        };
        try {
          const response = await admin.messaging().sendEachForMulticast(message);
          console.log(`${response.successCount} push notifications sent successfully`);
        } catch (error) {
          console.error('Error sending notification', error);
        }
      }
    }

    return res.status(201).json({
      status: "SUCCESS",
      data: survey
    }); 
  } catch (error) {
    console.error(error);
    return res.status(500).json({ 
      status: 'FAILED',
      error: 'Internal server error' 
    });
  }
};

Survey.prototype.isActive = function () {
  const now = new Date();
  if (this.startDate && now < this.startDate) return false;
  if (this.endDate && now > this.endDate) return false;
  return true;
};

// exports.survey = async (req, res) => {
//   try {
//     const survey = await Survey.findByPk(req.params.id, {
//       include: [
//         {
//           model: SurveyQuestion,
//           include: [
//             SurveyOption,
//             { model: SurveyResponse }
//           ],
//         },
//       ],
//     });

//     if (!survey) {
//       return res.status(404).json({ status: 'FAILED', message: 'Survey not found' });
//     }

//     res.json({
//       ...survey.toJSON(),
//       isActive: survey.isActive()
//     });
//   } catch (error) {
//     return res.status(500).json({ 
//       status: 'FAILED',
//       error: 'Internal server error' 
//     });
//   }
// };

exports.allSurveys = async (req, res) => {
  try {
    const surveys = await Survey.findAll({
      include: [
        {
          model: SurveyQuestion,
          include: [
            SurveyOption,
            SurveyResponse // include all responses for stats
          ],
        },
      ],
    });

    const formattedSurveys = surveys.map((survey) => {
      const surveyData = survey.toJSON();

      const questions = surveyData.SurveyQuestions.map((q) => {
        if (q.type === "text") {
          // For text questions, return all responses
          return {
            id: q.id,
            questionText: q.questionText,
            type: q.type,
            responses: q.SurveyResponses.map((r) => ({
              userId: r.userId,
              answerText: r.answerText,
            })),
          };
        } else {
          // For choice questions, count responses per option
          const optionsWithStats = q.SurveyOptions.map((opt) => {
            const responseCount = q.SurveyResponses.filter(
              (r) => r.optionId === opt.id
            ).length;

            return {
              id: opt.id,
              optionText: opt.optionText,
              responseCount,
            };
          });

          return {
            id: q.id,
            questionText: q.questionText,
            type: q.type,
            options: optionsWithStats,
          };
        }
      });

      return {
        id: surveyData.id,
        title: surveyData.title,
        description: surveyData.description,
        startDate: surveyData.startDate,
        endDate: surveyData.endDate,
        questions,
      };
    });

    res.json({
      status: "SUCCESS",
      data: formattedSurveys,
    });
  } catch (error) {
    console.error("Error fetching all surveys:", error);
    res.status(500).json({
      status: "FAILED",
      error: "Internal server error",
    });
  }
};

exports.survey = async (req, res) => {
  try {
    const survey = await Survey.findByPk(req.params.id, {
      include: [
        {
          model: SurveyQuestion,
          include: [
            SurveyOption,
            SurveyResponse
          ],
        },
      ],
    });

    if (!survey) {
      return res.status(404).json({ status: "FAILED", message: "Survey not found" });
    }

    // Convert survey to plain object
    const surveyData = survey.toJSON();

    // Build stats for each question
    surveyData.questions = surveyData.SurveyQuestions.map((q) => {
      if (q.type === "text") {
        // For text questions, return all responses
        return {
          id: q.id,
          questionText: q.questionText,
          type: q.type,
          responses: q.SurveyResponses.map((r) => ({
            userId: r.userId,
            answerText: r.answerText
          }))
        };
      } else {
        // For choice questions, count responses per option
        const optionsWithStats = q.SurveyOptions.map((opt) => {
          const count = q.SurveyResponses.filter(
            (r) => r.optionId === opt.id
          ).length;
          return {
            id: opt.id,
            optionText: opt.optionText,
            responseCount: count
          };
        });

        return {
          id: q.id,
          questionText: q.questionText,
          type: q.type,
          options: optionsWithStats
        };
      }
    });

    delete surveyData.SurveyQuestions;

    res.json({
      ...surveyData,
      isActive: survey.isActive()
    });
  } catch (error) {
    console.error("Error fetching survey stats:", error);
    return res.status(500).json({
      status: "FAILED",
      error: "Internal server error"
    });
  }
};

 exports.removeSurveys = async (req, res) => {
  const { surveyIds } = req.body; // Expecting an array of IDs

  if (!Array.isArray(surveyIds) || surveyIds.length === 0) {
    return res.status(400).json({
      status: "FAILED",
      message: "surveyIds must be a non-empty array",
    });
  }

  try {
    // Find all surveys first
    const surveys = await Survey.findAll({ where: { id: { [Op.in]: surveyIds } } });
    if (surveys.length === 0) {
      return res.status(404).json({
        status: "FAILED",
        message: "No surveys found for provided IDs",
      });
    }

    // Get all related questions for those surveys
    const questions = await SurveyQuestion.findAll({ where: { surveyId: { [Op.in]: surveyIds } } });
    const questionIds = questions.map(q => q.id);

    if (questionIds.length > 0) {
      // Delete responses first
      await SurveyResponse.destroy({ where: { questionId: { [Op.in]: questionIds } } });
      // Delete options
      await SurveyOption.destroy({ where: { questionId: { [Op.in]: questionIds } } });
      // Delete questions
      await SurveyQuestion.destroy({ where: { id: { [Op.in]: questionIds } } });
    }

    // Delete surveys
    await Survey.destroy({ where: { id: { [Op.in]: surveyIds } } });

    return res.status(200).json({
      status: "SUCCESS",
      message: "Surveys and related data deleted successfully",
      deletedSurveys: surveyIds,
    });

  } catch (error) {
    console.error("Error deleting surveys:", error);
    return res.status(500).json({
      status: "FAILED",
      message: "Internal server error",
    });
  }
};
