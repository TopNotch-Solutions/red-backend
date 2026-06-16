const TipItemsModel = require('../models/tipItemsModel')
const TipsModel = require('../models/tipsModel')

exports.getTips = async (req, res) => {
    try {
        const tips = await TipsModel.findAll({
            include: [TipItemsModel]
        })

        return res.status(200).json({
            status: 'SUCCESS',
            message: 'Tips retrieved successfully',
            tips
        })
    } catch (error) {
        console.error('Error', error)
        return res.status(500).json({
            status: 'FAILED',
            message: 'Internal server error ' + error.message
        })
    }
}