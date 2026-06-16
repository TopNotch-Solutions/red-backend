const MeterReadingModel = require('../../common/models/meterReadingModel')

exports.getMeterReadings = async (req, res) => {
    try {
        const meterReadings = await MeterReadingModel.findAll()

        res.status(200).json({
            status: 'SUCCESS',
            message: 'Meter readings retrieved successfully',
            data: meterReadings
        })
    } catch (error) {
        console.error('Error retrieving meter readings:', error)
        res.status(500).json({
            status: 'FAILED',
            message: 'Internal server error' + error.message
        })
    }
}