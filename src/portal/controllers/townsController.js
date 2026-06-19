const TownsModel = require('../../common/models/townsModel')
const { isEmpty } = require('../../common/services/utils')
const { Op } = require('sequelize')
const redisClient = require('../../config/redis')

exports.createTown = async (req, res) => {
    try {
        const { town } = req.body

        if(!town || isEmpty(town)){
            return res.status(400).json({
                status: 'FAILED',
                message: 'Town cannot be blank'
            })
        }

        const existingTown = await TownsModel.findOne({ where: { town } })

        if (existingTown) {
            return res.status(400).json({
                status: 'FAILED',
                message: 'Town already exists'
            })
        }

        const newTown = await TownsModel.create({ town })
	await redisClient.del("towns");
        return res.status(201).json({
            status: 'SUCCESS',
            message: 'Town created successfully',
            town: newTown
        })
    } catch(error){
        console.error('Error creating town', error)
        return res.status(500).json({
            status: 'FAILED',
            message: 'Internal server error' + error.message
        })
    }
}

exports.updateTown = async (req, res) => {
    const { townId } = req.params
    const { town } = req.body

    if (!town || isEmpty(town)) {
        return res.status(400).json({
            status: 'FAILED',
            message: 'Town cannot be blank'
        })
    }

    try {
        const existingTown = await TownsModel.findByPk(townId)

        if (!existingTown) {
            return res.status(404).json({
                status: 'FAILED',
                message: 'Town not found'
            })
        }

        existingTown.town = town
        await existingTown.save()
        await redisClient.del("towns");
        return res.status(200).json({
            status: 'SUCCESS',
            message: 'Town updated successfully',
            town: existingTown
        })
    } catch (error) {
        console.error('Error updating town', error)
        return res.status(500).json({
            status: 'FAILED',
            message: 'Internal server error' + error.message
        })
    }
}

exports.deleteTown = async (req, res) => {
    const { townIds } = req.body;

    if (!townIds || !Array.isArray(townIds) || townIds.length === 0) {
        return res.status(400).json({
            status: 'FAILED',
            message: 'Town IDs must be a non-empty array'
        });
    }

    try {
        const deletedCount = await TownsModel.destroy({
            where: {
                id: {
                    [Op.in]: townIds
                }
            }
        });

        if (deletedCount === 0) {
            return res.status(404).json({
                status: 'FAILED',
                message: 'No towns found with the provided IDs'
            });
        }
        await redisClient.del("towns");
        return res.status(200).json({
            status: 'SUCCESS',
            message: `${deletedCount} town(s) deleted successfully`
        });
    } catch (error) {
        console.error('Error deleting town', error);
        return res.status(500).json({
            status: 'FAILED',
            message: 'Internal server error' + error.message
        });
    }
};
