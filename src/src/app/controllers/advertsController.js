const advertsModel = require('../../common/models/advertsModel')
const {isEmpty} = require('../../common/services/isEmpty')

exports.getAdvert = async (req, res) => {
    try {
        const adverts = await advertsModel.findAll();
        res.status(200).json({
            status: "SUCCESS",
            message: "Adverts fetched successfully",
            adverts
        });
    } catch (error) {
        res.status(500).json({ status: "FAILED", message: error.message });
    }
};

exports.getAdvertById = async (req, res) => {
    try {
        const { id } = req.params;
        const advert = await advertsModel.findByPk(id);

        if(!id || isEmpty(id)) {
            return res.status(400).json({
                status: 'FAILED',
                message: 'ID cannot be blank'
            })
        }

        if (!advert) {
            return res.status(404).json({
                status: "FAILED",
                message: "Advert not found"
            });
        }

        res.status(200).json({
            status: "SUCCESS",
            message: "Advert fetched successfully",
            advert
        });
    } catch (error) {
        res.status(500).json({
            status: "FAILED",
            message: error.message
        });
    }
};