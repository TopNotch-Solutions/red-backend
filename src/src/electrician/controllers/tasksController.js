const IssuesModel = require("../../common/models/issuesModel");
const usersModel = require("../../common/models/usersModel");
const bcrypt = require("bcrypt");
const sequelize = require("../../config/db");
const CapitalizeFirstLetter = require("../../common/services/capitalization");
const { calculateOvertime } = require("../services/overtimeCalculation");
const { isEmpty } = require("../../common/services/isEmpty");
const IssueImageModel = require("../../common/models/issueImagesModel");
const { isValidCellphoneNumber } = require("../../common/services/utils");
const User = require("../../portal/models/UserModel");
const PortalNotificationsModel = require("../../portal/models/PortalNotificationsModel");
const NotificationsModel = require("../../portal/models/NotificationsModel");
const UserNotifications = require("../../common/models/UsersNotificationModel");
const admin = require("../../../src/common/services/firebase");
const FcmTokensModel = require("../../common/models/fcmTokensModel");

exports.getIssuesByElectrician = async (req, res) => {
  const electricianId = req.user.id;

  try {
    const issues = await IssuesModel.findAll({
      where: { electricianId, isCompletedRemove: false },
      include: [
        {
          model: usersModel,
          as: "user",
          attributes: [
            "id",
            "firstName",
            "lastName",
            "email",
            "cellphoneNumber",
            "customerType",
            "profileImage",
          ],
        },
        {
          model: IssueImageModel,
          as: "images",
          attributes: ["id", "imagePath"],
        },
      ],
    });

    res.status(200).json({
      status: "SUCCESS",
      message: "Tasks retrieved successfully",
      issues,
    });
  } catch (error) {
    console.error("Error fetching issues:", error);
    res.status(500).json({
      status: "FAILED",
      message: "Internal server error" + error.message,
    });
  }
};

exports.changeTaskStatus = async (req, res) => {
  const { issueId } = req.params;
  const { status, finalReason } = req.body;

  try {
    // Early validation for status
    if (!status || isEmpty(status)) {
      return res.status(400).json({
        status: "FAILED",
        message: "Status cannot be blank",
      });
    }

    const issue = await IssuesModel.findByPk(issueId);

    if (!issue) {
      return res.status(404).json({
        status: "FAILED",
        message: "Issue not found",
      });
    }

    if (issue.status == status) {
      return res.status(200).json({
        status: "SUCCESS",
        message: "No changes made",
      });
    }

    issue.status = status;
    
    if (finalReason) {
      issue.finalReason = finalReason;
      const allAdmins = await User.findAll({
        where: { role: "admin" },
      });
     
      if (allAdmins.length !== 0) {
        for (const admin of allAdmins) {
          console.log("All Admins send notification id:", admin.id);
          await PortalNotificationsModel.create({
            userId: admin.id,
            issueId: issue.id,
            isRead: false,
            message: `Task ${issue.refNo} has been rejected by the assigned electrician. The reason provided for rejection is: "${finalReason}". Please review this task and take the necessary follow-up actions.`,
          });
        }
      }
    }

    if (status === "Completed") {
      const files = req.files;

  if (!files || !files.completedImage || files.completedImage.length === 0) {
    return res.status(400).json({
      status: "FAILED",
      message: "At least one completed image is required.",
    });
  }

  const completedImage1 = files.completedImage[0]?.filename || null;
  const completedImage2 = files.completedImage[1]?.filename || null;
      
      issue.endTime = new Date();
      issue.completedImage = completedImage1;
      if(completedImage2){
        issue.completedImage2 = completedImage2;
      }
      await issue.save();
    
      const newNotification = await NotificationsModel.create({
        title: "Task completed",
        message: `The issue: '${issue.issueType}' has been completed.`,
        notificationType: "Notification",
      });

      await UserNotifications.create({
        userId: issue.userId,
        notificationId: newNotification.id,
        isRead: false,
        createdAt: new Date(),
        notificationType: "Notification",
      });
      const fcmTokenRecord = await FcmTokensModel.findOne({
        where: { userId: issue.userId },
        attributes: ["fcmToken"],
      });

      if (fcmTokenRecord && fcmTokenRecord.fcmToken) {
        const message = {
          notification: {
            title: "Task completed",
            body: `Good day,\nYour issue:'${issue.issueType}' has been completed.`,
          },
          data: {
            navigationId: "Notification",
          },
          tokens: [fcmTokenRecord.fcmToken],
        };

        try {
          const response = await admin.messaging().sendEachForMulticast(message);
          console.log(`${response.successCount} push notifications sent successfully`);
        } catch (error) {
          console.error("Error sending notification", error);
        }
      }
      
      // Calculate overtime
      const { startTime, endTime } = issue;
      await calculateOvertime(startTime, endTime, issue.id);
    } else {
      await issue.save();
    }

    res.status(200).json({
      status: "SUCCESS",
      message: `Task status changed to '${status}'`,
    });
  } catch (error) {
    console.error("Error completing task:", error);
    res.status(500).json({
      status: "FAILED",
      message: "Internal server error: " + error.message,
    });
  }
};

exports.getTaskStats = async (req, res) => {
  const electricianId = req.user.id;

  try {
    const completedTasks = await IssuesModel.count({
      where: {
        electricianId: electricianId,
        status: "Completed",
      },
      attributes: [
        [
          sequelize.fn("DATE_FORMAT", sequelize.col("createdAt"), "%Y-%m"),
          "month",
        ],
      ],
      group: ["month"],
    });

    const InProgressTasks = await IssuesModel.count({
      where: {
        electricianId: electricianId,
        status: "In Progress",
      },
      attributes: [
        [
          sequelize.fn("DATE_FORMAT", sequelize.col("createdAt"), "%Y-%m"),
          "month",
        ],
      ],
      group: ["month"],
    });

    const pendingTasks = await IssuesModel.count({
      where: {
        electricianId: electricianId,
        status: "Pending",
      },
      attributes: [
        [
          sequelize.fn("DATE_FORMAT", sequelize.col("createdAt"), "%Y-%m"),
          "month",
        ],
      ],
      group: ["month"],
    });

    const hoursData = await IssuesModel.findOne({
      where: { electricianId },
      attributes: [
        [
          sequelize.fn(
            "COALESCE",
            sequelize.fn("SUM", sequelize.col("overtime")),
            0
          ),
          "totalOvertime",
        ],
        [
          sequelize.fn(
            "COALESCE",
            sequelize.fn("SUM", sequelize.col("specialHours")),
            0
          ),
          "totalSpecialHours",
        ],
        [
          sequelize.fn("DATE_FORMAT", sequelize.col("createdAt"), "%Y-%m"),
          "month",
        ],
      ],
      group: ["month"],
      raw: true,
    });

    res.status(200).json({
      status: "SUCCESS",
      message: "Task status details retrieved successfully",
      stats: {
        pending: pendingTasks,
        inProgress: InProgressTasks,
        completed: completedTasks,
        overtime: hoursData?.totalOvertime,
        specialHours: hoursData?.totalSpecialHours,
      },
    });
  } catch (error) {
    console.error("An error occurred while retrieving task stats:", error);
    return res.status(500).json({
      status: "FAILED",
      message: "Internal server error" + error.message,
    });
  }
};

exports.getUnassignedTasks = async (req, res) => {
  try {
    const tasks = await IssuesModel.findAll({
      where: { isAssigned: false },
    });

    res.status(200).json({
      status: "SUCCESS",
      message: "Unassigned tasks returned successfully",
      tasks,
    });
  } catch (error) {
    console.error("Error", error);
    return res.status(500).json({
      status: "FAILED",
      message: "Internal server error" + error.message,
    });
  }
};

exports.acceptTask = async (req, res) => {
  const electricianId = req.user.id;
  const { issueId } = req.params;

  try {
    if (!electricianId) {
      return res.status(400).json({
        status: "FAILED",
        message: "Electrician ID is required",
      });
    }

    if (!issueId) {
      return res.status(400).json({
        status: "FAILED",
        message: "Issue ID is required",
      });
    }

    const task = await IssuesModel.findByPk(issueId);

    task.isAssigned = true;
    task.electricianId = electricianId;
    task.save();

    res.status(200).json({
      status: "SUCCESS",
      message: "Task accepted",
      task,
    });
  } catch (error) {
    console.error("Error", error);
    return res.status(500).json({
      status: "FAILED",
      message: "Internal server error" + error.message,
    });
  }
};

exports.createTask = async (req, res) => {
  const electricianId = req.user.id;
  const {
    issueType,
    description,
    location,
    streetName,
    fullName,
    town,
    suburb,
    priority,
    cellphoneNumber,
  } = req.body;
  const issueImages = req.files;

  if (!issueType || isEmpty(issueType)) {
    return res.status(400).json({
      status: "FAILED",
      message: "Issue type cannot be blank",
    });
  }

  if (!description || isEmpty(description)) {
    return res.status(400).json({
      status: "FAILED",
      message: "Description cannot be blank",
    });
  }

  // if (!location || isEmpty(location)) {
  //   return res.status(400).json({
  //     status: "FAILED",
  //     message: "Location cannot be blank",
  //   });
  // }

  if (!streetName || isEmpty(streetName)) {
    return res.status(400).json({
      status: "FAILED",
      message: "Street name cannot be blank",
    });
  }

  if (!fullName || isEmpty(fullName)) {
    return res.status(400).json({
      status: "FAILED",
      message: "Full name cannot be blank",
    });
  }

  // if (!suburb || isEmpty(suburb)) {
  //   return res.status(400).json({
  //     status: "FAILED",
  //     message: "Suburb cannot be blank",
  //   });
  // }

  if (!town || isEmpty(town)) {
    return res.status(400).json({
      status: "FAILED",
      message: "Town cannot be blank",
    });
  }

  if (cellphoneNumber) {
    if (!isValidCellphoneNumber(cellphoneNumber)) {
      return res.status(400).json({
        status: "FAILED",
        message: "Cellphone number is invalid",
      });
    }
  }

  CapitalizeFirstLetter(description);
  CapitalizeFirstLetter(issueType);

  const transaction = await sequelize.transaction();

  try {
    const user = await usersModel.findByPk(electricianId);

    if (!user) {
      return res.status(404).json({
        status: "FAILED",
        message: "User not found",
      });
    }

    const task = await IssuesModel.create(
      {
        issueType,
        description,
        location,
        streetName,
        electricianId,
        isAssigned: true,
        fullName,
        status: "Pending",
        finalReason: "",
        erf: "",
        town,
        suburb,
        priority,
        cellphoneNumber,
      },
      { transaction }
    );

    if (issueImages && issueImages.length > 0) {
      try {
        const images = issueImages.map((file) => ({
          issueId: task.id,
          imagePath: file.path,
        }));
        await IssueImageModel.bulkCreate(images, { transaction });
      } catch (error) {
        console.error("Image upload failed, rolling back issue:", error);
        await transaction.rollback();
        return res.status(500).json({
          status: "FAILED",
          message: "Failed to upload issue images",
        });
      }
    }

    await transaction.commit();

    res.status(201).json({
      status: "SUCCESS",
      message: "Task created successfully",
      task: task,
    });
  } catch (error) {
    console.error("Error:", error);
    await transaction.rollback();
    return res.status(500).json({
      status: "FAILED",
      message: "Internal server error" + error.message,
    });
  }
};

exports.updateTask = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const task = await IssuesModel.findByPk(id);

    if (!task) {
      return res.status(404).json({
        status: "FAILED",
        message: "Issue not found",
      });
    }

    if (req.file) {
      const oldImagePath = issue.issueImage;

      updateData.issueImage = req.file.path;

      if (oldImagePath && fs.existsSync(oldImagePath)) {
        fs.unlink(oldImagePath, (error) => {
          if (error) {
            console.error(`Failed to delete old image: ${oldImagePath}`, error);
          } else {
            console.log(`Old image deleted: ${oldImagePath}`);
          }
        });
      }
    }

    await task.update(updateData);

    res.status(200).json({
      status: "SUCCESS",
      message: "Task updated successfully",
    });
  } catch (error) {
    console.error("Error updating task:", error);
    return res.status(500).json({
      status: "FAILED",
      message: "Internal server error" + error.message,
    });
  }
};
exports.completedStatusTask = async (req, res) => {
  try {
    const { id } = req.params;
    const task = await IssuesModel.findByPk(id);
    if (!task) {
      return res.status(404).json({
        status: "FAILED",
        message: "Task not found",
      });
    }
   
    task.isCompletedRemove = true;
    await task.save();

    res.status(200).json({
      status: "SUCCESS",
      message: "Task completed status updated successfully",
    });
  } catch (error) {
    console.error("Error completing task:", error);
    return res.status(500).json({
      status: "FAILED",
      message: "Internal server error: " + error.message,
    });
  }
};

exports.deleteTask = async (req, res) => {
  try {
    const { id } = req.params;
    const task = await IssuesModel.findByPk(id);

    if (!task) {
      return res.status(404).json({
        status: "FAILED",
        message: "Task not found",
      });
    }

    await task.destroy();

    res.status(200).json({
      status: "SUCCESSS",
      message: "Task deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting task:", error);
    return res.status(500).json({
      status: "FAILED",
      message: "Internal server error" + error.message,
    });
  }
};
