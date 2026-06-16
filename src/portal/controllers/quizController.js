const { Op, Sequelize } = require("sequelize");
const {
  QuizModel,
  QuizQuestionModel,
  QuizResultsModel,
} = require("../../common/models/associations");
const sequelize = require("../../config/db");
const CapitalizeFirstLetter = require("../../common/services/capitalization");
const { isEmpty } = require("../../common/services/isEmpty");
const admin = require("../../common/services/firebase");
const usersModel = require("../../common/models/usersModel");
const QuizAnswersModel = require("../../app/models/QuizAnswersModel");
const FcmTokensModel = require("../../common/models/fcmTokensModel");
const UserNotifications = require("../../common/models/UsersNotificationModel");
const NotificationsModel = require("../models/NotificationsModel");

exports.createQuiz = async (req, res) => {
  let {
    title,
    description,
    questions,
    startTime,
    endTime,
    duration,
    focusArea,
    passing_percentage,
    isPrizeQuiz,
  } = req.body;

  if (!description || isEmpty(description)) {
    return res.status(400).json({
      status: "FAILED",
      message: "Description cannot be blank",
    });
  }

  if (!questions || isEmpty(questions)) {
    return res.status(400).json({
      status: "FAILED",
      message: "Questions cannot be blank",
    });
  }

  if (!focusArea || isEmpty(focusArea)) {
    return res.status(400).json({
      status: "FAILED",
      message: "Focus area cannot be blank",
    });
  }

  title = CapitalizeFirstLetter(title);
  description = CapitalizeFirstLetter(description);

  try {
    if (!title) {
      return res.status(400).json({
        status: 400,
        message: "Quiz title is required",
      });
    }

    if (!questions) {
      return res.status(400).json({
        status: 400,
        message: "Questions are required",
      });
    }

    const parsedQuestions =
      typeof questions === "string" ? JSON.parse(questions) : questions;

    if (!Array.isArray(parsedQuestions)) {
      return res.status(400).json({
        status: 400,
        message: "Questions must be an array",
      });
    }
    if (parsedQuestions.length === 0) {
      return res.status(400).json({
        status: 400,
        message: "Please provide at least 1 question",
      });
    }

    const quizStartTime = startTime ? new Date(startTime) : new Date();

    if (!endTime || isEmpty(endTime)) {
      return res.status(400).json({
        status: 400,
        message: "End time cannot be blank",
      });
    }

    const quizEndTime = new Date(endTime);

    if (quizEndTime <= quizStartTime) {
      return res.status(400).json({
        status: 400,
        message: "End time must be after the start time",
      });
    }

    const quizDuration =
      duration && Number.isInteger(Number(duration)) ? Number(duration) : 30;

    const newQuiz = await QuizModel.create({
      title,
      description,
      startTime: quizStartTime,
      endTime: quizEndTime,
      duration: quizDuration,
      focusArea,
      passing_percentage,
      isPrizeQuiz: isPrizeQuiz || false,
    });

    const uploadedImages = req.files || [];

    const imageMap = {};

    uploadedImages.forEach((file) => {
      const fieldName = file.fieldname;
      const index = parseInt(fieldName.split("_")[1], 10);
      if (!isNaN(index)) {
        imageMap[index] = `/uploads/quizzes/${file.filename}`;
      }
    });

    const quizQuestions = await Promise.all(
      parsedQuestions.map(async (question, index) => {
        return {
          quizId: newQuiz.id,
          question: question.question,
          options: question.options,
          correctAnswer: question.correctAnswer,
          image: imageMap[index] || null,
        };
      })
    );

    console.log(quizQuestions);

    await QuizQuestionModel.bulkCreate(quizQuestions, {
      fields: ["quizId", "question", "options", "correctAnswer", "image"],
    });

    const newNotification = await NotificationsModel.create({
      title: "New Quiz Available",
      message: `A new quiz, '${title}', has been created and is ready to take.`,
      notificationType: "Quiz",
    });

    const allUsers = await usersModel.findAll({
      attributes: ["id"],
    });
    const userIds = allUsers.map((user) => user.id);

    const userNotificationsData = userIds.map((id) => ({
      userId: id,
      notificationId: newNotification.id,
      isRead: false,
      createdAt: new Date(),
      notificationType: "Quiz",
    }));

    await UserNotifications.bulkCreate(userNotificationsData);

    const fcmTokensWithUsers = await FcmTokensModel.findAll({
      attributes: ["fcmToken"],
    });

    const fcmTokens = fcmTokensWithUsers.map(
      (tokenRecord) => tokenRecord.fcmToken
    );

    if (fcmTokens.length > 0) {
      const message = {
        notification: {
          title: "New Quiz",
          body: `Quiz: ${title} is out now`,
        },
        data: {
          quizId: newQuiz.id.toString(),
          navigationId: "Quiz",
        },
        tokens: fcmTokens,
      };
      try {
        const response = await admin.messaging().sendEachForMulticast(message);
        console.log(
          `${response.successCount} push notifications sent successfully`
        );
      } catch (error) {
        console.error("Error sending notification", error);
      }
    }

    res.status(201).json({
      status: 201,
      message: "Quiz and notifications created successfully",
      quiz: newQuiz,
      questions: quizQuestions,
    });
  } catch (error) {
    console.error("Error creating quiz:", error);
    res.status(500).json({
      status: 500,
      message: "Internal server error: " + error.message,
    });
  }
};

exports.quizStats = async (req, res) => {
  const { quizId } = req.params;

  if (!quizId) {
    return res.status(400).json({
      status: 400,
      message: "Quiz ID is required",
    });
  }

  try {
    // Fix: Add await to the quiz lookup
    const quiz = await QuizModel.findByPk(quizId);

    if (!quiz) {
      return res.status(404).json({
        status: 404,
        message: "Quiz not found",
      });
    }

    // Get total unique participants from QuizAnswersModel
    const totalParticipants = await QuizAnswersModel.count({
      where: { quizId },
      distinct: true,
      col: "userId",
    });

    // Fix: Change the condition (was using !totalParticipants === 0)
    if (totalParticipants === 0) {
      return res.status(200).json({
        status: 200,
        message: "No participants for this quiz",
        data: {
          totalParticipants: 0,
          passingRate: "0%",
          rankings: [],
        },
      });
    }

    // Get total questions for the quiz
    const totalQuestions = await QuizQuestionModel.count({
      where: { quizId },
    });

    // Calculate user scores using QuizAnswersModel
    const userScores = await QuizAnswersModel.findAll({
      where: { quizId },
      attributes: [
        "userId",
        [sequelize.fn("COUNT", sequelize.col("*")), "totalAnswered"],
        [
          sequelize.fn(
            "SUM",
            sequelize.cast(sequelize.col("isCorrect"), "INTEGER")
          ),
          "correctAnswers",
        ],
      ],
      group: ["userId"],
      raw: true,
    });

    // Calculate passing participants (50% or more correct)
    const passingParticipants = userScores.filter((user) => {
      const percentage = (user.correctAnswers / totalQuestions) * 100;
      return percentage >= 50;
    }).length;

    const passingRate = (
      (passingParticipants / totalParticipants) *
      100
    ).toFixed(2);

    // Create rankings with user details
    const rankingsWithUsers = await Promise.all(
      userScores.map(async (userScore) => {
        const user = await usersModel.findByPk(userScore.userId, {
          attributes: ["id", "firstName", "lastName", "email"],
        });

        return {
          userId: userScore.userId,
          user: user
            ? {
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
              }
            : null,
          correctAnswers: parseInt(userScore.correctAnswers),
          totalQuestions: totalQuestions,
          totalAnswered: parseInt(userScore.totalAnswered),
          percentage: (
            (userScore.correctAnswers / totalQuestions) *
            100
          ).toFixed(2),
        };
      })
    );

    // Sort rankings by percentage (descending)
    const rankings = rankingsWithUsers.sort(
      (a, b) => parseFloat(b.percentage) - parseFloat(a.percentage)
    );

    res.status(200).json({
      status: 200,
      message: "Quiz stats retrieved successfully",
      data: {
        totalParticipants,
        totalQuestions,
        passingRate: `${passingRate}%`,
        rankings,
      },
    });
  } catch (error) {
    console.error("Error fetching quiz stats:", error);
    res.status(500).json({
      status: 500,
      message: "Internal server error: " + error.message,
    });
  }
};

exports.editQuiz = async (req, res) => {
  const { quizId } = req.params;
  const {
    title,
    description,
    duration,
    startTime,
    endTime,
    focusArea,
    passing_percentage,
  } = req.body;

  try {
    const quiz = await QuizModel.findByPk(quizId);

    if (!quiz) {
      return res.status(404).json({
        status: 404,
        message: "Quiz not found",
      });
    }

    await quiz.update({
      title: title || quiz.title,
      description: description || quiz.description,
      duration: duration || quiz.duration,
      startTime: startTime || quiz.startTime,
      endTime: endTime || quiz.endTime,
      focusArea: focusArea || quiz.focusArea,
      passing_percentage: passing_percentage || quiz.passing_percentage,
    });

    res.status(200).json({
      status: 200,
      message: "Quiz updated successfully",
    });
  } catch (error) {
    console.error("Error", error);
    return res.status(500).json({
      status: 500,
      message: "Internal server error" + error.message,
    });
  }
};

exports.updateQuizQuestions = async (req, res) => {
  const { questions } = req.body;

  if (!questions || !Array.isArray(questions)) {
    return res.status(400).json({
      status: 400,
      message: "Invalid request format. Questions must be an array.",
    });
  }

  try {
    const updatedQuestions = [];

    for (const questionData of questions) {
      const { id, question, options, correctAnswer, image } = questionData;

      const quizQuestion = await QuizQuestionModel.findByPk(id);

      if (!quizQuestion) {
        return res.status(404).json({
          status: "Not found",
          message: `Question with ID ${id} not found`,
        });
      }

      await quizQuestion.update({
        question: question || quizQuestion.question,
        options: options ? JSON.parse(options) : quizQuestion.options,
        correctAnswer: correctAnswer || quizQuestion.correctAnswer,
        image: image || quizQuestion.image,
      });

      updatedQuestions.push(quizQuestion);

      res.status(200).json({
        status: "Success",
        message: "Questions updated successfully",
      });
    }
  } catch (error) {
    console.error("Error updating quiz questions:", error);
    return res.status(500).json({
      status: 500,
      message: "Internal server error" + error.message,
    });
  }
};

exports.deleteQuiz = async (req, res) => {
  const { quizIds } = req.body;

  if (!quizIds || !Array.isArray(quizIds) || quizIds.length === 0) {
    return res.status(400).json({
      status: 400,
      message: "Quiz IDs must be a non-empty array.",
    });
  }

  try {
    const deletedCount = await QuizModel.destroy({
      where: {
        id: {
          [Op.in]: quizIds,
        },
      },
    });

    if (deletedCount === 0) {
      return res.status(404).json({
        status: 404,
        message: "No quizzes found with the provided IDs",
      });
    }

    res.status(200).json({
      status: "Success",
      message: `${deletedCount} quiz(zes) successfully deleted`,
    });
  } catch (error) {
    console.error("Error", error);
    return res.status(500).json({
      status: 500,
      message: "Internal server error" + error.message,
    });
  }
};

exports.getQuizzes = async (req, res) => {
  try {
    const quizzes = await QuizModel.findAll({
      attributes: {
        include: [
          [
            Sequelize.literal(`(
                            SELECT COUNT(*)
                            FROM quiz_questions AS qq_count
                            WHERE
                                qq_count.quizId = Quiz.id
                        )`),
            "questionCount",
          ],
        ],
      },
      include: [
        {
          model: QuizQuestionModel,
          as: "questions",
        },
      ],
      order: [["title", "ASC"]],
    });
    // const getAllUserWhoCompletedQuiz = await QuizAnswersModel.count({
    //         where: {
    //             quizId: quiz.id
    //         }});

    res.status(200).json({
      status: "SUCCESS",
      message: "Quizzes retrieved successfully",
      quizzes,
      //totalParticipants: getAllUserWhoCompletedQuiz
    });
  } catch (error) {
    console.error("Error retrieving quizzes:", error);
    return res.status(500).json({
      status: "FAILED",
      message: "Internal server error retrieving quizzes.",
    });
  }
};

exports.getQuiz = async (req, res) => {
  const { quizId } = req.params;

  try {
    const quiz = await QuizModel.findOne({
      where: { id: quizId },
      include: [
        {
          model: QuizQuestionModel,
          as: "QuizQuestions",
        },
      ],
    });

    if (!quiz) {
      return res.status(404).json({
        status: 404,
        message: "Quiz not found",
      });
    }

    res.status(200).json({
      status: 200,
      message: "Quiz retrieved successfully",
      quiz,
    });
  } catch (error) {
    console.error("Error fetching quiz", error);
    res.status(500).json({
      status: 500,
      message: "Internal server error" + error.message,
    });
  }
};

exports.getTopQuizUsers = async (req, res) => {
  try {
    const allQuizUserScores = await QuizAnswersModel.findAll({
      where: { isCorrect: true },
      attributes: [
        "quizId",
        "userId",
        [
          QuizAnswersModel.sequelize.fn(
            "COUNT",
            QuizAnswersModel.sequelize.col("QuizAnswer.id")
          ),
          "correctCount",
        ],
      ],
      group: [
        "quizId",
        "userId",
        "quiz.id",
        "quiz.title",
        "quiz.isPrizeQuiz",
        "quiz.endTime",
        "quiz.winnerId",
      ],
      include: [
        {
          model: QuizModel,
          as: "quiz",
          attributes: ["id", "title", "isPrizeQuiz", "endTime", "winnerId"],
          where: {
            isPrizeQuiz: true,
            endTime: { [Op.lte]: new Date() },
          },
        },
      ],
      raw: true,
      nest: true,
    });

    const quizTopUsers = {};
    for (const row of allQuizUserScores) {
      const quizId = row.quizId;
      if (!quizTopUsers[quizId]) {
        quizTopUsers[quizId] = {
          quizTitle: row.quiz.title,
          endTime: row.quiz.endTime,
          winnerId: row.quiz.winnerId,
          users: [],
        };
      }
      quizTopUsers[quizId].users.push(row);
    }

    const result = await Promise.all(
      Object.entries(quizTopUsers).map(async ([quizId, quizData]) => {
        let winnerUser;

        if (quizData.winnerId) {
          const winnerRow = await QuizAnswersModel.findOne({
            where: { quizId, userId: quizData.winnerId, isCorrect: true },
            attributes: [
              "userId",
              [
                QuizAnswersModel.sequelize.fn(
                  "COUNT",
                  QuizAnswersModel.sequelize.col("QuizAnswer.id")
                ),
                "correctCount",
              ],
            ],
            group: ["userId"],
            raw: true,
          });

          winnerUser = await usersModel.findByPk(quizData.winnerId, {
            attributes: [
              "id",
              "firstName",
              "lastName",
              "email",
              "cellphoneNumber",
            ],
          });

          winnerUser.correctCount = Number(winnerRow.correctCount);
        } else {
          const maxCorrect = Math.max(
            ...quizData.users.map((u) => Number(u.correctCount))
          );

          const topUsers = quizData.users.filter(
            (u) => Number(u.correctCount) === maxCorrect
          );

          if (!topUsers.length) {
            return {
              quizId,
              quizTitle: quizData.quizTitle,
              endTime: quizData.endTime,
              winner: null,
            };
          }

          const winner = topUsers[Math.floor(Math.random() * topUsers.length)];

          await QuizModel.update(
            { winnerId: winner.userId },
            { where: { id: quizId } }
          );

          winnerUser = await usersModel.findByPk(winner.userId, {
            attributes: [
              "id",
              "firstName",
              "lastName",
              "email",
              "cellphoneNumber",
            ],
          });

          winnerUser.correctCount = Number(winner.correctCount);
        }

        return {
          quizId,
          quizTitle: quizData.quizTitle,
          endTime: quizData.endTime,
          winner: winnerUser,
          score: winnerUser ? winnerUser.correctCount : 0,
        };
      })
    );

    res.status(200).json({
      status: "SUCCESS",
      message: "Prize quiz winners retrieved successfully",
      data: result,
    });
  } catch (error) {
    console.error("Error retrieving prize quiz winners:", error);
    res.status(500).json({
      status: "FAILED",
      message: "Internal server error: " + error.message,
    });
  }
};
