const bcrypt = require('bcrypt')
const IssuesModel = require('../../common/models/issuesModel')
const ElectricianNotificationModel = require('../../electrician/models/ElectricianNotificationModel')
const UsersModel = require('../../common/models/usersModel')
const usersModel = require('../../common/models/usersModel')
const CapitalizeFirstLetter = require('../../common/services/capitalization')
const generateRandomString = require('../../common/services/generateRandomString');
const { transporter } = require('../../common/services/transporter')
const numberValidator = require('../../common/services/numberValidator')
const admin = require('../../common/services/firebase')
const { isEmpty } = require('../../common/services/isEmpty')
const { isValidCellphoneNumber, isValidEmail } = require('../../common/services/utils')
const {Op} = require('sequelize')
const User = require('../models/UserModel')
const FcmTokensModel = require('../../common/models/fcmTokensModel')

require('dotenv').config()

exports.createElectrician = async (req, res) => {
    let { firstName, lastName, cellphoneNumber, email, streetName, suburb, town } = req.body
    const userType = 'Electrician';

    if (!cellphoneNumber || isEmpty(cellphoneNumber)) {
        return res.status(400).json({
            status: "FAILED",
            message: "Cellphone number cannot be blank"
        });
    }

    if (!firstName || isEmpty(firstName)) {
        return res.status(400).json({
            status: "FAILURE",
            message: 'First name cannot be blank'
        })
    }

    if (!lastName || isEmpty(lastName)) {
        return res.status(400).json({
            status: "FAILED",
            message: "Last name cannot be blank"
        })
    }

    if (!email || isEmpty(email)) {
        return res.status(400).json({
            status: 'FAILED',
            message: "Email cannot be blank"
        })
    }

    if (!isValidEmail(email)) {
        return res.status(400).json({
            status: 'FAILED',
            message: 'Invalid email'
        })
    }

    if (!isValidCellphoneNumber(cellphoneNumber)) {
        return res.status(400).json({
            status: 'FAILED',
            message: 'Invalid cellphone number. Cellphone number must start with 264, and be 12 digits long'
        })
    }

    if(!streetName || isEmpty(streetName)){
        return res.status(400).json({
            status: 'FAILED',
            message: 'Street name cannot be blank'
        })
    }

    if(!suburb || isEmpty(suburb)){
        return res.status(400).json({
            status: 'FAILED',
            message: 'Suburb cannot be blank'
        })
    }

    if(!town || isEmpty(town)){
        return res.status(400).json({
            status: 'FAILED',
            message: 'Town cannot be blank'
        })
    }

    const password = generateRandomString();
    firstName = CapitalizeFirstLetter(firstName);
    lastName = CapitalizeFirstLetter(lastName);

    try {
        const exisitingUser = await UsersModel.findOne({ where: { email } })

        if (exisitingUser) {
            return res.status(400).json({
                status: 'FAILED',
                message: 'User already exists'
            })
        }

        const portalUser = await User.findOne({ where: { email } });
         if (portalUser) {
            return res.status(400).json({
                status: 'FAILED',
                message: 'User already exists'
            })
        }

        const salt = await bcrypt.genSalt(12)
        const hashedPassword = await bcrypt.hash(password, salt)

        await usersModel.create({ firstName, lastName, cellphoneNumber, email, password: hashedPassword, userType, suburb_name: suburb, town, streetName });

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject:
                "Welcome to ErongoRed Electrician App - Your Account Credentials",
            html: `
                      <div style="font-family: Arial, sans-serif; max-width: 600px;">
                          <h2 style="color: #e74c3c;">Welcome to ErongoRed Electrician App!</h2>
                          
                          <p>Dear ${firstName},</p>
                          
                          <p>Thank you for joining ErongoRed's Electrician team. Your account has been successfully created.</p>
                          
                          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
                              <p style="margin: 0;"><strong>Your temporary password:</strong> <span style="color: #e74c3c; font-family: monospace;">${password}</span></p>
                          </div>
                          
                          <p><strong>Important Security Notes:</strong></p>
                          <ul>
                              <li>Please change this password upon your first login</li>
                              <li>Never share your password with anyone</li>
                              <li>ErongoRed staff will never ask for your password</li>
                          </ul>
                          
                          <p>If you didn't request this account, please contact our support team immediately.</p>
                          
                          <p style="margin-top: 30px;">Best regards,<br>The ErongoRed Team</p>
                          
                          <div style="border-top: 1px solid #ddd; margin-top: 20px; padding-top: 20px; font-size: 12px; color: #666;">
                              <p>This is an automated message, please do not reply to this email.</p>
                          </div>
                      </div>
                  `,
        };

        transporter.sendMail(mailOptions, async (error, info) => {
            if (error) {
                console.error("Email error:", error);
                await usersModel.destroy({ where: { email } });
                return res.status(500).json({
                    status: "FAILED",
                    message: "Internal server error: " + error.message,
                });
            }
            res.status(201).json({
                status: "SUCCESS",
                message: "User registered successfully",
            });
        });
    } catch (error) {
        console.error('Error while creating electrician:', error)
        res.status(500).json({
            status: 'FAILED',
            message: 'Internal server error' + error.message
        })
    }
}

exports.getAllElectricians = async (req, res) => {
    try {
        const electricians = await usersModel.findAll({
            attributes: { exclude: ['password'] },
            where: {
                userType: 'Electrician'
            }
        })

        res.status(200).json({
            status: 200,
            message: 'All electricians retrieved successfully',
            data: electricians
        })
    } catch (error) {
        console.error('An error occurred:', error)
        res.status(500).json({
            status: 500,
            message: 'Internal server error' + error.message
        })
    }
}

exports.getElectricianById = async (req, res) => {
    const { userId } = req.params;
    if (!userId) {
        return res.status(400).json({
            status: "FAILURE",
            message: "User id id empty."
        });
    }

    try {
        const electrician = await usersModel.findByPk(userId, {
            attributes: { exclude: ['password', 'customerType', 'meterNumber', 'userType'] },
            where: {
                userType: 'Electrician'
            }
        })

        if (!electrician) {
            return res.status(404).json({
                status: 'FAILED',
                message: 'User not found'
            })
        }

        res.status(200).json({
            status: 'SUCCESS',
            message: 'User found',
            data: electrician
        })
    } catch (error) {
        console.error('An error occurred:', error)
        res.status(500).json({
            status: 'FAILED',
            message: 'Internal server error' + error.message
        })
    }
}

exports.deleteElectrician = async (req, res) => {
    const { userIds } = req.body;
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
        return res.status(400).json({
            status: "FAILED",
            message: "User IDs must be a non empty array."
        });
    }

    try {
        const electricians = await usersModel.findAll({
            where: {
                id: {[Op.in]: userIds},
            }
        })

        if (electricians.length === 0) {
            return res.status(404).json({
                status: 'FAILED',
                message: 'Electrician not found'
            })
        }

        const deletedCount = await usersModel.destroy({
            where: {
                id: {[Op.in]: userIds},
            }
        })


        res.status(200).json({
            status: 'SUCCESS',
            message: `${deletedCount} electricians deleted successfully`,
        })
    } catch (error) {
        console.error('An error occurred:', error)
        res.status(500).json({
            status: 'FAILED',
            message: 'Internal server error' + error.message
        })
    }
}

exports.updateElectrician = async (req, res) => {
    const { userId } = req.params
    let { firstName, lastName, email, cellphoneNumber, address } = req.body
    const profileImage = req.file ? req.file.path : null;

    firstName = CapitalizeFirstLetter(firstName);
    lastName = CapitalizeFirstLetter(lastName);

    try {
        const electrician = await usersModel.findByPk(userId, {
            attributes: { exclude: ['password', 'customerType', 'meterNumber', 'userType'] }
        })

        if (!electrician) {
            return res.status(404).json({
                status: 'FAILED',
                message: 'Electrician not found'
            })
        }

        electrician.firstName = firstName || electrician.firstName
        electrician.lastName = lastName || electrician.lastName;
        electrician.email = email || electrician.email;
        electrician.cellphoneNumber = cellphoneNumber || electrician.cellphoneNumber;
        electrician.profileImage = profileImage || electrician.profileImage;
        electrician.address = address || electrician.address

        await electrician.save()

        res.status(200).json({
            status: 'SUCCESS',
            message: 'Electrician updated successfully',
            data: electrician
        })
    } catch (error) {
        console.error('An error occurred:', error)
        res.status(500).json({
            status: 'FAILED',
            message: 'Internal server error' + error.message
        })
    }
}

exports.assignIssueToElectrician = async (req, res) => {
    const { issueId, electricianId, priority } = req.body;

    if (!electricianId || isEmpty(electricianId)) {
        return res.status(400).json({
            status: "FAILED",
            message: "Electrician ID cannot be empty"
        });
    }

    if (!issueId || isEmpty(issueId)) {
        return res.status(400).json({
            status: 'FAILED',
            message: 'Issue ID cannot be empty'
        })
    }

    try {
        const issue = await IssuesModel.findByPk(issueId)

        if (!issue) {
            return res.status(404).json({
                status: 'FAILED',
                message: 'Issue not found'
            })
        }

        const electrician = await usersModel.findByPk(electricianId, {
            attributes: ["id", "fcmToken", "availabilityStatus"],
        })
        const fcmTokenElectrician = await FcmTokensModel.findOne({
            where: {
                userId: electricianId
            },
        })

        if (!electrician) {
            return res.status(404).json({
                status: 'FAILED',
                message: 'Electrician not found'
            })
        }

        if(electrician.availabilityStatus !== 'Available') {
            return res.status(400).json({
                status: 'FAILED',
                message: 'Electrician is not available for assignment'
            })
        }

        const previousElectricianId = issue.electricianId
        issue.electricianId = electricianId
        issue.isAssigned = true
        issue.finalReason = ''
        issue.priority = priority || issue.priority
        await issue.save()

        const notification = `You have been assigned a new task: '${issue.description}'`
        await ElectricianNotificationModel?.create({
            electricianId,
            message: notification
        })
        if(fcmTokenElectrician && fcmTokenElectrician.fcmToken){
            const payload = {
            notification: {
                title: "New Task Assigned",
                body: notification
            },
            data: {
                issueId: String(issue.id),
                navigationId: String('Tasks'),
            },
            token: fcmTokenElectrician.fcmToken
        }
        try {
            const response = await admin.messaging().send(payload)
            console.log(`Push notification sent to electrician ${electricianId}`, response)
        } catch (error) {
            console.error('Error sending push notification:', error)
        }
        }

        res.status(200).json({
            status: 'SUCCESS',
            message: previousElectricianId ?
                'Issue successfully reassigned to another electrician' : 'Issue successfully assigned to electrician'
            ,
            issue
        })
    } catch (error) {
        console.error('Error assigning issue to electrician:', error)
        res.status(500).json({
            status: 'FAILED',
            message: 'Internal server error' + error.message
        })
    }
}

exports.unassignIssue = async (req, res) => {
    const { issueId } = req.params;
    if (!issueId) {
        return res.status(400).json({
            status: "FAILED",
            message: "Issue id is empty."
        });
    }

    try {
        const issue = await IssuesModel.findByPk(issueId)

        if (!issue) {
            return res.status(404).json({
                status: 'FAILED',
                message: 'Issue not found'
            })
        }

        const electrician = await usersModel.findByPk(issue.electricianId, {
            attributes: ["id", "fcmToken"]
        })

        issue.electricianId = null
        issue.finalReason = ''
        await issue.save()

        if (electrician && electrician.fcmToken) {
            const payload = {
                notification: {
                    title: "Task unassigned",
                    body: `You have been unassigned from a task: '${issue.description}'`
                },
                data: {
                    issueId: issue.id,
                    navigationId: 'Tasks',
                },
                token: electrician.fcmToken
            }

            try {
                const response = await admin.messaging().send(payload);
                console.log(`✅ Push notification sent to electrician ${electrician.id}:`, response);
            } catch (error) {
                console.error("❌ Error sending push notification:", error);
            }
        }

        res.status(200).json({
            status: 'SUCCESS',
            message: 'Issue unassigned successfully'
        })
    } catch (error) {
        console.error('Error unassigning issue:', error)
        res.status(500).json({
            status: 'FAILED',
            message: 'Internal server error' + error.message
        })
    }
}