const TipItemsModel = require('../models/tipItemsModel')
const TipsModel = require('../models/tipsModel')
const redisClient = require('../../config/redis');
const { CACHE_TTL } = require('../middlewares/cache');

exports.getTips = async (req, res) => {
    try {
        const tips = await TipsModel.findAll({
            include: [TipItemsModel]
        })
	await redisClient.setEx(
      "tips",
      CACHE_TTL,
      JSON.stringify(tips)
    );
        return res.status(200).json({
            status: 'SUCCESS',
            message: 'Tips retrieved successfully',
           data:  tips
        })
    } catch (error) {
        console.error('Error', error)
        return res.status(500).json({
            status: 'FAILED',
            message: 'Internal server error ' + error.message
        })
    }
}
