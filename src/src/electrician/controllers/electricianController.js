const AppUserModel = require('../../app/models/appUserModel')
const IssuesModel = require('../../common/models/issuesModel')
const userModel = require('../../common/models/usersModel')
const CapitalizeFirstLetter = require('../../common/services/capitalization')
const bcrypt = require('bcrypt')
const { isEmpty } = require('../../common/services/isEmpty')
const usersModel = require('../../common/models/usersModel')
const { isValidPassword } = require('../../common/services/utils')
const fsp = require('fs').promises;
const fs = require('fs')
const FcmTokensModel = require('../../common/models/fcmTokensModel')

exports.getElectricianById = async (req, res) => {
    const userId = req.user.id

    try {
        const electrician = await userModel.findOne({
            where: {
                id: userId,
                userType: 'Electrician'
            },
            attributes: { exclude: ['password', 'pin', 'town', 'suburb_name', 'primaryMeterNumber', 'primaryAccountNumber', 'accountNo', 'customerType'] }
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
            userData: electrician
        })
    } catch (error) {
        console.error('Error retrieving user data:', error)
        res.status(500).json({
            status: 'FAILED',
            message: 'Internal server error' + error.message
        })
    }
}

exports.updateProfile = async (req, res) => {
    const userId = req.user.id;

    let { firstName, lastName, cellphoneNumber, email, address, availabilityStatus} = req.body;

    firstName = CapitalizeFirstLetter(firstName);
    lastName = CapitalizeFirstLetter(lastName);
    
    const profileImage = req.file ? req.file.path : null;

    try {
        const electrician = await userModel.findByPk(userId);

        if (!electrician) {
            return res.status(404).json({
                status: 'FAILED',
                message: 'User not found'
            });
        }

        const updateFields = {
            firstName,
            lastName,
            cellphoneNumber,
            email,
            address,
            availabilityStatus
        };

        if (profileImage !== null) {
            updateFields.profileImage = profileImage;
        }

        const updatedElectrician = await electrician.update(updateFields);

        res.status(200).json({
            status: 'SUCCESS',
            message: 'User details updated successfully',
            data: updatedElectrician
        });
    } catch (error) {
        console.error('Error updating details:', error);
        res.status(500).json({
            status: 'FAILED',
            message: 'Internal server error: ' + error.message
        });
    }
};

exports.deleteProfileImage = async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await userModel.findByPk(userId);

        if (!user) {
            return res.status(404).json({
                status: 'FAILED',
                message: 'User not found'
            });
        }

        if (!user.profileImage) {
            return res.status(400).json({
                status: 'FAILED',
                message: 'No profile image to delete'
            });
        }

        const imagePath = user.profileImage

        if (fs.existsSync(imagePath)) {
            try {
                await fsp.unlink(imagePath);
            } catch (unlinkErr) {
                console.error('Error deleting file:', unlinkErr);
                return res.status(500).json({
                    status: 'FAILED',
                    message: 'Error deleting profile image'
                });
            }
        }

        await user.update({ profileImage: null });

        return res.status(200).json({
            status: 'SUCCESS',
            message: 'Profile image deleted successfully'
        });

    } catch (error) {
        console.error('Error:', error.message);
        return res.status(500).json({
            status: 'FAILED',
            message: 'Internal server error: ' + error.message
        });
    }
};

exports.getIssuesByElectrician = async (req, res) => {
    const electricianId = req.user.id

    try {
        const issues = await IssuesModel.findAll({
            where: { electricianId },
            include: [
                {
                    model: AppUserModel,
                    as: 'user',
                    attributes: [
                        'id', 'firstName', 'lastName', 'email', 'cellphoneNumber', 'customerType', 'profileImage'
                    ]
                }
            ]
        })

        res.status(200).json({
            status: 'SUCCESS',
            issues
        })
    } catch (error) {
        console.error('Error fetching issues:', error)
        res.status(500).json({
            status: 'FAILED',
            message: 'Internal server error' + error.message
        })
    }
}

exports.changePassword = async (req, res) => {
    const { newPassword, currentPassword } = req.body
    const userId = req.user.id

    try {
        const user = await usersModel.findByPk(userId)

        if (!newPassword || isEmpty(newPassword)) {
            return res.status(400).json({
                status: 'FAILED',
                message: 'Password cannot be blank'
            })
        }

        if(!currentPassword || isEmpty(currentPassword)){
            return res.status(400).json({
                status: 'FAILED',
                message: 'Current password cannot be blank'
            })
        }

        if(!isValidPassword(newPassword)) {
            return res.status(400).json({
                status: 'FAILED',
                message: 'Password must be at least 8 characters long, contain at least one uppercase letter, one lower case letter, and one number'
            })
        }

        const passwordMatch = await bcrypt.compare(currentPassword, user.password)

        if(!passwordMatch){
            return res.status(400).json({
                status: 'FAILED',
                message: 'Password passed does not match current password'
            })
        }

        const salt = await bcrypt.genSalt(12)
        const hashedPassword = await bcrypt.hash(newPassword, salt)

        await userModel.update({ password: hashedPassword }, { where: { id: userId } })

        res.status(200).json({
            status: 'SUCCESS',
            message: 'Password changed successfully'
        })
    } catch (error) {
        console.error('Error resetting password:', error)
        res.status(500).json({
            status: 'FAILED',
            message: 'Internal server error' + error.message
        })
    }
}

exports.changeTaskStatus = async (req, res) => {
    const { issueId } = req.params
    const { status } = req.body

    try {
        const issue = await IssuesModel.findByPk(issueId)

        if (!status || isEmpty(status)) {
            res.status(400).json({
                status: 'FAILED',
                message: 'Status cannot be blank'
            })
        }

        if (!issue) {
            return res.status(404).json({
                status: 'FAILED',
                message: 'Issue not found'
            })
        }

        if (issue.status == status) {
            return res.status(200).json({
                status: 'SUCCESS',
                message: 'No changes made'
            })
        }

        issue.status = status
        issue.save()

        res.status(200).json({
            status: 'SUCCESS',
            message: `Task status changed to '${status}'`
        })
    } catch (error) {
        console.error('Error completing task:', error)
        res.status(500).json({
            status: 'FAILED',
            message: 'Internal server error' + error.message
        })
    }
}

exports.logoutUser = async (req, res) => {
    const userId = req.user.id
    try{
        const user = await userModel.findByPk(userId, {
            where: {status: 'active'}
        })
        if (!user) {
            return res.status(404).json({
                status: 'FAILED',
                message: 'User not found'
            })
        }

        if(user.status === 'deleted') {
            return res.status(404).json({
                status: 'FAILED',
                message: 'This account has been deactivated. If you believe this is an error, please contact support.'
            })
        }

        await FcmTokensModel.destroy({where: {userId}});

        res.status(200).json({
            status: 'SUCCESS',
            message: 'User logout successfully'
        })
    } catch (error) {
        console.error('Error deleting user:', error)
        res.status(500).json({
            status: 'FAILED',
            message: 'Internal server error' + error.message
        })
    }
}

