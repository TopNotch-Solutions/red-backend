const usersModel = require('../../common/models/usersModel')
const User = require('../models/UserModel')
const CapitalizeFirstLetter = require('../../common/services/capitalization')
const bcrypt = require('bcrypt')
const { isEmpty } = require('../../common/services/isEmpty')
const fs = require('fs')
const fsp = require('fs').promises;
const path = require('path')
const { isValidPassword } = require('../../common/services/utils')
const OtpModel = require('../../common/models/otpModel')
const crypto = require('crypto')
const { Op } = require('sequelize')

exports.getUserById = async (req, res) => {
    const id = req.user.id

    try {
        const user = await User.findByPk(id, {
            attributes: { exclude: ['password'] }
        })

        if (!user) {
            return res.status(404).json({ message: "User not found" })
        }
        res.status(200).json({
            status: 200,
            message: "User found",
            userData: user
        })
    } catch (error) {
        console.error('Error retrieving user: ', error)
        res.status(500).json({
            status: 'FAILED',
            message: `An error occurred while retrieving the user` + error.message
        })
    }
}

exports.getUserStats = async (req, res) => {
    try {
        const totalUsers = await usersModel.count({
            where: { userType: 'AppUser' }
        })

        const totalPrepaidUsers = await usersModel.count({
            where: { customerType: 'Prepaid' }
        })
        const totalPostpaidUsers = await usersModel.count({
            where: { customerType: 'Postpaid' }
        })

        res.status(200).json({
            status: 200,
            message: 'Statistics successfully retrieved',
            data: {
                totalUsers: totalUsers,
                totalPrepaidUsers: totalPrepaidUsers,
                totalPostpaidUsers: totalPostpaidUsers
            }
        })
    } catch (error) {
        console.error('Error retrieving user statistics:', error)
        res.status(500).json({
            status: 500,
            message: `Internal server error ${error}`
        })
    }
}

exports.getUsers = async (req, res) => {
    try {
        const users = await User.findAll({
            attributes: {
                exclude: ['password']
            }
        })

        res.status(200).json({
            message: 'Users retrieved successfully',
            users
        })
    } catch (error) {
        console.error('Error', error)
        res.status(500).json({
            status: 'FAILED',
            message: 'Internal server error' + error.message
        })
    }
}

exports.updateProfile = async (req, res) => {
    const id = req.user.id;

    let { firstName, lastName, email, cellphoneNumber, department, position } = req.body
    console.log('Request Body:', req.body);

    firstName = CapitalizeFirstLetter(firstName);
    lastName = CapitalizeFirstLetter(lastName);
    department = CapitalizeFirstLetter(department);
    position = CapitalizeFirstLetter(position);

    try {
        const user = await User.findByPk(id)

        if (!user) {
            return res.status(404).json({
                status: 404,
                message: 'User not found'
            })
        }

        const updateUser = await user.update({
            firstName,
            lastName,
            email,
            cellphoneNumber,
            department,
            position
        })
        res.status(200).json({
            status: 200,
            message: 'User details updated successully',
            data: updateUser
        })
    } catch (error) {
        console.error("An error occurred: ", error)
        return res.status(500).json({
            status: 'FAILED',
            message: `Internal server error` + error.message
        })
    }
}
exports.accountStatus = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({
      status: "FAILED",
      message: "Email is required",
    });
  }

  try {
    const user = await usersModel.findOne({
      where: { email, status: "active" },
    });
    console.log("Account status check for email:", email, "Result:", !!user);
    return res.status(200).json({
      status: "SUCCESS",
      data: !!user, // returns true if user found, false if not
    });
  } catch (error) {
    console.error("Error checking account status:", error);
    res.status(500).json({
      status: "FAILED",
      message: "Internal server error: " + error.message,
    });
  }
};
exports.deleteUser = async (req, res) => {
    const { userIds } = req.body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
        return res.status(400).json({
            status: 'FAILED',
            message: 'User IDs must be a non-empty array'
        });
    }

    try {
        const deletedCount = await User.destroy({
            where: {
                id: {
                    [Op.in]: userIds
                }
            }
        });

        if (deletedCount === 0) {
            return res.status(404).json({
                status: 'FAILED',
                message: 'No users found with the provided IDs'
            });
        }

        res.status(200).json({
            status: 'SUCCESS',
            message: `${deletedCount} user(s) deleted successfully`
        });
    } catch (error) {
        console.error('Error', error);
        return res.status(500).json({
            status: 'FAILED',
            message: 'Internal server error' + error.message
        });
    }
};

exports.changePassword = async (req, res) => {
    const userId = req.user.id
    const { newPassword, currentPassword } = req.body

    if (!newPassword || isEmpty(newPassword)) {
        return res.status(400).json({
            status: 'FAILED',
            message: 'New password cannot be blank'
        })
    }

    if (!currentPassword || isEmpty(currentPassword)) {
        return res.status(400).json({
            status: 'FAILED',
            message: 'Current password cannot be blank'
        })
    }

    try {
        const user = await User.findByPk(userId)

        if (!user) {
            return res.status(404).json({
                status: 'FAILED',
                message: 'User not found'
            })
        }

        const passwordMatch = await bcrypt.compare(currentPassword, user.password)

        if (!passwordMatch) {
            return res.status(400).json({
                status: 'FAILED',
                message: 'Password does not match current password'
            })
        }

        if (!isValidPassword(newPassword)) {
            return res.status(400).json({
                status: 'FAILED',
                message: 'Password must be at least 8 characters long, contain at least one uppercase letter, one lower case letter, and one number'
            })
        }

        const newPasswordIsSame = await bcrypt.compare(newPassword, user.password)

        if (newPasswordIsSame) {
            return res.status(400).json({
                status: 'FAILED',
                message: 'New password cannot be the same as the current password'
            })
        }

        const salt = await bcrypt.genSalt(12)
        const hashedPassword = await bcrypt.hash(newPassword, salt)

        await user.update({ password: hashedPassword }, { where: { id: userId } })

        res.status(200).json({
            status: 'SUCCESS',
            message: 'Password changed successfully'
        })
    } catch (error) {
        console.error('Error', error)
        return res.status(500).json({
            status: 'FAILED',
            message: 'Internal server error' + error.message
        })
    }
}

exports.updateProfileImage = async (req, res) => {
    try {
        const profileImage = req.file ? req.file.path : null
        const userId = req.user.id

        const user = await User.findByPk(userId)

        await user.update({ profileImage })

        return res.status(201).json({
            status: 'SUCCESS',
            message: 'Profile image updated successfully'
        })
    } catch (error) {
        console.error('Error', error.message)
        return res.status(500).json({
            status: 'FAILED',
            message: 'Internal server error ' + error.message
        })
    }
}

exports.deleteProfileImage = async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await User.findByPk(userId);

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

exports.updateUser = async (req, res) => {
    try {
        const { userId } = req.params
        const { firstName, lastName, email, cellphoneNumber, department, position,role } = req.body;

        console.log('Request Body:', req.body);

        const user = await User.findByPk(userId)
        if (!user) {
            return res.status(404).json({
                status: 'FAILED',
                message: 'User not found'
            })
        }
        await user.update({
            firstName: CapitalizeFirstLetter(firstName),
            lastName: CapitalizeFirstLetter(lastName),
            email,
            role,
            cellphoneNumber,
            department: CapitalizeFirstLetter(department),
            position: CapitalizeFirstLetter(position)
        })
        res.status(200).json({
            status: 'SUCCESS',
            message: 'User updated successfully'
        })
    } catch (error) {
        console.error('Error updating user', error)
        res.status(500).json({
            status: 'FAILED',
            message: error.message
        })
    }
}

exports.updateRole = async (req, res) => {
    try {
        const { userId } = req.params
        const { role } = req.body

        const user = User.findByPk(userId)

        if (user.role === role) {
            return res.status(304).json({
                message: 'FAILED',
                message: 'The role did not'
            })
        }

        await user.update({
            where: { id: userId }
        })

        return res.status(200).json({
            status: 'SUCCESS',
            message: 'Role updated successfully'
        })
    } catch (error) {
        return res.status(500).json({
            status: 'FAILED',
            message: 'Internal server error'
        })
    }
}