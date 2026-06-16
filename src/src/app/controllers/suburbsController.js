const SuburbsModel = require("../../common/models/suburbsModel")

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