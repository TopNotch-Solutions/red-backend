const TermsAndConditionsModel = require('../../common/models/termsAndConditionsModel')

exports.createTermsAndConditions = async (req, res) => {
    try {
        const { terms } = req.body
        if (!terms) {
            return res.status(400).json({
                status: 'FAILED',
                message: 'Terms and conditions text is required.'
            })
        }

        const newTerms = await TermsAndConditionsModel.create({ terms })
        return res.status(201).json({
            status: 'SUCCESS',
            message: 'Terms and conditions created successfully.',
            newTerms
        })
    } catch (error) {
        console.error('Error creating terms and conditions:', error)
        return res.status(500).json({ 
            status: 'FAILED',
            error: 'Internal server error' 
        })
    }
}

exports.getTermsAndConditions = async (req, res) => {
    try {
        const terms = await TermsAndConditionsModel.findAll()
        if (terms.length === 0) {
            return res.status(404).json({
                status: 'FAILED',
                message: 'No terms and conditions found.'
            })
        }
        return res.status(200).json({
            status: 'SUCCESS',
            terms
        })
    } catch (error) {
        console.error('Error fetching terms and conditions:', error)
        return res.status(500).json({ 
            status: 'FAILED',
            error: 'Internal server error' 
        })
    }
}

exports.updateTermsAndConditions = async (req, res) => {
    try {
        const { id } = req.params
        const { terms } = req.body

        if (!terms) {
            return res.status(400).json({
                status: 'FAILED',
                message: 'Terms and conditions text is required.'
            })
        }

        const [updated] = await TermsAndConditionsModel.update({ terms }, {
            where: { id }
        })

        if (updated) {
            const updatedTerms = await TermsAndConditionsModel.findByPk(id)
            return res.status(200).json({
                status: 'SUCCESS',
                message: 'Terms and conditions updated successfully.',
                updatedTerms
            })
        }
        return res.status(404).json({
            status: 'FAILED',
            message: 'Terms and conditions not found.'
        })
    } catch (error) {
        console.error('Error updating terms and conditions:', error)
        return res.status(500).json({ 
            status: 'FAILED',
            error: 'Internal server error' 
        })
    }
}

exports.deleteTermsAndConditions = async (req, res) => {
    try {
        const { id } = req.params
        const deleted = await TermsAndConditionsModel.destroy({
            where: { id }
        })

        if (deleted) {
            return res.status(200).json({
                status: 'SUCCESS',
                message: 'Terms and conditions deleted successfully.'
            })
        }
        return res.status(404).json({
            status: 'FAILED',
            message: 'Terms and conditions not found.'
        })
    } catch (error) {
        console.error('Error deleting terms and conditions:', error)
        return res.status(500).json({ 
            status: 'FAILED',
            error: 'Internal server error' 
        })
    }
}