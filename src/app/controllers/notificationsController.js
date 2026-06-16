const AnonymousTokensModel = require('../../common/models/AnonymousTokensModel')
const usersModel = require('../../common/models/usersModel')
const UserNotifications = require('../../common/models/UsersNotificationModel')
const NotificationsModel = require('../../portal/models/NotificationsModel')
const { isEmpty } = require('../../common/services/utils')
const FcmTokensModel = require('../../common/models/fcmTokensModel')
const { Op, where } = require('sequelize')
const AnonymoustNotificationsModel = require('../../common/models/anonymousNotificationsModel')
const AnonymousUsersModel = require('../../common/models/anonymousUsers')
const AnonymousUserNotifications = require('../../common/models/anonymousUserNotifications')

usersModel.hasMany(UserNotifications, { foreignKey: 'userId' })

exports.getNotifications = async (req, res) => {
  const userId = req.user.id;
  const { page = 1, limit = 10 } = req.query;

  try {
    // Validate pagination params
    const pageNumber = parseInt(page, 10);
    const limitNumber = parseInt(limit, 10);

    if (pageNumber < 1 || limitNumber < 1) {
      return res.status(400).json({
        status: "FAILED",
        message: "Page and limit must be positive numbers",
      });
    }

    const offset = (pageNumber - 1) * limitNumber;

    // Validate user
    const user = await usersModel.findOne({
      where: {
        id: userId,
        status: "active",
      },
      attributes: ["id", "firstName", "lastName", "email"],
    });

    if (!user) {
      return res.status(404).json({
        status: "FAILED",
        message: "User not found",
      });
    }

    // 🔹 Fetch notifications + total count
    const { rows: notifications, count: totalNotifications } =
      await UserNotifications.findAndCountAll({
        where: { userId },
        include: [
          {
            model: NotificationsModel,
            where: {
              notificationType: {
                [Op.in]: ["notification", "News", "vending", "Quiz"],
              },
            },
          },
        ],
        attributes: ["createdAt", "isRead"],
        order: [["createdAt", "DESC"]],
        limit: limitNumber,
        offset,
      });

    const totalPages = Math.ceil(totalNotifications / limitNumber);

    return res.status(200).json({
      status: "SUCCESS",
      message: "User notifications retrieved successfully",
      user,
      data: notifications,
      pagination: {
        currentPage: pageNumber,
        totalPages,
        totalNotifications,
        limit: limitNumber,
        hasNextPage: pageNumber < totalPages,
        hasPreviousPage: pageNumber > 1,
      },
    });
  } catch (error) {
    console.error("Error retrieving notifications for user:", error);
    res.status(500).json({
      status: "FAILED",
      message: "Internal server error: " + error.message,
    });
  }
};

exports.getMadeForYouNotifications = async (req, res) => {
    const userId = req.user.id;

    try {
        const notifications = await UserNotifications.findAll({
            where: { userId },
            include: [
                {
                    model: NotificationsModel,
                    where: { notificationType: 'MadeForYou' }
                }
            ],
            attributes: ['createdAt', 'isRead'],
            order: [['createdAt', 'DESC']]
        });

        res.status(200).json({
            status: "SUCCESS",
            message: 'MadeForYou notifications retrieved successfully',
            notifications
        });
    } catch (error) {
        console.error('Error retrieving MadeForYou notifications:', error);
        res.status(500).json({
            status: 'FAILED',
            message: 'Internal server error: ' + error.message
        });
    }
};

exports.getAnonymousNotifications = async (req, res) => {
  const userId = req.user.id;
  const { page = 1, limit = 10 } = req.query;

  try {
    // Validate pagination params
    const pageNumber = parseInt(page, 10);
    const limitNumber = parseInt(limit, 10);

    if (pageNumber < 1 || limitNumber < 1) {
      return res.status(400).json({
        status: "FAILED",
        message: "Page and limit must be positive numbers",
      });
    }

    const offset = (pageNumber - 1) * limitNumber;

    // Fetch notifications + total count
    const { rows: notifications, count: totalNotifications } =
      await AnonymoustNotificationsModel.findAndCountAll({
        where: { userId },
        order: [["createdAt", "DESC"]],
        limit: limitNumber,
        offset,
      });

    const totalPages = Math.ceil(totalNotifications / limitNumber);

    return res.status(200).json({
      status: "SUCCESS",
      message: "User notifications retrieved successfully",
      data: notifications,
      pagination: {
        currentPage: pageNumber,
        totalPages,
        totalNotifications,
        limit: limitNumber,
        hasNextPage: pageNumber < totalPages,
        hasPreviousPage: pageNumber > 1,
      },
    });
  } catch (error) {
    console.error("Error retrieving anonymous notifications:", error);
    res.status(500).json({
      status: "FAILED",
      message: "Internal server error: " + error.message,
    });
  }
};

exports.getNotificationCountAnonymous = async (req, res) => {
    const userId = req.user.id
    console.log("My unlogged in user: ", userId);
    try{
        const notificationCount = await AnonymousUserNotifications.count({
             where: {
                userId: userId,
                isRead: false
            },
        });
        res.status(200).json({
            status: 'SUCCESS',
            message: 'Notification count successfully retrieved',
            count: notificationCount
        })
    }catch (error) {
        console.error('Error retrieving notifications for user:', error)
        res.status(500).json({
            status: 'FAILED',
            message: 'Internal server error' + error.message
        })
    }
}


exports.addAnonymousUser = async (req, res) => {
    const { userId } = req.body

    try {
        if (!userId || isEmpty(userId)) {
            return res.status(400).json({
                status: 'FAILED',
                message: 'User ID cannot be blank'
            });
        }

        const existingUser = await AnonymousUsersModel.findOne({ where: { id: userId } });

        if (existingUser) {
            return res.status(404).json({
                status: 'FAILED',
                message: 'User not found'
            });
        }

        await AnonymousUsersModel.create({ id: userId });

        res.status(201).json({
            status: 'SUCCESS',
            message: 'Anonymous user added successfully'
        });
    } catch (error) {
        console.error('Error adding anonymous user:', error)
        return res.status(500).json({
            status: 'FAILED',
            message: 'Internal server error'
        })
    }
}

exports.getNotificationCount = async (req, res) => {
    const userId = req.user.id
    try {
        const notificationCount = await UserNotifications.count({
            where: {
                userId: userId,
                isRead: 0
            },
            include: [
                {
                    model: NotificationsModel,
                    where: {
                        notificationType: {
                            [Op.in]: ["notification", "News", "vending", "Quiz"]
                        }
                    }
                }
            ],
        })

        res.status(200).json({
            status: 'SUCCESS',
            message: 'Notification count successfully retrieved',
            count: notificationCount
        })
    } catch (error) {
        console.error('Error retrieving the notification count:', error)
        res.status(500).json({
            status: 'FAILED',
            message: 'Internal server error' + error.message
        })
    }
}

exports.markNotificationAsRead = async (req, res) => {
    const userId = req.user.id;
    const { notificationId } = req.params;

    if (!notificationId) {
        return res.status(400).json({
            status: "FAILED",
            message: "Notification paramter missing."
        });
    }

    try {
        const userNotification = await UserNotifications.findOne({
            where: {
                userId: userId,
                notificationId: notificationId
            }
        })

        if (!userNotification) {
            return res.status(404).json({
                status: 'FAILED',
                message: 'Notification not found'
            })
        }

        userNotification.isRead = 1
        await userNotification.save()

        res.status(200).json({
            status: 'SUCCESS',
            message: 'Notification marked as read successfully'
        })
    } catch (error) {
        console.error('Error marking notification as read:', error)
        res.status(500).json({
            status: 'FAILED',
            message: 'Internal server error' + error.message
        })
    }
}

exports.markNotificationAsReadAnonymous = async (req, res) => {
     const userId = req.user.id;
    const { notificationId } = req.params;

    if (!notificationId) {
        return res.status(400).json({
            status: "FAILED",
            message: "Notification paramter missing."
        });
    }
    try{
        const userNotification = await AnonymousUserNotifications.findOne({
            where: {
                userId: userId,
                notificationId: notificationId
            }
        })
        

        if (!userNotification) {
            return res.status(404).json({
                status: 'FAILED',
                message: 'Notification not found'
            })
        }

        userNotification.isRead = 1
        await userNotification.save()

        res.status(200).json({
            status: 'SUCCESS',
            message: 'Notification marked as read successfully'
        })
    }catch (error) {
        console.error('Error marking notification as read:', error)
        res.status(500).json({
            status: 'FAILED',
            message: 'Internal server error' + error.message
        })
    }
}

exports.deleteNotification = async (req, res) => {
    const userId = req.user.id;
    const { notificationId } = req.params;

    if (!notificationId) {
        return res.status(400).json({
            status: "FAILED",
            message: "Notification paramter missing."
        })
    }

    try {
        const notification = await UserNotifications.findOne({
            where: {
                notificationId,
                userId
            }
        })

        if (!notification) {
            return res.status(404).json({
                status: 'FAILED',
                message: 'Notification not found'
            })
        }

        await notification.destroy()

        res.status(200).json({
            status: 'SUCCESS',
            message: 'Notification deleted successfully'
        })
    } catch (error) {
        console.error('Error deleting notification:', error)
        return res.status(500).json({
            status: 'FAILED',
            message: 'Internal server error' + error.message
        })
    }
}


exports.deleteNotificationAnonymous = async (req, res) => {
    const userId = req.user.id;
    const { notificationId } = req.params;

    if (!notificationId) {
        return res.status(400).json({
            status: "FAILED",
            message: "Notification paramter missing."
        })
    }

    try {
        const notification = await AnonymousUserNotifications.findOne({
            where: {
                notificationId,
                userId
            }
        })

        if (!notification) {
            return res.status(404).json({
                status: 'FAILED',
                message: 'Notification not found'
            })
        }

        await notification.destroy()
        await AnonymoustNotificationsModel.destroy({
            where: {
                id: notificationId
            }
        });

        res.status(200).json({
            status: 'SUCCESS',
            message: 'Notification deleted successfully'
        })
    } catch (error) {
        console.error('Error deleting notification:', error)
        return res.status(500).json({
            status: 'FAILED',
            message: 'Internal server error' + error.message
        })
    }
}
exports.storeAnonymousFcmToken = async (req, res) => {
    const { fcmToken } = req.body;

    try {
        if (!fcmToken || isEmpty(fcmToken)) {
            return res.status(400).json({
                status: 'FAILED',
                message: 'FCM token cannot be blank'
            });
        }

        const existingToken = await AnonymousTokensModel.findOne({ where: { fcmToken } });

        if (existingToken) {
            return res.status(200).json({
                status: 'SUCCESS',
                message: 'FCM token already stored anonymously'
            });
        }

        await AnonymousTokensModel.create({ fcmToken });

        return res.status(200).json({
            status: 'SUCCESS',
            message: 'Anonymous FCM token stored successfully'
        });
    } catch (error) {
        console.error('Error storing anonymous fcm token:', error);
        return res.status(500).json({
            status: 'FAILED',
            message: 'Internal server error: ' + error.message
        });
    }
};

exports.deleteFcmToken = async (req, res) => {
    try {
        const userId = req.user.id;
        const { fcmToken } = req.body;

        if (!fcmToken || isEmpty(fcmToken)) {
            return res.status(400).json({
                status: 'FAILED',
                message: 'FCM token is required'
            });
        }

        const tokenRecord = await FcmTokensModel.findOne({
            where: {
                userId,
                fcmToken
            }
        });

        if (!tokenRecord) {
            return res.status(404).json({
                status: 'FAILED',
                message: 'FCM token not found for the user'
            });
        }

        await tokenRecord.destroy();

        res.status(200).json({
            status: 'SUCCESS',
            message: 'FCM token deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting FCM token:', error);
        res.status(500).json({
            status: 'FAILED',
            message: 'Internal server error: ' + error.message
        });
    }
};
