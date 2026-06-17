process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection:", reason);
});

process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
  // Exit so PM2 or systemd can restart
  process.exit(1);
});

const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const path = require("path");
const schedule = require("node-schedule");
const http = require("http");
const fs = require("fs");
const https = require("https");
const jwt = require("jsonwebtoken");
const { Op } = require("sequelize");
const ChatDeletionsModel = require("./src/common/models/deletedChatsModel");
const { getOrCreateConversation } = require("./src/common/services/utils");
const ConversationsModel = require("./src/common/models/conversationsModel");
const {
  sendMessageNotification,
  sendPaymentReminders,
  sendCutoffWarningNotifications,
  sendServiceInterruptionNotifications,
} = require("./src/common/services/notificationService");
const IssueImageModel = require("./src/common/models/issueImagesModel");
const admin = require("./src/common/services/firebase");

//portal
const authRoutes = require("./src/portal/routes/authRoutes");
const usersRoutes = require("./src/portal/routes/usersRoutes");
const notificationRoutes = require("./src/portal/routes/notificationsRoutes");
const portalElectricianRoutes = require("./src/portal/routes/electricianRoutes");
const issuesRoutes = require("./src/portal/routes/issuesRoutes");
const quizRoutes = require("./src/portal/routes/quizRoutes");
const portalTransactionRoutes = require("./src/portal/routes/transactionRoutes");
const portalContactUsRoutes = require("./src/portal/routes/contactUsRoutes");
const portalMeterReadingRoutes = require("./src/portal/routes/meterReadingRoutes");
const appUsersRoutes = require("./src/portal/routes/appUsersRoutes");
const portalNewsRoutes = require("./src/portal/routes/newsRoutes");
const portalAdvertsRoutes = require("./src/portal/routes/advertsRoutes");
const portalPaymentRoutes = require("./src/portal/routes/paymentsRoutes");
const portalTipsRoutes = require("./src/portal/routes/tipsRoutes");
const portalFormsRoutes = require("./src/portal/routes/filesRoutes");
const portalInvoiceRoutes = require("./src/portal/routes/invoiceRoutes");
const portalTownRoutes = require("./src/portal/routes/townsRoutes");
const portalSuburbRoutes = require("./src/portal/routes/suburbsRoutes");
const portalRequestRoutes = require("./src/portal/routes/requestRoutes");
const portalMessagesRoutes = require("./src/portal/routes/messagesRoutes");
const portalTermsAndConditionsRoutes = require("./src/portal/routes/termsAndConditionsRoutes");
const portalSurveryRoutes = require("./src/portal/routes/surveyRoute");
const portalTownSubRoutes = require("./src/portal/routes/townsSubRoutes");

//app
const appAuthRoutes = require("./src/app/routes/authRoutes");
const appUserRoutes = require("./src/app/routes/userRoutes");
const appNotificationRoutes = require("./src/app/routes/notificationsRoutes");
const appIssuesRoutes = require("./src/app/routes/issueRoutes");
const appQuizRoutes = require("./src/app/routes/quizRoutes");
const appTransactionRoutes = require("./src/app/routes/transactionRoutes");
const meterReadingRoutes = require("./src/app/routes/meterReadingRoutes");
const contactUsRoutes = require("./src/app/routes/contactUsRoutes");
const appNewsRoutes = require("./src/app/routes/newsRoutes");
const appAdvertsRoutes = require("./src/app/routes/advertsRoutes");
const appTipRoutes = require("./src/app/routes/tipsRoutes");
const appRequestRoutes = require("./src/app/routes/requestsRoutes");
const appFilesRoutes = require("./src/app/routes/filesRoutes");
const appInvoiceRoutes = require("./src/app/routes/invoiceRoutes");
const appSuburbRoutes = require("./src/app/routes/suburbRoutes");
const appTownRoutes = require("./src/app/routes/townsRoutes");
const appMessagesRoutes = require("./src/app/routes/messagesRoutes");
const appBcxRequestRoutes = require("./src/app/routes/postpaidRequestsRoutes");
const appSurveryRoutes = require("./src/app/routes/surveyRouter");

//electrician
const electricianRoutes = require("./src/electrician/routes/electricianRoutes");
const electricianTasksRoutes = require("./src/electrician/routes/tasksRoutes");
const electricianNotificationRoutes = require("./src/electrician/routes/notificationRoutes");
const electricianAuthRoutes = require("./src/electrician/routes/authRoutes");
const { Server } = require("socket.io");
const { emit } = require("process");
const IssuesModel = require("./src/common/models/issuesModel");
const MessagesModel = require("./src/common/models/messagesModel");
const sequelize = require("./src/config/db");
const { group } = require("console");
const {
  fetchAndExtractInvoices,
} = require("./src/common/services/invoiceService");

const usersModel = require("./src/common/models/usersModel");
const User = require("./src/portal/models/UserModel");
const FcmTokensModel = require("./src/common/models/fcmTokensModel");
const CommentsModel = require("./src/common/models/commentModel");
const NotificationsModel = require("./src/portal/models/NotificationsModel");
const UserNotifications = require("./src/common/models/UsersNotificationModel");
const AnonymoustNotificationsModel = require("./src/common/models/anonymousNotificationsModel");
const AnonymousUsersModel = require("./src/common/models/anonymousUsers");
const AnonymousUserNotifications = require("./src/common/models/anonymousUserNotifications");
const CapitalizeFirstLetter = require("./src/common/services/capitalization");
const { isEmpty } = require("./src/common/services/isEmpty");
const { parseISO } = require("date-fns");
const {
  resolveNotificationImageFromSocket,
} = require("./src/portal/middlewares/uploadMiddleware");
const { type } = require("os");

require("dotenv").config();
require("./src/common/models/associations");

// var privatekey = fs. readFileSync('/etc/pki/tls/private/key-erongo-unencrypted.pem', 'utf8');
// var passphrase = '#3st. 123456#'
// var certificate = fs. readFileSync('/etc/pki/tls/certs/fullchain-erongo.pem', 'utf8');
// var ca = [
// fs.readFileSync('/etc/pki/tls/certs/SectigoPublicServerAuthenticationCADVR36.crt', 'utf8'),
// fs.readFileSync('/etc/pki/tls/certs/SectigoPublicServerAuthenticationRootR46_USERTrust.crt', 'utf8')
// ] ;
// var credentials = {key: privatekey, cert: certificate, ca: ca};


//til here

// const httpsOptions = {
//     key: fs.readFileSync(process.env.CERT_KEY),
//     cert: fs.readFileSync(process.env.CERT),
// };

const app = express();
// const server = https.createServer(httpsOptions, app)
const server = http.createServer(app);
//var httpsServer = https.createServer (credentials, app);

const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:3000",
      "https://api-gw.mtc.com.na",
      "https://api-gw.mtc.com.na",
      "http://41.219.71.112",
      "https://uat-portal.erongored.com.na",
      "https://portal.erongored.com.na",

    ],
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  },
});

app.use(bodyParser.json());
app.use(express.json());

app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    return res.status(400).json({
      status: "FAILED",
      message:
        "Syntax error in your JSON request. Please check your request body.",
    });
  }

  if (err.status === 404) {
    return res.status(404).json({
      status: "FAILED",
      message: "The requested resource was not found. Please confirm the URL.",
    });
  }

  next();
});

app.use(
  cors({
    origin: [
      "http://uat-portal.erongored.com.na",
 "https://uat-portal.erongored.com.na",
 "https://uat-api.erongored.com.na",
	"https://portal.erongored.com.na",
      "https://api-gw.mtc.com.na",
      "http://localhost:3000",
      "https://api-gw.mtc.com.na",
      "http://41.219.71.112",
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization", "x-access-token"],
    credentials: true,
    exposedHeaders: ["Authorization", "x-access-token", "Content-Type"],
  })
);
//app.options("*", (req, res) => {
//  res.header("Access-Control-Allow-Origin", req.headers.origin || "*");
//  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS");
//  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization, x-access-token");
//  res.header("Access-Control-Allow-Credentials", "true");
//  res.sendStatus(200);
//});
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use(
  "/documents/invoices",
  express.static(path.join(__dirname, "documents/invoices"))
);
app.use(
  "/documents/receipts",
  express.static(path.join(__dirname, "documents/receipts"))
);

// portal routes
app.use("/uat/portal/auth", authRoutes);
app.use("/uat/portal/users", usersRoutes);
app.use("/uat/portal/notifications", notificationRoutes);
app.use("/uat/portal/electrician", portalElectricianRoutes);
app.use("/uat/portal/issues", issuesRoutes);
app.use("/uat/portal/quiz", quizRoutes);
app.use("/uat/portal/survey", portalSurveryRoutes);
app.use("/uat/portal/transactions", portalTransactionRoutes);
app.use("/uat/portal/contact-us", portalContactUsRoutes);
app.use("/uat/portal/meter-readings", portalMeterReadingRoutes);
app.use("/uat/portal/app-users", appUsersRoutes);
app.use("/uat/portal/news", portalNewsRoutes);
app.use("/uat/portal/adverts", portalAdvertsRoutes);
app.use("/uat/portal/payments", portalPaymentRoutes);
app.use("/uat/portal/tips", portalTipsRoutes);
app.use("/uat/portal/files", portalFormsRoutes);
app.use("/uat/portal/invoices", portalInvoiceRoutes);
app.use("/uat/portal/towns", portalTownRoutes);
app.use("/uat/portal/suburbs", portalSuburbRoutes);
app.use("/uat/portal/requests", portalRequestRoutes);
app.use("/uat/portal/messages", portalMessagesRoutes);
app.use("/uat/portal/terms-and-conditions", portalTermsAndConditionsRoutes);
app.use("/uat/portal/town-sub", portalTownSubRoutes);

// app routes
app.use("/uat/app/auth", appAuthRoutes);
app.use("/uat/app/user", appUserRoutes);
app.use("/uat/app/notifications", appNotificationRoutes);
app.use("/uat/app/issues", appIssuesRoutes);
app.use("/uat/app/quiz", appQuizRoutes);
app.use("/uat/app/survey", appSurveryRoutes);
app.use("/uat/app/transactions", appTransactionRoutes);
app.use("/uat/app/meter-readings", meterReadingRoutes);
app.use("/uat/app/contact-us", contactUsRoutes);
app.use("/uat/app/news", appNewsRoutes);
app.use("/uat/app/adverts", appAdvertsRoutes);
app.use("/uat/app/tips", appTipRoutes);
app.use("/uat/app/requests", appRequestRoutes);
app.use("/uat/app/files", appFilesRoutes);
app.use("/uat/app/invoices", appInvoiceRoutes);
app.use("/uat/app/towns", appTownRoutes);
app.use("/uat/app/suburbs", appSuburbRoutes);
app.use("/uat/app/messages", appMessagesRoutes);
app.use("/uat/app/postpaid", appBcxRequestRoutes);

// electrician routes
app.use("/uat/electrician/user", electricianRoutes);
app.use("/uat/electrician/notifications", electricianNotificationRoutes);
app.use("/uat/electrician/tasks", electricianTasksRoutes);
app.use("/uat/electrician/auth", electricianAuthRoutes);

app.set("io", io);

io.use((socket, next) => {
  const token = socket.handshake.auth.token;

  if (!token) {
    return next(new Error("No token provided"));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = { id: decoded.id, userType: decoded.userType };
    next();
  } catch (error) {
    next(new Error("Authentication error"));
  }
});

const issueParticipants = {};
const issueAgents = {};
const onlineAgents = new Map();
const onlineUsers = new Map();

io.on("connection", (socket) => {
  console.log("A user has connected:", socket.id);

  try {
    const userId = socket.user.id;
    const userType = socket.user.userType;

    if (userType === "PortalUser") {
      // Add only to onlineAgents
      onlineAgents.set(userId, socket.id);
      console.log(`Portal user ${userId} added to onlineAgents`);
    } else {
      // Add only to onlineUsers
      onlineUsers.set(userId, socket.id);
      console.log(`User ${userId} added to onlineUsers`);
    }

    socket.on("disconnect", () => {
      onlineAgents.delete(userId);
      onlineUsers.delete(socket.id);
      console.log(`User ${userId} disconnected and removed from online agents`);
    });
  } catch (error) {
    socket.emit("error", "Authentication error");
    socket.disconnect();
    return;
  }
socket.on("joinIssueRoom", (issueId) => {
  socket.join(`issue_${issueId}`);
  console.log(`Socket ${socket.id} joined issue_${issueId}`);
});
socket.on("getTotalOnlineUsersCount", (callback) => {
console.log("fghjklkjhgfdfghjklkjhgfghjklkjhgfdfghjkjhgfdfghjklkjhgfdfghjk");
  try {
    const totalOnlineUsersCount = onlineUsers.size;

    return callback({
      status: "SUCCESS",
      totalOnlineUsersCount
    });

  } catch (error) {
    return callback({
      status: "ERROR",
      message: "Failed to get total online users count"
    });
  }
});

const unreadNotificationWhere = {
    [Op.or]: [{ isRead: false }, { isRead: 0 }, { isRead: null }],
  };

  const getMadeForYouUnread = async (userId) => {
    const madeForYouInclude = [
      {
        model: NotificationsModel,
        where: { notificationType: "MadeForYou" },
        required: true,
      },
    ];

    const [unreadCount, notifications] = await Promise.all([
      UserNotifications.count({
        where: { userId, ...unreadNotificationWhere },
        include: madeForYouInclude,
      }),
      UserNotifications.findAll({
        where: { userId },
        include: madeForYouInclude,
        order: [["createdAt", "DESC"]],
      }),
    ]);

    return { unreadCount, notifications };
  };

   const emitMadeForYouCount = async (userId) => {
    const { unreadCount, notifications } = await getMadeForYouUnread(userId);
    const socketId = onlineUsers.get(userId);

    if (socketId) {
      io.to(socketId).emit("madeForYouCountUpdated", {
        unreadCount,
        notifications,
      });
    }
  };

  socket.on("madeForYouCount", async (data, callback) => {
    try {
console.log("Dom", data);
      const userId = data?.userId || socket.user.id;

      const { unreadCount, notifications } = await getMadeForYouUnread(userId);
console.log("here is not made for you", notifications);
      return callback({
        status: "SUCCESS",
        unreadCount,
        notifications,
      });
    } catch (error) {
      console.error("Fetch MadeForYou count error:", error);
      return callback({
        status: "ERROR",
        message: "Failed to fetch MadeForYou notification count.",
      });
    }
  });

  const getNotificationUnreadCount = async (userId) => {
    return UserNotifications.count({
      where: {
        userId,
        [Op.or]: [{ isRead: false }, { isRead: 0 }, { isRead: null }],
      },
      include: [
        {
          model: NotificationsModel,
          where: { notificationType: "notification" },
          required: true,
        },
      ],
    });
  };

  const emitNotificationCount = async (userId) => {
    const unreadCount = await getNotificationUnreadCount(userId);
    const socketId = onlineUsers.get(userId);

    if (socketId) {
      io.to(socketId).emit("notificationCountUpdated", { unreadCount });
    }
  };

  socket.on("notificationCount", async (data, callback) => {
    try {
      const userId = data?.userId || socket.user.id;

      const unreadCount = await getNotificationUnreadCount(userId);

      return callback({
        status: "SUCCESS",
        unreadCount,
      });
    } catch (error) {
      console.error("Fetch notification count error:", error);
      return callback({
        status: "ERROR",
        message: "Failed to fetch notification count.",
      });
    }
  });

  socket.on("sendNotification", async (data, callback) => {
    if (socket.user.userType !== "PortalUser") {
      return callback({
        status: "ERROR",
        message: "Only portal users can send notifications.",
      });
    }

    try {
      let {
        title,
        message,
        scheduledAt,
        town,
        suburb,
        isEvent,
        eventDate,
        eventStart,
        eventEnd,
        image,
      } = data || {};

      if (!title || isEmpty(title)) {
        return callback({
          status: "ERROR",
          message: "Title cannot be blank",
        });
      }

      if (!message || isEmpty(message)) {
        return callback({
          status: "ERROR",
          message: "Message cannot be blank",
        });
      }

      title = CapitalizeFirstLetter(title);
      message = CapitalizeFirstLetter(message);

      const whereClause = { userType: "AppUser" };
      if (town) whereClause.town = town;
      if (suburb) whereClause.suburb_name = suburb;

      const users = await usersModel.findAll({
        attributes: ["id"],
        where: whereClause,
      });
      const anonymousUsers = await AnonymousUsersModel.findAll({
        attributes: ["id"],
      });

      const fcmTokensData = await FcmTokensModel.findAll({
        attributes: ["fcmToken"],
        where: { userId: users.map((u) => u.id) },
      });

      const userTokens = fcmTokensData
        .map((t) => t.fcmToken?.trim())
        .filter(Boolean);
      const allTokens = [...new Set(userTokens)];

      if (!users.length && !anonymousUsers.length) {
        return callback({
          status: "ERROR",
          message: "No users or valid tokens found",
        });
      }

      const notification = await NotificationsModel.create({
        title,
        message,
        image: image || null,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        createdAt: new Date(),
        isEvent,
        eventDate,
        eventStart,
        eventEnd,
        notificationType: "notification",
      });

      const existingUserNotifications = await UserNotifications.findAll({
        where: { notificationId: notification.id },
      });

      let anonNotifications = [];
      if (anonymousUsers.length > 0) {
        const anonNotificationsData = anonymousUsers.map((user) => ({
          userId: user.id,
          title,
          message,
          image: image || null,
          scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
          createdAt: new Date(),
          isEvent: false,
          eventDate: isEvent ? eventDate : null,
          eventStart: isEvent ? eventStart : null,
          eventEnd: isEvent ? eventEnd : null,
          notificationType: "notification",
        }));

        anonNotifications = await AnonymoustNotificationsModel.bulkCreate(
          anonNotificationsData,
          { returning: true },
        );
      }

      const sendNotifications = async () => {
        const newUserNotifications = users
          .filter(
            (u) =>
              !existingUserNotifications.some((n) => n.userId === u.id),
          )
          .map((u) => ({
            userId: u.id,
            notificationId: notification.id,
            createdAt: new Date(),
            isRead: false,
          }));

        if (newUserNotifications.length > 0) {
          await UserNotifications.bulkCreate(newUserNotifications);
        }

        for (const user of users) {
          await emitNotificationCount(user.id);
        }

        if (anonNotifications.length > 0) {
          const anonUserNotificationData = anonNotifications.map((n) => ({
            userId: n.userId,
            notificationId: n.id,
            createdAt: new Date(),
            isRead: false,
          }));
          await AnonymousUserNotifications.bulkCreate(anonUserNotificationData);
        }

        if (allTokens.length > 0) {
          const payload = {
            notification: { title, body: message },
            data: {
              navigationId: "Notifications",
              notificationId: notification.id.toString(),
            },
            tokens: allTokens,
          };

          try {
            const response = await admin.messaging().sendEachForMulticast(
              payload,
            );
            console.log(
              `${response.successCount} push notifications sent successfully`,
            );
          } catch (err) {
            console.error("Error sending push notifications:", err);
          }
        }
      };

      if (scheduledAt) {
        const scheduleDate = new Date(scheduledAt);
        if (scheduleDate <= new Date()) {
          return callback({
            status: "ERROR",
            message: "Scheduled time must be in the future",
          });
        }

        schedule.scheduleJob(scheduleDate, sendNotifications);

        return callback({
          status: "SUCCESS",
          message: `Notification scheduled for ${scheduleDate}`,
          notificationId: notification.id,
          isEvent,
          eventDetails: isEvent
            ? { eventDate, eventStart, eventEnd }
            : null,
        });
      }

      await sendNotifications();

      return callback({
        status: "SUCCESS",
        message: "Notification sent to all users",
        notificationId: notification.id,
      });
    } catch (error) {
      console.error("Send notification error:", error);
      return callback({
        status: "ERROR",
        message: "Failed to send notification: " + error.message,
      });
    }
  });

  socket.on("sendNotificationToMultipleUsers", async (data, callback) => {
    if (socket.user.userType !== "PortalUser") {
      return callback({
        status: "ERROR",
        message: "Only portal users can send notifications to multiple users.",
      });
    }

    try {
      let { userIds, title, message, scheduledAt, image } = data || {};

      if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
        return callback({
          status: "ERROR",
          message: "Please provide a valid user",
        });
      }

      if (!title || isEmpty(title)) {
        return callback({
          status: "ERROR",
          message: "Title cannot be blank",
        });
      }

      if (!message || isEmpty(message)) {
        return callback({
          status: "ERROR",
          message: "Message cannot be blank",
        });
      }

      title = CapitalizeFirstLetter(title);
      message = CapitalizeFirstLetter(message);

      const validUsers = await usersModel.findAll({
        where: { id: userIds, userType: "AppUser" },
        attributes: ["id"],
      });

      if (validUsers.length === 0) {
        return callback({
          status: "ERROR",
          message: "No AppUser users found",
        });
      }

      const validUserIds = validUsers.map((u) => u.id);

      let notification = await NotificationsModel.findOne({
        where: {
          title,
          message,
          scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
          image: image || null,
        },
      });

      if (!notification) {
        notification = await NotificationsModel.create({
          title,
          message,
          image: image || null,
          scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
          createdAt: new Date(),
          notificationType: "MadeForYou",
        });
      }

      const sendNotifications = async () => {
        for (const userId of validUserIds) {
          const exists = await UserNotifications.findOne({
            where: { userId, notificationId: notification.id },
          });

          if (!exists) {
            await UserNotifications.create({
              userId,
              notificationId: notification.id,
              createdAt: new Date(),
              notificationType: "MadeForYou",
              isRead: false,
            });
          }

          await emitMadeForYouCount(userId);

          const fcmToken = await FcmTokensModel.findOne({
            where: { userId },
            attributes: ["fcmToken"],
          });

          if (fcmToken?.fcmToken) {
            const payload = {
              notification: {
                title,
                body: message,
                image: image || undefined,
              },
              data: {
                navigationId: "Notifications",
                notificationId: notification.id.toString(),
                notificationType: "MadeForYou",
              },
              token: fcmToken.fcmToken,
            };

            try {
              await admin.messaging().send(payload);
            } catch (error) {
              console.error(
                `Error sending push notification to ${userId}:`,
                error,
              );
            }
          }
        }
      };

      if (scheduledAt) {
        const scheduleDate = parseISO(scheduledAt);
        if (scheduleDate <= new Date()) {
          return callback({
            status: "ERROR",
            message: "Scheduled time cannot be in the past",
          });
        }

        schedule.scheduleJob(scheduleDate, sendNotifications);

        return callback({
          status: "SUCCESS",
          message: `Notifications scheduled for ${scheduleDate}`,
        });
      }

      await sendNotifications();

      return callback({
        status: "SUCCESS",
        message: "Notifications sent successfully",
        notificationId: notification.id,
      });
    } catch (error) {
      console.error("Send notification to multiple users error:", error);
      return callback({
        status: "ERROR",
        message: "Failed to send notifications: " + error.message,
      });
    }
  });

socket.on("addComment", async (data, callback) => {
  try {
    const { issueId, userId, comment } = data;
    if (!issueId) {
      return callback({
        status: "ERROR",
        message: "Issue ID is required."
      });
    }

    if (!userId) {
      return callback({
        status: "ERROR",
        message: "User ID is required."
      });
    }

    if (!comment) {
      return callback({
        status: "ERROR",
        message: "Comment is required."
      });
    }

    const issueExists = await IssuesModel.findByPk(issueId);
    if (!issueExists) {
      return callback({
        status: "ERROR",
        message: "The issue with the provided ID does not exist."
      });
    }

   let userRecord = await usersModel.findByPk(userId);
      let adminRecord = await User.findByPk(userId);

      if (!userRecord && !adminRecord) {
        return callback({
          status: "ERROR",
          message: "The user with the provided ID does not exist.",
        });
      }

      const firstName = userRecord?.firstName || adminRecord?.firstName;
      const lastName = userRecord?.lastName || adminRecord?.lastName;

      const newComment = await CommentsModel.create({
        issueId,
        user: `${firstName} ${lastName}`,
	userId,
        type: userRecord ? "user": "admin",
        comment,
      });
	if (adminRecord) {
        const lastComment = await CommentsModel.findOne({
          where: { issueId , type: "user"},
          order: [["createdAt", "DESC"]],
        });
console.log("Last commented", lastComment);
        if (lastComment && lastComment.type === "user") {
          const fcmTokenElectrician = await FcmTokensModel.findOne({
            where: {
              userId: lastComment.userId,
            },
          });
console.log("Last commented", lastComment);
          if (fcmTokenElectrician && fcmTokenElectrician.fcmToken) {
            const payload = {
              notification: {
                title: "Issue Update",
                body: "You have received a new comment from an administrator. Open the app to view the comment.",
              },
              data: {
                issueId: String(issueId),
                navigationId: String("Tasks"),
              },
              token: fcmTokenElectrician.fcmToken,
            };
            try {
              const response = await admin.messaging().send(payload);
            } catch (error) {
              console.error("Error sending push notification:", error);
            }
          }
        }
      }
    const fullComment = await CommentsModel.findByPk(newComment.id);
    io.to(`issue_${issueId}`).emit("newComment", fullComment);

    return callback({
      status: "SUCCESS",
      message: "Comment added successfully.",
      data: fullComment
    });

  } catch (error) {
    console.error("Add comment error:", error);

    return callback({
      status: "ERROR",
      message: "Failed to add comment."
    });
  }
});

socket.on("updateComment", async (data, callback) => {
  try {
    const { commentId, newComment, userId } = data;

    if (!commentId) {
      return callback({
        status: "ERROR",
        message: "Comment ID is required.",
      });
    }
    if (!commentId || !newComment) {
      return callback({
        status: "ERROR",
        message: "New comment is required.",
      });
    }

    const commentRecord = await CommentsModel.findByPk(commentId);

    if (!commentRecord) {
      return callback({
        status: "ERROR",
        message: "Comment not found.",
      });
    }

    if (commentRecord.userId != userId) {
      return callback({
        status: "ERROR",
        message: "You are not allowed to edit this comment.",
      });
    }

    const createdAt = new Date(commentRecord.createdAt);
    const now = new Date();

    const diffInMinutes = (now - createdAt) / (1000 * 60);

    if (diffInMinutes > 10) {
      return callback({
        status: "ERROR",
        message: "You can only edit a comment within 10 minutes of posting.",
      });
    }

    commentRecord.comment = newComment;
    await commentRecord.save();
    io.to(`issue_${commentRecord.issueId}`).emit("commentUpdated", commentRecord);

    return callback({
      status: "SUCCESS",
      message: "Comment updated successfully.",
      data: commentRecord,
    });

  } catch (error) {
    console.error("Update comment error:", error);

    return callback({
      status: "ERROR",
      message: "Failed to update comment.",
    });
  }
});

  socket.on("getCommentsByIssue", async (data, callback) => {
  try {
const { issueId } = data;
    if (!issueId) {
      return callback({
        status: "ERROR",
        message: "Issue ID is required"
      });
    }

    const comments = await CommentsModel.findAll({
      where: { issueId },
      order: [["createdAt", "ASC"]]
    });
    return callback({
      status: "SUCCESS",
      totalComments: comments.length,
      comments
    });

  } catch (error) {
    console.error("Fetch comments error:", error);

    return callback({
      status: "ERROR",
      message: "Failed to fetch comments",
      error
    });
  }
});

  socket.on("getSessions", async () => {
    const userId = socket.user.id;
    const userType = socket.user.userType;

    try {
      let allSessions = [];

      const userChatDeletions = await ChatDeletionsModel.findAll({
        where: { userId: userId },
        attributes: ["issueId"],
      });

      const deletedIssueIds = userChatDeletions.map(
        (deletion) => deletion.issueId
      );
      console.log(`User ${userId} has deleted chats:`, deletedIssueIds);

      let whereClause;

      if (userType === "PortalUser") {
        whereClause = {
          [Op.or]: [
            { userId: userId },
            { handlerId: userId },
            { handlerId: { [Op.not]: null } },
            { isAssigned: true },
          ],
        };
      } else {
        whereClause = {
          [Op.or]: [{ userId: userId }, { handlerId: userId }],
        };
      }

      if (deletedIssueIds.length > 0) {
        whereClause.id = { [Op.notIn]: deletedIssueIds };
      }

      const userIssues = await IssuesModel.findAll({
        where: whereClause,
        include: [
          {
            model: User,
            as: "handler",
            attributes: [
              "id",
              "firstName",
              "lastName",
              "email",
              "department",
              "position",
              "profileImage",
            ],
            required: false,
          },
          {
            model: IssueImageModel,
            as: "images",
            attributes: ["id", "imagePath"],
            required: false,
          },
        ],
        order: [["updatedAt", "DESC"]],
      });

      if (userIssues && userIssues.length > 0) {
        const issueIds = userIssues.map((issue) => issue.id);
        const issueMessages = await MessagesModel.findAll({
          where: {
            issueId: { [Op.in]: issueIds },
            deletedAt: null,
          },
          order: [["timestamp", "DESC"]],
        });

        const issueUnreadCounts = await MessagesModel.findAll({
          where: {
            issueId: { [Op.in]: issueIds },
            receiverId: userId,
            isRead: false,
            deletedAt: null,
          },
          attributes: [
            "issueId",
            [sequelize.fn("COUNT", sequelize.col("id")), "unreadCount"],
          ],
          group: ["issueId"],
          raw: true,
        });

        const issueUnreadCountMap = {};
        issueUnreadCounts.forEach((item) => {
          issueUnreadCountMap[item.issueId] = parseInt(item.unreadCount);
        });

        const issueSessions = userIssues.map((issue) => {
          const lastMessage = issueMessages.find((m) => m.issueId === issue.id);

          const handlerInfo = issue.handler
            ? {
                id: issue.handler.id,
                firstName: issue.handler.firstName,
                lastName: issue.handler.lastName,
                fullName: `${issue.handler.firstName} ${issue.handler.lastName}`,
                email: issue.handler.email,
                department: issue.handler.department,
                position: issue.handler.position,
                profileImage: issue.handler.profileImage,
              }
            : null;

          const issueImages = issue.images
            ? issue.images.map((img) => ({
                id: img.id,
                imagePath: img.imagePath,
              }))
            : [];

          return {
            type: "issue",
            id: `issue_${issue.id}`,
            issueId: issue.id,
            title: `Issue #${issue.refNo || issue.id}`,
            lastMessage: lastMessage ? lastMessage.message : "No messages yet.",
            updatedAt: lastMessage ? lastMessage.timestamp : issue.createdAt,
            unreadCount: issueUnreadCountMap[issue.id] || 0,
            handler: handlerInfo,
            issueDetails: {
              id: issue.id,
              issueType: issue.issueType,
              location: issue.location,
              description: issue.description,
              issueImage: issue.issueImage,
              streetName: issue.streetName,
              status: issue.status,
              isAssigned: issue.isAssigned,
              fullName: issue.fullName,
              priority: issue.priority,
              refNo: issue.refNo,
              handlerId: issue.handlerId,
              handler: handlerInfo,
              createdAt: issue.createdAt,
              images: issueImages,
            },
          };
        });

        allSessions = [...allSessions, ...issueSessions];
      }

      let directMessageWhere;

      if (userType === "PortalUser") {
        directMessageWhere = {
          [Op.or]: [
            {
              receiverId: null,
              receiverType: "portal",
              chatType: "direct",
            },
            {
              [Op.or]: [
                sequelize.literal(
                  `Messages.senderId COLLATE utf8mb4_0900_ai_ci = '${userId}'`
                ),
                sequelize.literal(
                  `Messages.receiverId COLLATE utf8mb4_0900_ai_ci = '${userId}'`
                ),
              ],
              chatType: "direct",
            },
          ],
          deletedAt: null,
        };
      } else {
        directMessageWhere = {
          [Op.or]: [
            sequelize.literal(
              `Messages.senderId COLLATE utf8mb4_0900_ai_ci = '${userId}'`
            ),
            sequelize.literal(
              `Messages.receiverId COLLATE utf8mb4_0900_ai_ci = '${userId}'`
            ),
          ],
          chatType: "direct",
          deletedAt: null,
        };
      }

      const directMessages = await MessagesModel.findAll({
        where: directMessageWhere,
        include: [
          {
            model: usersModel,
            as: "sender",
            attributes: ["id", "firstName", "lastName", "profileImage"],
            on: {
              [Op.and]: [
                sequelize.literal(
                  "Messages.senderId COLLATE utf8mb4_0900_ai_ci = sender.id COLLATE utf8mb4_0900_ai_ci"
                ),
              ],
            },
          },
          {
            model: usersModel,
            as: "receiver",
            attributes: ["id", "firstName", "lastName", "profileImage"],
            on: {
              [Op.and]: [
                sequelize.literal(
                  "Messages.receiverId COLLATE utf8mb4_0900_ai_ci = receiver.id COLLATE utf8mb4_0900_ai_ci"
                ),
              ],
            },
          },
        ],
        order: [["timestamp", "DESC"]],
      });

      const conversationMap = new Map();
      directMessages.forEach((message) => {
        let conversationKey;
        let conversationTitle;
        let otherUser;

        if (message.conversationId) {
          conversationKey = message.conversationId;
          otherUser =
            message.senderId === userId ? message.sender : message.receiver;
          conversationTitle = otherUser
            ? `${otherUser.firstName} ${otherUser.lastName}`
            : "Unknown User";
        } else if (
          message.receiverId === null &&
          message.receiverType === "portal"
        ) {
          conversationKey = `broadcast_${message.senderId}`;
          conversationTitle = message.sender
            ? `${message.sender.firstName} ${message.sender.lastName}`
            : "Customer Support";
          otherUser = message.sender;
        } else {
          return;
        }

        if (!conversationMap.has(conversationKey)) {
          conversationMap.set(conversationKey, {
            type: "direct",
            id: conversationKey,
            conversationId: message.conversationId,
            title: conversationTitle,
            lastMessage: message.message,
            updatedAt: message.timestamp,
            unreadCount: 0,
            otherUser: otherUser,
            messages: [],
          });
        }

        const conversation = conversationMap.get(conversationKey);

        if (message.timestamp > new Date(conversation.updatedAt)) {
          conversation.lastMessage = message.message;
          conversation.updatedAt = message.timestamp;
        }

        if (!message.isRead && message.receiverId === userId) {
          conversation.unreadCount++;
        }
        conversation.messages.push(message);
      });

      const directSessions = Array.from(conversationMap.values());

      allSessions = [...allSessions, ...directSessions];

      if (userType === "PortalUser") {
        const unassignedIssues = await IssuesModel.findAll({
          where: {
            [Op.or]: [
              { handlerId: null },
              { handlerId: "" },
              { isAssigned: false },
            ],
          },
          include: [
            {
              model: IssueImageModel,
              as: "images",
              attributes: ["id", "imagePath"],
              required: false,
            },
          ],
          order: [["updatedAt", "DESC"]],
        });

        if (unassignedIssues && unassignedIssues.length > 0) {
          const unassignedIssueIds = unassignedIssues.map((issue) => issue.id);

          const unassignedMessages = await MessagesModel.findAll({
            where: {
              issueId: { [Op.in]: unassignedIssueIds },
              deletedAt: null,
            },
            order: [["timestamp", "DESC"]],
          });

          const unassignedUnreadCounts = await MessagesModel.findAll({
            where: {
              issueId: { [Op.in]: unassignedIssueIds },
              receiverType: "portal",
              isRead: false,
              deletedAt: null,
            },
            attributes: [
              "issueId",
              [sequelize.fn("COUNT", sequelize.col("id")), "unreadCount"],
            ],
            group: ["issueId"],
            raw: true,
          });

          const unassignedUnreadCountMap = {};

          unassignedUnreadCounts.forEach((item) => {
            unassignedUnreadCountMap[item.issueId] = parseInt(item.unreadCount);
          });

          const unassignedSessions = unassignedIssues.map((issue) => {
            const lastMessage = unassignedMessages.find(
              (m) => m.issueId === issue.id
            );

            const issueImages = issue.images
              ? issue.images.map((img) => ({
                  id: img.id,
                  imagePath: img.imagePath,
                }))
              : [];

            return {
              type: "unassigned",
              id: `unassigned_${issue.id}`,
              issueId: issue.id,
              title: `[UNASSIGNED] Issue #${issue.refNo || issue.id}`,
              lastMessage: lastMessage
                ? lastMessage.message
                : "No messages yet.",
              updatedAt: lastMessage ? lastMessage.timestamp : issue.createdAt,
              unreadCount: unassignedUnreadCountMap[issue.id] || 0,
              handler: null,
              issueDetails: {
                id: issue.id,
                issueType: issue.issueType,
                location: issue.location,
                description: issue.description,
                issueImage: issue.issueImage,
                streetName: issue.streetName,
                status: issue.status,
                isAssigned: issue.isAssigned,
                fullName: issue.fullName,
                priority: issue.priority,
                refNo: issue.refNo,
                handlerId: issue.handlerId,
                handler: null,
                createdAt: issue.createdAt,
                images: issueImages,
              },
            };
          });

          allSessions = [...allSessions, ...unassignedSessions];
        }

        const generalUnassignedMessages = await MessagesModel.findAll({
          where: {
            receiverType: "portal",
            receiverId: null,
            issueId: null,
            chatType: { [Op.ne]: "direct" },
            deletedAt: null,
          },
          include: [
            {
              model: usersModel,
              as: "sender",
              attributes: ["id", "firstName", "lastName", "profileImage"],
              on: {
                [Op.and]: [
                  sequelize.literal(
                    "Messages.senderId COLLATE utf8mb4_0900_ai_ci = sender.id COLLATE utf8mb4_0900_ai_ci"
                  ),
                ],
              },
            },
          ],
          order: [["timestamp", "DESC"]],
        });

        const unassignedConversationMap = new Map();

        generalUnassignedMessages.forEach((message) => {
          const conversationKey = `unassigned_general_${message.senderId}`;
          const conversationTitle = message.sender
            ? `[UNASSIGNED] ${message.sender.firstName} ${message.sender.lastName}`
            : "[UNASSIGNED] Unknown User";

          if (!unassignedConversationMap.has(conversationKey)) {
            unassignedConversationMap.set(conversationKey, {
              type: "unassigned_general",
              id: conversationKey,
              title: conversationTitle,
              lastMessage: message.message,
              updatedAt: message.timestamp,
              unreadCount: 0,
              sender: message.sender,
              messages: [],
            });
          }

          const conversation = unassignedConversationMap.get(conversationKey);

          if (message.timestamp > new Date(conversation.updatedAt)) {
            conversation.lastMessage = message.message;
            conversation.updatedAt = message.timestamp;
          }

          if (!message.isRead) {
            conversation.unreadCount++;
          }
          conversation.messages.push(message);
        });

        const generalUnassignedSessions = Array.from(
          unassignedConversationMap.values()
        );

        allSessions = [...allSessions, ...generalUnassignedSessions];
      }

      allSessions.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

      console.log(
        `Returning ${allSessions.length} total sessions for user ${userId} (userType: ${userType})`
      );
      socket.emit("sessionsList", allSessions);
    } catch (err) {
      console.error("🔥 Error fetching sessions:", err);
      socket.emit("error", "Failed to fetch sessions");
    }
  });

  socket.on("getUnreadChatCount", async (data, callback) => {
    try {
      // Extract userId from auth token
      const userId = socket.user?.id || socket.userId; // Assuming user info is attached to socket during auth
      const { userType } = data; // userType: 'app' or 'portal'

      if (!userId || !userType) {
        return callback({
          success: false,
          error: "Authentication required and userType must be provided",
        });
      }

      let whereClause = {
        receiverId: userId,
        receiverType: userType,
        isRead: false,
      };

      // Query to get count of chats with unread messages
      const unreadChatCount = await MessagesModel.count({
        where: {
          [Op.and]: [
            {
              [Op.or]: [
                { receiverId: userId, receiverType: userType },
                { senderId: userId, senderType: userType },
              ],
            },
            { isRead: false },
            // Only count messages where the user is the receiver (unread messages sent TO them)
            { receiverId: userId, receiverType: userType },
          ],
        },
        distinct: true,
        col: "conversationId", // Count distinct conversations, not individual messages
      });

      // Alternative approach: Get count of unique conversations with unread messages
      const unreadConversations = await MessagesModel.findAll({
        attributes: [
          [
            sequelize.fn("DISTINCT", sequelize.col("conversationId")),
            "conversationId",
          ],
        ],
        where: {
          receiverId: userId,
          receiverType: userType,
          isRead: false,
          conversationId: { [Op.not]: null },
        },
        raw: true,
      });

      // For issue-based chats, also count by issueId if conversationId is null
      const unreadIssueChats = await MessagesModel.findAll({
        attributes: [
          [sequelize.fn("DISTINCT", sequelize.col("issueId")), "issueId"],
        ],
        where: {
          receiverId: userId,
          receiverType: userType,
          isRead: false,
          conversationId: null,
          issueId: { [Op.not]: null },
        },
        raw: true,
      });

      const totalUnreadChats =
        unreadConversations.length + unreadIssueChats.length;

      callback({
        success: true,
        data: {
          unreadChatCount: totalUnreadChats,
          unreadConversations: unreadConversations.length,
          unreadIssueChats: unreadIssueChats.length,
        },
      });
    } catch (error) {
      console.error("Error getting unread chat count:", error);
      callback({
        success: false,
        error: "Failed to retrieve unread chat count",
      });
    }
  });

  socket.on("getAppUsers", async () => {
    if (socket.user.userType !== "PortalUser") {
      return socket.emit(
        "error",
        "Only portal users can access app user list."
      );
    }

    try {
      const appUsers = await usersModel.findAll({
        where: {
          userType: { [Op.or]: ["customer", "AppUser", null] },
        },
        attributes: ["id", "firstName", "lastName", "email", "profileImage"],
        order: [["firstName", "ASC"]],
      });

      socket.emit("appUsersList", appUsers);
    } catch (error) {
      console.error("Error fetching app users:", error);
      socket.emit("error", "Failed to fetch app users.");
    }
  });

  socket.on("markDirectAsRead", async ({ conversationId, otherUserId }) => {
    const userId = socket.user.id;

    try {
      if (conversationId) {
        await MessagesModel.update(
          { isRead: true },
          {
            where: {
              conversationId: conversationId,
              receiverId: userId,
              isRead: false,
            },
          }
        );
      } else if (otherUserId === null) {
        // Handle broadcast message reads - this is tricky
        // You might need a separate table to track which portal agents have read which broadcast messages
        console.log(`Marking broadcast messages as read for user ${userId}`);
      }

      console.log(`Marked direct messages as read for user ${userId}`);
    } catch (error) {
      console.error("Error marking direct messages as read:", error);
    }
  });

  socket.on("deleteMessage", async (data) => {
    try {
      const { messageId, issueId } = data;
      const userId = socket.user.id;

      console.log(messageId);

      // Find the message to delete
      const message = await MessagesModel.findOne({
        where: {
          id: messageId,
          deletedAt: null, // Only find non-deleted messages
        },
      });

      if (!message) {
        return socket.emit("error", "Message not found or already deleted.");
      }

      // Check authorization
      if (message.senderId !== userId && socket.user.userType !== "admin") {
        return socket.emit(
          "error",
          "You are not authorized to delete this message."
        );
      }

      if (message.issueId !== issueId) {
        return socket.emit("error", "Message does not belong to this issue.");
      }

      // Optional: Check message age for non-admin users
      const messageAge = new Date() - new Date(message.createdAt);
      const maxDeleteAge = 24 * 60 * 60 * 1000; // 24 hours

      if (messageAge > maxDeleteAge && socket.user.userType !== "admin") {
        return socket.emit("error", "This message is too old to delete.");
      }

      // Soft delete the message
      await MessagesModel.update(
        {
          deletedAt: new Date(),
          deletedBy: userId,
        },
        {
          where: {
            id: messageId,
            deletedAt: null,
          },
        }
      );

      console.log(`Message ${messageId} soft deleted by user ${userId}`);

      // Notify about the deletion
      const deletionInfo = {
        messageId: messageId,
        issueId: issueId,
        deletedBy: userId,
        deletedAt: new Date(),
      };

      socket.emit("messageDeleted", {
        ...deletionInfo,
        success: true,
      });

      socket.broadcast
        .to(`issue-${issueId}`)
        .emit("messageDeleted", deletionInfo);

      // Update session information
      const lastMessage = await MessagesModel.findOne({
        where: {
          issueId: issueId,
          deletedAt: null, // Only consider non-deleted messages
        },
        order: [["timestamp", "DESC"]],
      });

      const issue = await IssuesModel.findByPk(issueId);

      // Update unread counts (deleted messages shouldn't count as unread)
      const getUnreadCount = async (userId, issueId) => {
        const count = await MessagesModel.count({
          where: {
            issueId: issueId,
            receiverId: userId,
            isRead: false,
            deletedAt: null, // Don't count deleted messages
          },
        });
        return count;
      };

      const createSessionUpdate = async (userId) => {
        const unreadCount = await getUnreadCount(userId, issueId);

        return {
          issueId,
          lastMessage: lastMessage ? lastMessage.message : "No messages yet.",
          updatedAt: lastMessage ? lastMessage.timestamp : issue.createdAt,
          unreadCount: unreadCount,
          issueDetails: {
            id: issue.id,
            issueType: issue.issueType,
            location: issue.location,
            description: issue.description,
            issueImage: issue.issueImage,
            streetName: issue.streetName,
            userId: issue.userId,
            electricianId: issue.electricianId,
            status: issue.status,
            isAssigned: issue.isAssigned,
            fullName: issue.fullName,
            priority: issue.priority,
            refNo: issue.refNo,
            handlerId: issue.handlerId,
            createdAt: issue.createdAt,
            updatedAt: issue.updatedAt,
          },
        };
      };

      // Send updated session info to all relevant users
      const participants = issueParticipants[issueId] || [];

      for (const participant of participants) {
        const sessionUpdate = await createSessionUpdate(participant.id);
        io.to(participant.socketId).emit("sessionUpdate", sessionUpdate);
      }

      if (issue.userId !== userId) {
        const appSocketId = [...onlineUsers].find(
          ([socketId, uId]) => uId === issue.userId
        )?.[0];
        if (appSocketId) {
          const sessionUpdate = await createSessionUpdate(issue.userId);
          io.to(appSocketId).emit("sessionUpdate", sessionUpdate);
        }
      }

      if (issue.handlerId && issue.handlerId !== userId) {
        const agentSocketId = onlineAgents.get(issue.handlerId);
        if (agentSocketId) {
          const sessionUpdate = await createSessionUpdate(issue.handlerId);
          io.to(agentSocketId).emit("sessionUpdate", sessionUpdate);
        }
      }
    } catch (err) {
      console.error("Error in deleteMessage:", err);
      socket.emit("error", "An error occurred while deleting the message.");
    }
  });

  socket.on("deleteChat", async (data) => {
    try {
      const { issueId } = data;
      const userId = socket.user.id;

      console.log(
        `Delete chat request - IssueId: ${issueId}, UserId: ${userId}`
      );

      // Find the issue to verify it exists and get participants
      const issue = await IssuesModel.findByPk(issueId);
      if (!issue) {
        console.log(`Issue ${issueId} not found`);
        return socket.emit("error", "Chat not found.");
      }

      // Check authorization - only participants can delete the chat
      const isAuthorized =
        issue.userId === userId ||
        issue.handlerId === userId ||
        socket.user.userType === "PortalUser";

      if (!isAuthorized) {
        console.log(
          `Authorization failed - UserId: ${userId} not authorized for issue ${issueId}`
        );
        return socket.emit(
          "error",
          "You are not authorized to delete this chat."
        );
      }

      // Check if there are any messages for this issue
      const messageCount = await MessagesModel.count({
        where: {
          issueId: issueId,
          deletedAt: null,
        },
      });

      if (messageCount === 0) {
        return socket.emit("error", "No messages found for this chat.");
      }

      // Check if already deleted by this user
      const existingDeletion = await ChatDeletionsModel.findOne({
        where: {
          userId: userId,
          issueId: issueId,
        },
      });

      if (existingDeletion) {
        return socket.emit("error", "Chat has already been deleted.");
      }

      // Create deletion record - this marks the chat as deleted for this user
      // but doesn't actually delete any messages from the database
      await ChatDeletionsModel.create({
        userId: userId,
        issueId: issueId,
        deletedAt: new Date(),
      });

      console.log(
        `Chat ${issueId} marked as deleted by user ${userId} - messages preserved in database`
      );

      // Notify the user that the chat was deleted
      socket.emit("chatDeleted", {
        issueId: issueId,
        deletedBy: userId,
        deletedAt: new Date(),
        success: true,
        messageCount: messageCount, // Let them know how many messages were in the chat
      });

      // Leave the chat room
      socket.leave(`issue-${issueId}`);

      // Remove from participants list
      if (issueParticipants[issueId]) {
        issueParticipants[issueId] = issueParticipants[issueId].filter(
          (participant) => participant.id !== userId
        );
      }

      // Optional: Notify other participants that this user left
      // (but don't tell them the chat was deleted, as it's user-specific)
      socket.broadcast.to(`issue-${issueId}`).emit("userLeftChat", {
        issueId: issueId,
        userId: userId,
      });

      console.log(
        `User ${userId} deleted chat ${issueId} from their view - ${messageCount} messages preserved`
      );
    } catch (err) {
      console.error("Error in deleteChat:", err);
      console.error("Error stack:", err.stack);
      socket.emit("error", "An error occurred while deleting the chat.");
    }
  });

  // MODIFIED: Updated joinChat to mark messages as read
  socket.on("joinChat", async ({ issueId, userType }) => {
    const userId = socket.user.id;
    socket.join(`issue-${issueId}`);
    console.log(`User ${userId} joined chat room for issue ${issueId}`);

    if (!issueParticipants[issueId]) {
      issueParticipants[issueId] = [];
    }

    const alreadyInRoom = issueParticipants[issueId].some(
      (p) => p.id === userId
    );

    if (!alreadyInRoom) {
      issueParticipants[issueId].push({
        id: userId,
        type: userType,
        socketId: socket.id,
      });
    }

    try {
      // Mark messages as read when joining chat
      await MessagesModel.update(
        { isRead: true },
        {
          where: {
            issueId: issueId,
            receiverId: userId,
            isRead: false,
          },
        }
      );

      const messages = await MessagesModel.findAll({
        where: { issueId, deletedAt: null },
        order: [["timestamp", "ASC"]],
      });

      socket.emit("chatHistory", messages);

      // Emit updated session info with unread count reset to 0
      socket.emit("sessionUpdate", {
        issueId,
        lastMessage:
          messages.length > 0
            ? messages[messages.length - 1].message
            : "No messages yet.",
        updatedAt:
          messages.length > 0
            ? messages[messages.length - 1].timestamp
            : new Date(),
        unreadCount: 0,
      });
    } catch (error) {
      console.error("Error fetching chat history:", error);
      socket.emit("error", {
        message: "Error fetching chat history. Please try again later.",
      });
    }
  });

  socket.on("markAsRead", async ({ issueId }) => {
    const userId = socket.user.id;
    try {
      await MessagesModel.update(
        { isRead: true },
        {
          where: {
            issueId: issueId,
            receiverId: userId,
            isRead: false,
          },
        }
      );

      console.log(
        `Marked messages as read for user ${userId} in issue ${issueId}`
      );
    } catch (error) {
      console.error("Error marking messages as read:", error);
    }
  });

  socket.on("sendMessage", async (data) => {
    try {
      const { issueId, senderType, message } = data;
      const senderId = socket.user.id;

      const issue = await IssuesModel.findByPk(issueId);
      if (!issue) {
        return socket.emit("error", "Issue not found.");
      }

      if (issue.status === "Completed") {
        return socket.emit(
          "error",
          "This issue has already been completed. No further messages can be sent."
        );
      }

      let receiverId = null;
      let receiverType = null;
      let shouldBroadcastToAllPortalUsers = false;

      if (senderType === "app") {
        receiverType = "portal";
        if (issue.handlerId) {
          receiverId = issue.handlerId;
        } else {
          receiverId = null;
          shouldBroadcastToAllPortalUsers = true;
        }
      } else {
        receiverType = "app";
        receiverId = issue.userId;

        if (!issue.handlerId) {
          await IssuesModel.update(
            { handlerId: senderId },
            { where: { id: issueId } }
          );
          console.log(
            `Portal user ${senderId} is now assigned as handler for issue ${issueId}`
          );
        } else if (issue.handlerId !== senderId) {
          return socket.emit(
            "error",
            "Another agent is already handling this issue."
          );
        }
      }

      const newMessage = await MessagesModel.create({
        issueId,
        senderId,
        receiverId,
        senderType,
        receiverType,
        message,
        isRead: false,
      });
      
      const userToken = await FcmTokensModel.findOne({
        where: {
          userId: receiverId,
        },
      });
      console.log("Current user with token: ", userToken)

      if (userToken && userToken.fcmToken) {
        const payload = {
          notification: {
            title: "New Message",
            body: message,
          },
          data: {
            issueId: String(issueId),
            navigationId: String("Messages"),
          },
          token: userToken.fcmToken,
        };
        try {
          const response = await admin.messaging().send(payload);
        } catch (error) {
          console.error("Error sending push notification:", error);
          if (
    error.code === 'messaging/registration-token-not-registered' ||
    error.code === 'messaging/invalid-argument'
  ) {
    await FcmTokensModel.destroy({
      where: { userId: receiverId, fcmToken: userToken.fcmToken },
    });
    console.log(`Removed invalid FCM token for user ${receiverId}`);
  }
        }
      }

      console.log("New message created:", newMessage.toJSON());
      socket.emit("messageSent", newMessage);

      const sender = await usersModel.findByPk(senderId, {
        attributes: ["firstName", "lastName"],
      });
      const senderName = sender
        ? `${sender.firstName} ${sender.lastName}`
        : "Unknown User";

      const getUnreadCount = async (userId, issueId) => {
        const count = await MessagesModel.count({
          where: {
            issueId: issueId,
            receiverId: userId,
            isRead: false,
          },
        });
        return count;
      };

      if (shouldBroadcastToAllPortalUsers) {
        socket.broadcast.to(`issue-${issueId}`).emit("receiveMessage", {
          ...newMessage.toJSON(),
          isNewIssue: true,
        });

        for (const [agentId, socketId] of onlineAgents) {
          const agentSocket = io.sockets.sockets.get(socketId);
          if (agentSocket && !agentSocket.rooms.has(`issue-${issueId}`)) {
            io.to(socketId).emit("receiveMessage", {
              ...newMessage.toJSON(),
              isNewIssue: true,
            });
          }
        }

        for (const [agentId, socketId] of onlineAgents) {
          const unreadCount = await getUnreadCount(agentId, issueId);
          io.to(socketId).emit("sessionUpdate", {
            issueId,
            lastMessage: newMessage.message,
            updatedAt: newMessage.timestamp || new Date(),
            isNewIssue: true,
            unreadCount: unreadCount,
          });
        }

        socket.emit("sessionUpdate", {
          issueId,
          lastMessage: newMessage.message,
          updatedAt: newMessage.timestamp || new Date(),
          isNewIssue: true,
          unreadCount: 0,
        });
      } else {
        socket.broadcast
          .to(`issue-${issueId}`)
          .emit("receiveMessage", newMessage);

        if (receiverType === "app") {
          const appSocketId = [...onlineUsers].find(
            ([socketId, userId]) => userId === receiverId
          )?.[0];

          if (appSocketId) {
            const appSocket = io.sockets.sockets.get(appSocketId);

            if (appSocket) {
              const inChatRoom = appSocket.rooms.has(`issue-${issueId}`);

              if (!inChatRoom) {
                const unreadCount = await getUnreadCount(receiverId, issueId);
                io.to(appSocketId).emit("sessionUpdate", {
                  issueId,
                  lastMessage: newMessage.message,
                  updatedAt: newMessage.timestamp || new Date(),
                  unreadCount: unreadCount,
                });

                await sendMessageNotification(
                  receiverId,
                  senderName,
                  message,
                  issueId
                );
              } else {
                await MessagesModel.update(
                  { isRead: true },
                  { where: { id: newMessage.id } }
                );
              }
            }
          } else {
            await sendMessageNotification(
              receiverId,
              senderName,
              message,
              issueId
            );
          }
        } else if (receiverType === "portal") {
          const agentSocketId = onlineAgents.get(receiverId);
          if (agentSocketId) {
            const agentSocket = io.sockets.sockets.get(agentSocketId);

            if (agentSocket && !agentSocket.rooms.has(`issue-${issueId}`)) {
              const unreadCount = await getUnreadCount(receiverId, issueId);
              io.to(agentSocketId).emit("sessionUpdate", {
                issueId,
                lastMessage: newMessage.message,
                updatedAt: newMessage.timestamp || new Date(),
                unreadCount: unreadCount,
              });
            } else if (
              agentSocket &&
              agentSocket.rooms.has(`issue-${issueId}`)
            ) {
              await MessagesModel.update(
                { isRead: true },
                { where: { id: newMessage.id } }
              );
            }
          }
        }
      }
    } catch (err) {
      console.error("Error in sendMessage:", err);
      socket.emit("error", "An error occurred while sending the message.");
    }
  });

  socket.on("joinUnhandledIssues", async () => {
    if (socket.user.userType !== "PortalUser") {
      return socket.emit(
        "error",
        "Only portal users can join unhandled issues."
      );
    }

    try {
      const unhandledIssues = await IssuesModel.findAll({
        where: {
          handlerId: null,
          status: { [Op.ne]: "Completed" },
        },
      });

      unhandledIssues.forEach((issue) => {
        socket.join(`issue-${issue.id}`);
      });

      console.log(
        `Portal user ${socket.user.id} joined ${unhandledIssues.length} unhandled issue rooms`
      );
    } catch (error) {
      console.error("Error joining unhandled issues:", error);
      socket.emit("error", "Failed to join unhandled issues.");
    }
  });
});

const PORT = process.env.PORT;

schedule.scheduleJob("*/30 * * * *", async () => {
  console.log("Running task every 30 minutes...");

  const allIssueInPendingAndAssigned = await IssuesModel.findAll({
    where: {
      status: 'Pending',
      isAssigned: true,
      [Op.or]: [
        { finalReason: null },
        { finalReason: "" }
      ]
    }
  });

for (const issue of allIssueInPendingAndAssigned) {
    const fcmTokens = await FcmTokensModel.findAll({
      where: { userId: issue.electricianId }
    });

    for (const tokenRecord of fcmTokens) {
      if (tokenRecord.fcmToken) {
        const payload = {
          notification: {
            title: "New Task Assigned",
            body: "You have a new task assigned. Please check your tasks."
          },
          data: {
            issueId: String(issue.id),
            navigationId: 'Tasks',
          },
          token: tokenRecord.fcmToken
        };

        try {
          const response = await admin.messaging().send(payload);
          console.log(`Push notification sent to electrician ${issue.electricianId}`, response);
        } catch (error) {
    if (error.code === 'messaging/registration-token-not-registered') {
        console.warn(`FCM token not registered, deleting: ${tokenRecord.fcmToken}`);
        await FcmTokensModel.destroy({ where: { id: tokenRecord.id } });
    } else {
        console.error('Error sending push notification:', error);
    }
}
      }
    }
  }
}); 


schedule.scheduleJob("0 8 * * *", async () => {
  console.log("Running daily cutoff warning notification check...");
  await sendCutoffWarningNotifications();
});

schedule.scheduleJob("0 8 * * *", async () => {
  console.log("Running daily payment reminder notification check...");
  await sendPaymentReminders();
});

schedule.scheduleJob("0 8 * * *", async () => {
  console.log("Running daily service interruption notification check...");
  await sendServiceInterruptionNotifications();
});

// (async () => {
//     console.log('Manually testing cutoff notifications...');
//     await sendCutoffWarningNotifications();
// })();

// (async () => {
//     console.log('Manually testing pending payments notifications...');
//     await sendPaymentReminders()
// })();

// (async () => {
//     console.log('Manually testing cutoff notifications...');
//     await sendServiceInterruptionNotifications()
// })();

schedule.scheduleJob("0 0 1 * *", async () => {
  try {
    await fetchAndExtractInvoices();
    console.log("Monthly invoice extraction job completed successfully.");
  } catch (error) {
    console.error("Error during monthly invoice extraction job:", error);
  }
});

// (async () => {
//     console.log('Testing invoice fetching...');
//     await fetchAndExtractInvoices()
//     console.log('Invoice fetching test completed.');
// })()

// (async () => {
//     console.log('Testing invoice fetching...');
//     await fetchAndExtractInvoices()
//     console.log('Invoice fetching test completed.');
// })()


//const port = 443;

//httpsServer.listen (port, () => {
//console. log(`BACKEND SERVER STARTED ON PORT :: ${port}`);
//});

server.listen(process.env.PORT, () => {
  console.log(`Server is running on port ${process.env.PORT}`);
});
