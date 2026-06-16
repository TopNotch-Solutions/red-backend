const advertsModel = require('../../common/models/advertsModel')
const { isEmpty } = require('../../common/services/isEmpty')
const { Op } = require('sequelize')
const redisClient = require('../../config/redis')

exports.createAdvert = async (req, res) => {
    try {
        const { title, description, link } = req.body
        if(!title || isEmpty(title)) {
            return res.status(400).json({
                status: 'FAILED',
                message: 'Title cannot be blank'
            })
        }

        if(!req.file){
            return res.status(400).json({
                status: 'FAILED',
                message: 'Image is required'
            })
        }

        const image = req.file.path

        const advert = await advertsModel.create({ title, description, link, image })
	await redisClient.del("adverts");
        res.status(201).json({
            status: 'SUCCESS',
            message: 'Advert created successfully',
            advert
        })
    } catch (error) {
        console.error('Error creating advert', error)
        res.status(500).json({
            status: 'FAILED',
            message: error.message
        })
    }
}

exports.getAdverts = async (req, res) => {
    try {
        const adverts = await advertsModel.findAll();
        res.status(200).json({
            status: "SUCCESS",
            message: "Adverts fetched successfully",
            adverts
        });
    } catch (error) {
        res.status(500).json({ status: "FAILED", message: error.message });
    }
}

exports.getAdvertById = async (req, res) => {
    try {
        const { id } = req.params;
        const advert = await advertsModel.findByPk(id);

        if (!advert) {
            return res.status(404).json({
                status: "FAILED",
                message: "Advert not found"
            });
        }

        res.status(200).json({
            status: "SUCCESS",
            message: "Advert fetched successfully",
            advert
        });
    } catch (error) {
        res.status(500).json({
            status: "FAILED",
            message: error.message
        });
    }
};

exports.updateAdvert = async (req, res) => {
    try {
        const { id } = req.params
        const { title, description, link } = req.body
        const image = req.file ? req.file.path : null

        const advert = await advertsModel.findByPk(id)

        if (!advert) {
            return res.status(404).json({
                status: 'FAILED',
                message: 'Advert not found'
            })
        }

        advert.title = title || advert.title
        advert.description = description
        advert.link = link 
        if (image) advert.image = image

        await advert.save()

        res.status(200).json({
            status: 'SUCCESS',
            message: 'Advert updated successfully',
            advert
        })
    } catch (error) {
        console.error('Error updating advert', error)
        res.status(500).json({
            status: 'FAILED',
            message: error.message
        })
    }
}

exports.deleteAdvert = async (req, res) => {
    const { advertIds } = req.body;

    if (!advertIds || !Array.isArray(advertIds) || advertIds.length === 0) {
        return res.status(400).json({
            status: 'FAILED',
            message: 'Advert IDs must be a non-empty array.'
        });
    }

    try {
        const deletedCount = await advertsModel.destroy({
            where: {
                id: {
                    [Op.in]: advertIds
                }
            }
        });

        if (deletedCount === 0) {
            return res.status(404).json({
                status: 'FAILED',
                message: 'No adverts found with the provided IDs'
            });
        }

        res.status(200).json({
            status: 'SUCCESS',
            message: `${deletedCount} advert(s) deleted successfully`
        });
    } catch (error) {
        console.error('Error deleting advert', error);
        res.status(500).json({
            status: 'FAILED',
            message: 'Internal server error: ' + error.message
        });
    }
};
