const FilesModel = require('../../common/models/formsModel')
const redisClient = require('../../config/redis');
const { CACHE_TTL } = require('../../common/middlewares/cache');

exports.getFiles = async (req, res) => {
    try{
        const files = await FilesModel.findAll()
	await redisClient.setEx(
      "files",
      CACHE_TTL,
      JSON.stringify(files)
    );
        return res.status(200).json({
            status: 'SUCCESS',
            message: 'Files retrieved successfully',
            data: files
        })
    } catch(error){
        console.error('Error: ', error)
        return res.status(500).json({
            status: 'FAILED',
            message: 'Internal server error: ' + error.message
        })
    }
}
