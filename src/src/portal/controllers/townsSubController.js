const SuburbsModel = require("../../common/models/suburbsModel")
const TownsModel = require("../../common/models/townsModel")

exports.getTowns = async (req, res) => {
    try {
        const towns = await TownsModel.findAll()

        if (!towns || towns.length === 0) {
            return res.status(404).json({
                status: 'FAILED',
                message: 'No towns found'
            })
        }

        return res.status(200).json({
            status: 'SUCCESS',
            message: 'Towns fetched successfully',
            towns
        })
    } catch (error) {
        console.error('Error fetching towns', error)
        return res.status(500).json({
            status: 'FAILED',
            message: 'Internal server error' + error.message
        })
    }
}

exports.getSuburbs = async (req, res) => {
    const {townId} = req.params
    try{
        const suburbs = await SuburbsModel.findAll({
            where: {
                townId: townId
            },
            attributes: {
                exclude: ['townId']
            }
        })

        return res.status(200).json({
            status: 'SUCCESS',
            message: 'Suburbs retrieved successfully',
            suburbs
        })
    } catch(error) {
        console.error('Error retrieving suburbs:', error)
        return res.status(500).json({
            status: 'FAILED',
            message: 'Failed to retrieve suburbs',
            error: error.message
        })
    }
}