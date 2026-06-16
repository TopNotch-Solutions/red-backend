const newsModel = require('../../common/models/newsModel')
const { isEmpty } = require('../../common/services/isEmpty')

exports.getNews = async (req, res) => {
    try {
        const news = await newsModel.findAll()
        res.status(200).json({
            status: 'SUCCESS',
            news
        })
    } catch (error) {
        console.error('Error fetching news', error)
        res.status(500).json({
            status: 'FAILED',
            message: error.message
        })
    }
}

exports.getNewsById = async (req, res) => {
    const { id } = req.params
    if (!id || isEmpty(id)) {
        return res.status(400).json({
            status: 'FAILED',
            message: 'ID cannot be blank'
        })
    }
    try {
        const news = await newsModel.findByPk(id)
        if (!news) {
            return res.status(404).json({
                status: 'FAILED',
                message: 'News not found'
            })
        }
        res.status(200).json({
            status: 'SUCCESS',
            news
        })
    } catch (error) {
        console.error('Error fetching news', error)
        res.status(500).json({
            status: 'FAILED',
            message: error.message
        })
    }
}