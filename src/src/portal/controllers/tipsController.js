const TipItemsModel = require('../../common/models/tipItemsModel')
const TipsModel = require('../../common/models/tipsModel')
const { isEmpty } = require('../../common/services/utils')
const sequelize = require('../../config/db')
const { Op } = require('sequelize')
const fs = require('fs')
const fsp = require('fs').promises;

exports.createTips = async (req, res) => {
    try {
        const { title, tips } = req.body
        const image = req.file ? req.file.path : null

        if (!title || isEmpty(title)) {
            return res.status(400).json({
                status: 'FAILED',
                message: 'Title cannot be blank'
            })
        }

        if (!tips || isEmpty(tips)) {
            return res.status(400).json({
                status: 'FAILED',
                message: 'Tips cannot be blank'
            })
        }

        let parsedTips

        try {
            parsedTips = typeof tips === 'string' ? JSON.parse(tips) : tips
        } catch (error) {
            return res.status(400).json({
                status: 'FAILED',
                message: 'Invalid tips format. Must be a valid JSON array'
            })
        }

        const transaction = await sequelize.transaction()

        try {
            const tip = await TipsModel.create({ title, image }, { transaction })

            const tipsItemsData = parsedTips.map(tipText => ({
                tipId: tip.id,
                tip: tipText
            }))

            await TipItemsModel.bulkCreate(tipsItemsData, { transaction })

            await transaction.commit()

            return res.status(201).json({
                status: 'SUCCESS',
                message: 'Tip created successfully'
            })
        } catch (error) {
            await transaction.rollback()
            console.error('Error:', error)
            return res.status(500).json({
                status: 'FAILED',
                message: 'Internal server error ' + error.message
            })
        }
    } catch (error) {
        console.error('Error', error)
        return res.status(500).json({
            status: 'FAILED',
            message: 'Internal server error ' + error.message
        })
    }
}

exports.deleteTips = async (req, res) => {
    const { tipIds } = req.body;

    if (!tipIds || !Array.isArray(tipIds) || tipIds.length === 0) {
        return res.status(400).json({
            status: 'FAILED',
            message: 'Tip IDs must be a non-empty array'
        });
    }

    try {
        const deletedCount = await TipsModel.destroy({
            where: {
                id: {
                    [Op.in]: tipIds
                }
            }
        });

        if (deletedCount === 0) {
            return res.status(404).json({
                status: 'FAILED',
                message: 'No tips found with the provided IDs'
            });
        }

        return res.status(200).json({
            status: 'SUCCESS',
            message: `${deletedCount} tip(s) deleted successfully`
        });
    } catch (error) {
        console.error('Error: ', error.message);
        return res.status(500).json({
            status: 'FAILED',
            message: 'Internal server error'
        });
    }
};

exports.deleteSingleTip = async (req, res) => {
    try {
        const { tipId } = req.params
        const tip = await TipItemsModel.findByPk(tipId)
        if (!tip) {
            return res.status(404).json({
                status: 'FAILED',
                message: 'Tip not found'
            })
        }
        await tip.destroy()
        return res.status(200).json({
            status: 'SUCCESS',
            message: 'Tip deleted successfully'
        })
    } catch (error) {
        return res.status(500).json({
            status: 'FAILED',
            message: 'Something went wrong while deleting the tip: ' + error.message
        })
    }
}

exports.addSingleTip = async (req, res) => {
    try {
        const { tipId } = req.params
        const { tips } = req.body

        const tip = await TipsModel.findByPk(tipId)

        if (!tip) {
            return res.status(404).json({
                status: 'FAILED',
                message: 'Tip not found'
            })
        }

        if (!tips) {
            return res.status(400).json({
                status: 'FAILED',
                message: 'Tips cannot be blank'
            })
        }

        let parsedTips

        try {
            parsedTips = typeof tips === 'string' ? JSON.parse(tips) : tips
        } catch (error) {
            return res.status(400).json({
                status: 'FAILED',
                message: 'Invalid tips format. Must be a valid JSON array'
            })
        }

        const transaction = await sequelize.transaction()

        try {
            const tipsItemsData = parsedTips.map(tipText => ({
                tipId: tipId,
                tip: tipText
            }))

            await TipItemsModel.bulkCreate(tipsItemsData, { transaction })

            await transaction.commit()

            return res.status(201).json({
                status: 'SUCCESS',
                message: 'Tip add successfully'
            })
        } catch (error) {
            await transaction.rollback()
            return res.status(500).json({
                status: 'FAILED',
                message: 'Something went wrong'
            })
        }
    } catch (error) {
        return res.status(500).json({
            status: 'FAILED',
            message: 'Internal server error'
        })
    }
}

exports.updateTips = async (req, res) => {
    try {
        const { tipId } = req.params;
        const { title } = req.body;
        const image = req.file ? req.file.path : null;
        let { tips } = req.body;

        const existingTip = await TipsModel.findByPk(tipId);
        if (!existingTip) {
            return res.status(404).json({
                status: 'FAILED',
                message: 'Tip not found'
            });
        }

        let parsedTips = [];

        try {
            if (typeof tips === 'string') {
                parsedTips = JSON.parse(tips.trim());
            } else {
                return res.status(400).json({
                    status: 'FAILED',
                    message: 'Invalid tips format. Must be a valid JSON string'
                });
            }

            if (!Array.isArray(parsedTips)) {
                return res.status(400).json({
                    status: 'FAILED',
                    message: 'Invalid tips format. Must be an array'
                });
            }
        } catch (error) {
            console.error("JSON Parse Error:", error);
            return res.status(400).json({
                status: 'FAILED',
                message: 'Invalid tips format. Must be a valid JSON array'
            });
        }

        const transaction = await sequelize.transaction();
        try {
            await existingTip.update(
                { title, image: image},
                { transaction }
            );

            for (const tipItem of parsedTips) {
                if (tipItem.deleted) {
                    await TipItemsModel.destroy({
                        where: { id: tipItem.id, tipId },
                        transaction
                    });
                } else if (tipItem.id) {
                    await TipItemsModel.update(
                        { tip: tipItem.tip },
                        { where: { id: tipItem.id, tipId }, transaction }
                    );
                } else {
                    await TipItemsModel.create(
                        { tipId, tip: tipItem.tip },
                        { transaction }
                    );
                }
            }

            await transaction.commit();

            return res.status(200).json({
                status: 'SUCCESS',
                message: 'Tips updated successfully'
            });
        } catch (error) {
            await transaction.rollback();
            console.error('Error:', error);
            return res.status(500).json({
                status: 'FAILED',
                message: 'Internal server error: ' + error.message
            });
        }
    } catch (error) {
        console.error('Error:', error);
        return res.status(500).json({
            status: 'FAILED',
            message: 'Internal server error: ' + error.message
        });
    }
};

exports.deleteTipImage = async (req, res) => {
    try {
        const { tipId } = req.params;
        const tip = await TipsModel.findByPk(tipId);

        if (!tip) {
            return res.status(404).json({
                status: 'FAILED',
                message: 'Tip not found'
            });
        }

        if (!tip.image) {
            return res.status(400).json({
                status: 'FAILED',
                message: 'No image to delete'
            });
        }

        const imagePath = tip.image;

        if (fs.existsSync(imagePath)) {
            try {
                await fsp.unlink(imagePath);
            } catch (unlinkErr) {
                console.error('Error deleting file:', unlinkErr);
                return res.status(500).json({
                    status: 'FAILED',
                    message: 'Error deleting tip image'
                });
            }
        }

        await tip.update({ image: null });

        return res.status(200).json({
            status: 'SUCCESS',
            message: 'Tip image deleted successfully'
        });

    } catch (error) {
        console.error('Error:', error.message);
        return res.status(500).json({
            status: 'FAILED',
            message: 'Internal server error: ' + error.message
        });
    }
}