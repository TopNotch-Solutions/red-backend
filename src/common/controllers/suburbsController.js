const TownsModel = require('../models/townsModel')
const SuburbsModel = require('../models/suburbsModel')

exports.getSuburbs = async (req, res) => {
    try {
        const suburbs = await SuburbsModel.findAll({
            include: [TownsModel],
            attributes: {
                exclude: ['townId']
            }
        })

        return res.status(200).json({
            status: 'SUCCESS',
            message: 'Suburbs fetched successfully',
            suburbs
        })
    } catch (error) {
        console.error('Error fetching suburbs', error)
        return res.status(500).json({
            status: 'FAILED',
            message: 'Internal server error' + error.message
        })
    }
}