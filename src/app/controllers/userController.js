const FcmTokensModel = require('../../common/models/fcmTokensModel')
const userModel = require('../../common/models/usersModel')
const CapitalizeFirstLetter = require('../../common/services/capitalization')
const { isEmpty } = require('../../common/services/utils')
const MeterNumbersModel = require('../../common/models/meterNumbersModel')
const path = require('path')
const fs = require('fs')
const { where } = require('sequelize')
const usersModel = require('../../common/models/usersModel')

exports.getUserById = async (req, res) => {
    const id = req.user.id

    try {
        const user = await userModel.findByPk(id, {
            attributes: { 
                exclude: ['password'] 
            },
            include: [{
                model: MeterNumbersModel,
                attributes: ['id', 'meterNumber']
            }]
        })

        if (!user) {
            return res.status(404).json({
                status: 'FAILED',
                message: 'User not found'
            })
        }

        res.status(200).json({
            status: 'SUCCESS',
            message: 'User found',
            userData: user
        })
    } catch (error) {
        console.error('Error retrieving user:', error)
        res.status(500).json({
            status: 'FAILED',
            message: 'Internal server error' + error.message
        })
    }
}



exports.updateProfile = async (req, res) => {
    const userId = req.user.id;

    let {
        firstName,
        lastName,
        cellphoneNumber,
        email,
        address,
        profileImage: profileImageField,
        meterNumbers,
        primaryMeterNumber
    } = req.body;

    const uploadedProfileImage = req.file ? req.file.path : null;

    firstName = CapitalizeFirstLetter(firstName);
    lastName = CapitalizeFirstLetter(lastName);

    try {
        const user = await userModel.findOne({
            where: { id: userId, status: 'active' },
            attributes: {
                exclude: ['pin', 'password', 'fcmToken', 'accountNo', 'meter_type', '']
            }
        });

        if (!user) {
            return res.status(404).json({
                status: 'FAILED',
                message: 'User not found'
            });
        }

        const updateData = {
            firstName,
            lastName,
            cellphoneNumber,
            email,
            address,
            primaryMeterNumber
        };

        const currentProfileImage = user.profileImage;

        if (uploadedProfileImage) {
            updateData.profileImage = uploadedProfileImage;

            if (currentProfileImage) {
                const imagePath = path.resolve(currentProfileImage);
                if (fs.existsSync(imagePath)) {
                    fs.unlinkSync(imagePath);
                }
            }
        } else if (profileImageField === null || profileImageField === 'null') {
            updateData.profileImage = null;

            if (currentProfileImage) {
                const imagePath = path.resolve(currentProfileImage);
                if (fs.existsSync(imagePath)) {
                    fs.unlinkSync(imagePath);
                }
            }
        }

        await user.update(updateData);

        if (Array.isArray(meterNumbers)) {
            await MeterNumbersModel.destroy({ where: { userId } });

            const meterRecords = meterNumbers
                .filter(Boolean)
                .map(meterNumber => ({
                    userId,
                    meterNumber: meterNumber.trim()
                }));

            if (meterRecords.length > 0) {
                await MeterNumbersModel.bulkCreate(meterRecords);
            }
        }

        res.status(200).json({
            status: 'SUCCESS',
            message: 'User details updated successfully',
            data: user
        });
    } catch (error) {
        console.error('Error updating details:', error);
        res.status(500).json({
            status: 'FAILED',
            message: 'Internal server error' + error.message
        });
    }
}

exports.deleteProfileImage = async (req, res) => {
    try {

    } catch (error) {
        return res.status(500).json({
            status: 'FAILED',
            message: 'Internal server error: ' + error.message
        })
    }
}

exports.fcmToken = async (req, res) => {
    const userId = req.user.id
    const { fcmToken } = req.body

    try {
        if (!fcmToken || isEmpty(fcmToken)) {
            return res.status(400).json({
                status: 'FAILED',
                message: 'FCM token cannot be blank'
            })
        }

        const user = await userModel.findByPk(userId, {
            where: { status: 'active' },
        })

        if (!user) {
            return res.status(404).json({
                status: 'FAILED',
                message: 'User not found'
            })
        }

        const existingToken = await FcmTokensModel.findOne({ where: { userId, fcmToken } })

        if (existingToken) {
            return res.status(400).json({
                status: 'FAILED',
                message: 'FCM token already exists'
            })
        }

        await FcmTokensModel.create({
            userId: userId,
            fcmToken
        })

        res.status(200).json({
            status: 'SUCCESS',
            message: 'FCM token inserted successfully'
        })
    } catch (error) {
        console.error('Error updating fcm token:', error)
        res.status(500).json({
            status: "FAILED",
            message: 'Internal server error' + error.message
        })
    }
}


exports.deleteUser = async (req, res) => {
    const userId = req.user.id
    try{
        const user = await userModel.findByPk(userId, {
            where: {status: 'active'}
        })
        if (!user) {
            return res.status(404).json({
                status: 'FAILED',
                message: 'Invalid credentials. Please check the username or password and try again.'
            })
        }

        if(user.status === 'deleted') {
            return res.status(404).json({
                status: 'FAILED',
                message: 'This account has been deactivated. If you believe this is an error, please contact support.'
            })
        }

        await user.update({status: 'deleted'});
        await FcmTokensModel.destroy({where: {userId}});

        res.status(200).json({
            status: 'SUCCESS',
            message: 'User deleted successfully'
        })
    } catch (error) {
        console.error('Error deleting user:', error)
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

