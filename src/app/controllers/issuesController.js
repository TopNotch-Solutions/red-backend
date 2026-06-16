const IssuesModel = require('../../common/models/issuesModel')
const PortalUsersModel = require('../../portal/models/UserModel')
const fs = require('fs')
const PortalNotificationsModel = require('../../portal/models/PortalNotificationsModel')
const usersModel = require('../../common/models/usersModel')
const ElectricianNotificationModel = require('../../electrician/models/ElectricianNotificationModel')
const CapitalizeFirstLetter = require('../../common/services/capitalization')
const admin = require('../../common/services/firebase')
const { isEmpty } = require('../../common/services/isEmpty')
const IssueImageModel = require('../../common/models/issueImagesModel')
const sequelize = require('../../config/db')
const { isValidCellphoneNumber } = require('../../common/services/utils')
const RoleModel = require('../../common/models/roleModel')
const RoleCategory = require('../../common/models/roleCategoryModel')
const { sendProductionDebugEmail } = require('../services/sendProductionDebugEmail')
const IssueStatisticsModel = require('../../common/models/issueStatisticsModel')

exports.createIssue = async (req, res) => {
    let { issueType, description, location, streetName, fullName, cellphoneNumber, suburb, town, erf } = req.body;
    const userId = req.user.id;
    const issueImages = req.files

if (!issueType || isEmpty(issueType)) {
        return res.status(400).json({
            status: "FAILED",
            message: 'A new version of this application is available on the App Store. Please update to the latest version to continue using the app.'
        });
    }

    if (!description || isEmpty(description)) {
        return res.status(400).json({
            status: 'FAILED',
            message: 'A new version of this application is available on the App Store. Please update to the latest version to continue using the app.'
        })
    }

    if (!fullName) {
        return res.status(400).json({
            status: 'FAILED',
            message: 'A new version of this application is available on the App Store. Please update to the latest version to continue using the app.'
        })
    }
 
    if (!town) {
        return res.status(400).json({
            status: 'FAILED',
            message: 'A new version of this application is available on the App Store. Please update to the latest version to continue using the app.'
        })
    }
    if (!cellphoneNumber || isEmpty(cellphoneNumber)) {
        return res.status(400).json({
            status: 'FAILED',
            message: 'A new version of this application is available on the App Store. Please update to the latest version to continue using the app.'
        })
    }

   

    if (!isValidCellphoneNumber(cellphoneNumber)) {
        return res.status(400).json({
            status: 'FAILED',
            message: 'Invalid cellphone number. Cellphone number must start with 264, and be 12 digits long'
        })
    }

    const generateRefNo = () => {
        const prefix = "ISSUE"
        const timestamp = Date.now().toString()
        const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase()
        return `${prefix}-${timestamp}-${randomSuffix}`
    }

    const refNo = generateRefNo()

    description = CapitalizeFirstLetter(description);
    issueType = CapitalizeFirstLetter(issueType);

    const transaction = await sequelize.transaction()

    try {
        const user = await usersModel.findByPk(userId)
        if (!user) {
            return res.status(404).json({
                status: 'FAILED',
                message: 'User not found'
            })
        }

        const newIssue = await IssuesModel.create({
            issueType,
            description,
            location,
            streetName,
            userId,
            status: 'Pending',
            refNo,
            erf: erf || "",
            cellphoneNumber,
            fullName,
 suburb,
            town,
            finalReason: '',
            completedImage:''
        }, { transaction })
await IssueStatisticsModel.create({
            issueId: newIssue.id
        }, { transaction });

        if (issueImages && issueImages.length > 0) {
            try {
                const imageRecords = issueImages.map(file => ({
                    issueId: newIssue.id,
                    imagePath: file.path
                }))
                await IssueImageModel.bulkCreate(imageRecords, { transaction })
            } catch (error) {
                console.error('Image upload failed, rolling back issue:', error)
                await transaction.rollback()
                return res.status(500).json({
                    status: 'FAILED',
                    message: 'Failed to upload issue images'
                })
            }
        }

        await transaction.commit()

        const users = await PortalUsersModel.findAll()

        const notifications = users.map((user) => ({
            userId: user.id,
            message: `A new issue has been reported: ${description}`,
            type: 'Issue',
            issueId: newIssue.id
        }))

        // const electricians = await usersModel.findAll({
        //     where: { userType: 'Electrician' },
        //     attributes: ['id', 'fcmToken']
        // })

        // if (electricians.length > 0) {
        //     const fcmTokens = electricians.map(e => e.fcmToken).filter(token => token)

        //     const payload = {
        //         notification: {
        //             title: 'New Issue',
        //             body: `An issue has been reported: ${description}`
        //         },
        //         tokens: fcmTokens
        //     }

        //     if (fcmTokens.length > 0) {
        //         try {
        //             const response = await admin.messaging().sendEachForMulticast(payload)
        //             console.log(`${response.successCount} push notifications sent successfully`, response)
        //         } catch (error) {
        //             console.error('Error sending push notifications:', error)
        //         }
        //     }
        // }

        // const electricianNotification = electricians.map((electrician) => ({
        //     electricianId: electrician.id,
        //     message: `An issue has been reported '${description}'`
        // }))

        await PortalNotificationsModel.bulkCreate(notifications)

       // await ElectricianNotificationModel.bulkCreate(electricianNotification)

        res.status(201).json({
            status: 'SUCCESS',
            message: 'Issue reported successfully',
            issue: newIssue
        })
    } catch (error) {
        console.error('Error creating issue:', error)
        await transaction.rollback()
        res.status(500).json({
            status: 'FAILED',
            message: 'Internal server error' + error.message
        })
    }
}

exports.updateIssue = async (req, res) => {
    const transaction = await sequelize.transaction();

    try {
        const { id } = req.params;

        if (!id || isEmpty(id)) {
            return res.status(400).json({
                status: 'FAILED',
                message: 'ID cannot be blank'
            });
        }

        const updateData = req.body;
        const issue = await IssuesModel.findByPk(id, { transaction });

        if (!issue) {
            await transaction.rollback();
            return res.status(404).json({
                status: 'FAILED',
                message: 'Issue not found'
            });
        }

        if (updateData.deleteImageIds && Array.isArray(updateData.deleteImageIds)) {
            const imagesToDelete = await IssueImageModel.findAll({
                where: { id: updateData.deleteImageIds, issueId: id },
                transaction
            });

            for (const image of imagesToDelete) {
                if (fs.existsSync(image.imagePath)) {
                    fs.unlinkSync(image.imagePath);
                }
            }

            await IssueImageModel.destroy({
                where: { id: updateData.deleteImageIds, issueId: id },
                transaction
            });
        }

        if (req.files && req.files.length > 0) {
            const newImages = req.files.map(file => ({
                issueId: id,
                imagePath: file.path
            }));

            await IssueImageModel.bulkCreate(newImages, { transaction });
        }

        await issue.update(updateData, { transaction });

        await transaction.commit();

        res.status(200).json({
            status: 'SUCCESS',
            message: 'Issue updated successfully'
        });

    } catch (error) {
        await transaction.rollback();
        console.error('Error updating issue:', error);
        res.status(500).json({
            status: 'FAILED',
            message: 'Internal server error: ' + error.message
        });
    }
};

exports.deleteIssueImages = async (req, res) => {
    const { imageIds } = req.body

    try {
        if (!Array.isArray(imageIds) || imageIds.length === 0) {
            return res.status(400).json({
                status: 'FAILED',
                message: 'Image IDs must be an array and cannot be empty'
            })
        }

        const images = await IssueImageModel.findAll({
            where: { id: imageIds }
        })

        if (images.length === 0) {
            return res.status(404).json({
                status: 'FAILED',
                message: 'No images found with the provided IDs'
            })
        }

        for (const image of images) {
            if (fs.existsSync(image.imagePath)) {
                try {
                    fs.unlinkSync(image.imagePath)
                } catch (error) {
                    console.error('Error deleting image file:', error)
                }
            }
        }

        await IssueImageModel.destroy({ where: { id: imageIds } })

        res.status(200).json({
            status: 'SUCCESS',
            message: 'Images deleted successfully'
        })
    } catch (error) {
        console.error('Error deleting issue images:', error)
        return res.status(500).json({
            status: 'FAILED',
            message: 'Internal server error: ' + error.message
        })
    }
}

exports.deleteIssue = async (req, res) => {
    try {
        const { id } = req.params

        if (!id || isEmpty(id)) {
            return res.status(400).json({
                status: 'FAILED',
                message: 'ID cannot be blank'
            })
        }

        const issue = await IssuesModel.findByPk(id)

        if (!issue) {
            return res.status(404).json({
                status: 'FAILED',
                message: 'Issue not found'
            })
        }

        await issue.destroy()

        res.status(200).json({
            status: 'SUCCESS',
            message: 'Issue deleted successfully'
        })
    } catch (error) {
        console.error('Error deleting issue:', error)
        return res.status(500).json({
            status: 'FAILED',
            message: 'Internal server error' + error.message
        })
    }
}

exports.reportingHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10 } = req.query;

    if (!userId) {
      return res.status(400).json({
        status: "FAILED",
        message: "User ID is required",
      });
    }

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
        userType: "AppUser",
        status: "active",
      },
    });

    if (!user) {
      return res.status(404).json({
        status: "FAILED",
        message: "User not found",
      });
    }

    // Fetch issues + total count
    const { rows: issues, count: totalIssues } =
      await IssuesModel.findAndCountAll({
        where: { userId },
        include: [
          {
            model: IssueImageModel,
            as: "images",
          },
        ],
        order: [["createdAt", "DESC"]],
        limit: limitNumber,
        offset,
      });

    const totalPages = Math.ceil(totalIssues / limitNumber);

    return res.status(200).json({
      status: "SUCCESS",
      message: "Issue history retrieved successfully",
      data: issues,
      pagination: {
        currentPage: pageNumber,
        totalPages,
        totalIssues,
        limit: limitNumber,
        hasNextPage: pageNumber < totalPages,
        hasPreviousPage: pageNumber > 1,
      },
    });
  } catch (error) {
    console.error("Error retrieving issue history:", error);
    return res.status(500).json({
      status: "FAILED",
      message: "Internal server error: " + error.message,
    });
  }
};

exports.getRolesWithCategories = async (req, res) => {
    try {
	 const roles = await RoleCategory.findAll();
        res.status(200).json({
            status: "SUCCESS",
            message: "Roles with categories fetched successfully",
            data: roles
        });

    } catch (error) {
        res.status(500).json({
            status: "FAILED",
            message: "Internal server error: " + error.message
        });
    }
};

exports.appIssues = async (req, res) => {
    let { type, error } = req.body;

    if (!type || isEmpty(type)) {
        return res.status(400).json({
            status: "FAILED",
            message: "Issue type cannot be blank"
        });
    }

    if (!error || isEmpty(error)) {
        return res.status(400).json({
            status: 'FAILED',
            message: 'Error cannot be blank'
        })
    }
    try{
        await sendProductionDebugEmail(type, error)
        return res.status(200).json({status: "SUCCESS", message: "Issue reported successfully"})
    }catch (t) {
        console.error('Error creating issue:', t)
        res.status(500).json({
            status: 'FAILED',
            message: 'Internal server error' + t.message
        })
    }
}
