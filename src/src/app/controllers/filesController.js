const FilesModel = require('../../common/models/formsModel')

exports.getFiles = async (req, res) => {
    try{
        const files = await FilesModel.findAll()

        return res.status(200).json({
            status: 'SUCCESS',
            message: 'Files retrieved successfully',
            files
        })
    } catch(error){
        console.error('Error: ', error)
        return res.status(500).json({
            status: 'FAILED',
            message: 'Internal server error: ' + error.message
        })
    }
}