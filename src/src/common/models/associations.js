const sequelize = require('../../config/db');
const QuizModel = require('../../portal/models/QuizModel');
const QuizQuestionModel = require('./QuizQuestionModel');
const QuizAnswersModel = require('../../app/models/QuizAnswersModel');
const QuizResultsModel = require('../../app/models/QuizResultsModel');
const usersModel = require('./usersModel');
const TransactionModel = require('./TransactionModel')
const PendingPaymentsModel = require('./pendingPaymentsModel')
const ConversationsModel = require('./conversationsModel')
const MessagesModel = require('./messagesModel')
const User = require('../../portal/models/UserModel')


QuizModel.hasMany(QuizQuestionModel, { foreignKey: 'quizId', as: 'questions' });
QuizQuestionModel.belongsTo(QuizModel, { foreignKey: 'quizId', as: 'q uiz' });
QuizResultsModel.belongsTo(QuizModel, { foreignKey: 'quizId', as: 'quiz' });
QuizResultsModel.belongsTo(usersModel, { foreignKey: 'userId', as: 'user' });
usersModel.hasMany(QuizResultsModel, { foreignKey: 'userId', as: 'quizResults' });
QuizModel.hasMany(QuizResultsModel, { foreignKey: 'quizId' })
QuizAnswersModel.belongsTo(QuizModel, { foreignKey: 'quizId', as: 'quiz' });
QuizModel.hasMany(QuizAnswersModel, { foreignKey: 'quizId', as: 'answers' });

QuizQuestionModel.hasMany(QuizAnswersModel, { foreignKey: 'questionId', as: 'answers' });
QuizAnswersModel.belongsTo(QuizQuestionModel, { foreignKey: 'questionId', as: 'question' });
usersModel.hasMany(TransactionModel, { foreignKey: 'userId', onDelete: 'CASCADE' })

usersModel.hasMany(PendingPaymentsModel, { foreignKey: 'userId', onDelete: 'CASCADE' })

QuizAnswersModel.belongsTo(usersModel, { foreignKey: 'userId', as: 'user' });

ConversationsModel.hasMany(MessagesModel, { foreignKey: 'conversationId', as: 'messages' });
MessagesModel.belongsTo(ConversationsModel, { foreignKey: 'conversationId', as: 'conversation' });

module.exports = {
    sequelize,
    QuizModel,
    QuizQuestionModel,
    QuizAnswersModel,
    usersModel,
    QuizResultsModel,
    TransactionModel,
    PendingPaymentsModel,
    User,
    MessagesModel,
    ConversationsModel
};