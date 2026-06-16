const usersModel = require('../../common/models/usersModel')

exports.getAppUsers = async (req, res) => {
    try{
        const users = await usersModel.findAll({
            where: { userType: 'AppUser' },
            attributes: {
                exclude: ['password', 'pin', 'fcmToken']
            }
        })

        res.status(200).json({
            status: 'SUCCESS',
            message: 'App users retrieved successfully',
            users
        })
    } catch(error){
        console.error('Error retrieving app users:', error)
        res.status(500).json({
            status: 'FAILED',
            message: 'Internal server error' + error.message
        })
    }
}

exports.customersPerTown = async (req, res) => {
    try {
        const counts = await usersModel.findAll({
            where: { userType: 'AppUser' },
            attributes: [
                'town',
                [usersModel.sequelize.fn('COUNT', usersModel.sequelize.col('id')), 'userCount']
            ],
            group: ['town']
        });

        res.status(200).json({
            status: 'SUCCESS',
            message: 'Customer count per town retrieved successfully',
            data: counts
        });
    } catch (error) {
        console.error('Error retrieving customers per town:', error)
        res.status(500).json({
            status: 'FAILED',
            message: 'Internal server error' + error.message
        })
    }
}