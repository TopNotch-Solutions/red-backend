const FilesModel = require('../../common/models/formsModel')
const fs = require('fs')
const { isEmpty } = require('../../common/services/utils')
const fsp = require('fs').promises
const { Op } = require('sequelize')

exports.uploadFile = async (req, res) => {
    try {
        const {title, description} = req.body

        if (!req.file) {
            return res.status(400).json({
                status: 'FAILED',
                message: 'No file uploaded'
            })
        }

        if(!title || isEmpty(title)){
            return res.status(400).json({
                status: 'FAILED',
                message: 'Title cannot be blank'
            })
        }

        if(!description || isEmpty(description)){
            return res.status(400).json({
                status: 'FAILED',
                message: 'Description cannot be blank'
            })
        }

        const { originalname, path, size } = req.file

        await FilesModel.create({
            fileName: originalname,
            filePath: path,
            size: req.file.size,
            title,
            description
        })

        res.status(201).json({
            status: 'SUCCESS',
            message: 'File uploaded successfully'
        })
    } catch (error) {
        console.error('Error saving file', error)
        return res.status(500).json({
            status: 'FAILED',
            message: 'Internal server error ' + error.message
        })
    }
}
exports.updateFile = async (req, res) => {
    // Expecting an array of file IDs in the request body
    const { title, description } = req.body;
    const { id } = req.params;

    if (!title || isEmpty(title)) {
    return res.status(400).json({
      status: "FAILED",
      message: "Title cannot be blank",
    });
  }

  if (!description || isEmpty(description)) {
    return res.status(400).json({
      status: "FAILED",
      message: "Description cannot be blank",
    });
  }

  if (!id || isEmpty(id)) {
    return res.status(400).json({
      status: "FAILED",
      message: "File ID cannot be blank",
    });
  }

    try {
        
        const fileRecord = await FilesModel.findOne({ where: { id } });

        if (!fileRecord) {
            return res.status(404).json({
                status: 'FAILED',
                message: 'No file found with the provided ID'
            });
        }
        // Update the title and description
        fileRecord.title = title;
        fileRecord.description = description;
        await fileRecord.save();
        return res.status(200).json({
            status: 'SUCCESS',
            message: 'File updated successfully'
        });
    } catch (error) {
        console.error('Error: ', error);
        return res.status(500).json({
            status: 'FAILED',
            message: 'Internal server error: ' + error.message
        });
    }
};
exports.deleteFile = async (req, res) => {
    // Expecting an array of file IDs in the request body
    const { fileIds } = req.body;

    if (!fileIds || !Array.isArray(fileIds) || fileIds.length === 0) {
        return res.status(400).json({
            status: "FAILED",
            message: "File IDs must be a non-empty array."
        });
    }

    try {
        // Find all files that match the provided IDs
        const filesToDelete = await FilesModel.findAll({
            where: {
                id: {
                    [Op.in]: fileIds
                }
            }
        });

        if (filesToDelete.length === 0) {
            return res.status(404).json({
                status: 'FAILED',
                message: 'No files found with the provided IDs'
            });
        }

        const deletedFilesCount = filesToDelete.length;

        // Iterate and delete each file from the file system
        for (const file of filesToDelete) {
            if (fs.existsSync(file.filePath)) {
                try {
                    await fsp.unlink(file.filePath);
                } catch (error) {
                    console.error('Error deleting file from disk: ', error);
                    // Continue to the next file if one fails, but log the error
                }
            }
        }

        // Delete all the file records from the database in a single query
        const deletedDbRecords = await FilesModel.destroy({
            where: {
                id: {
                    [Op.in]: fileIds
                }
            }
        });

        return res.status(200).json({
            status: 'SUCCESS',
            message: `${deletedDbRecords} file(s) deleted successfully`
        });
    } catch (error) {
        console.error('Error: ', error);
        return res.status(500).json({
            status: 'FAILED',
            message: 'Internal server error: ' + error.message
        });
    }
};