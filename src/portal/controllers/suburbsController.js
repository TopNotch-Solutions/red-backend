const SuburbsModel = require('../../common/models/suburbsModel')
const TownsModel = require('../../common/models/townsModel')
const { isEmpty } = require('../../common/services/utils')
const { Op } = require('sequelize')
const redisClient = require('../../config/redis')

exports.createSuburb = async (req, res) => {
    const { suburb, townId } = req.body

    if (!suburb || isEmpty(suburb)) {
        return res.status(400).json({
            status: 'FAILED',
            message: 'Suburb cannot be blank'
        })
    }

    if (!townId || isEmpty(townId)) {
        return res.status(400).json({
            status: 'FAILED',
            message: 'Town ID cannot be blank'
        })
    }

    try {
        const existingSuburb = await SuburbsModel.findOne({ where: { suburb } })

        if (existingSuburb) {
            return res.status(400).json({
                status: 'FAILED',
                message: 'Suburb already exists'
            })
        }

        const town = await TownsModel.findByPk(townId)
        if (!town) {
            return res.status(404).json({
                status: 'FAILED',
                message: 'Town not found or invalid town ID'
            })
        }

        const newSuburb = await SuburbsModel.create({ suburb, townId })
	await redisClient.del("suburbs");
        return res.status(201).json({
            status: 'SUCCESS',
            message: 'Suburb created successfully',
            suburb: newSuburb
        })
    } catch (error) {
        console.error('Error creating suburb', error)
        return res.status(500).json({
            status: 'FAILED',
            message: 'Internal server error' + error.message
        })
    }
}

exports.updateSuburb = async (req, res) => {
    const { suburbId } = req.params
    const { suburb } = req.body

    if (!suburb || isEmpty(suburb)) {
        return res.status(400).json({
            status: 'FAILED',
            message: 'Suburb cannot be blank'
        })
    }

    try {
        const existingSuburb = await SuburbsModel.findByPk(suburbId)

        if (!existingSuburb) {
            return res.status(404).json({
                status: 'FAILED',
                message: 'Suburb not found'
            })
        }

        existingSuburb.suburb = suburb

        await existingSuburb.save()

        return res.status(200).json({
            status: 'SUCCESS',
            message: 'Suburb updated successfully',
            suburb: existingSuburb
        })
    } catch (error) {
        console.error('Error updating suburb', error)
        return res.status(500).json({
            status: 'FAILED',
            message: 'Internal server error' + error.message
        })
    }
}

exports.deleteSuburb = async (req, res) => {
    const { suburbIds } = req.body;

    if (!suburbIds || !Array.isArray(suburbIds) || suburbIds.length === 0) {
        return res.status(400).json({
            status: 'FAILED',
            message: 'Suburb IDs must be a non-empty array'
        });
    }

    try {
        const deletedCount = await SuburbsModel.destroy({
            where: {
                id: {
                    [Op.in]: suburbIds
                }
            }
        });

        if (deletedCount === 0) {
            return res.status(404).json({
                status: 'FAILED',
                message: 'No suburbs found with the provided IDs'
            });
        }

        return res.status(200).json({
            status: 'SUCCESS',
            message: `${deletedCount} suburb(s) deleted successfully`
        });
    } catch (error) {
        console.error('Error deleting suburb', error);
        return res.status(500).json({
            status: 'FAILED',
            message: 'Internal server error' + error.message
        });
    }
};
