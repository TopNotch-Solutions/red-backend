const PendingPaymentsModel = require("../../common/models/pendingPaymentsModel")

exports.getPayments = async (req, res) => {
    try{
        const payments = await PendingPaymentsModel.findAll()

        return res.status(200).json({
            status: 'SUCCESS',
            message: 'Payments received successfully',
            payments
        })
    } catch(error){
        console.error('An error occurred', error)
        return res.status(500).json({
            status: 'FAILED',
            message: 'Internal server error ' + error.message
        })
    }
}