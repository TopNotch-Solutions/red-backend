const IssueImageModel = require('../../common/models/issueImagesModel')
const IssuesModel = require('../../common/models/issuesModel')
const User = require('../models/UserModel')

exports.getAllIssues = async (req, res) => {
    try {
        const issues = await IssuesModel.findAll({
            include: [
                {
                    model: IssueImageModel,
                    as: 'images',
                },
            ]
        })
        res.status(200).json({
            status: "SUCCESS",
            message: 'Issues retrieved successfully',
            issues: issues
        })
    } catch (error) {
        console.error('Error retrieving issues:', error)
        res.status(500).json({
            status: "FAILED",
            message: 'Internal server error' + error.message
        })
    }
}

exports.issueStats = async (req, res) => {
    try {
        const completedTasks = await IssuesModel.count({
            where: {
                status: 'Completed'
            }
        })

        const InProgressTasks = await IssuesModel.count({
            where: {
                status: 'In Progress'
            }
        })

        const pendingTasks = await IssuesModel.count({
            where: {
                status: 'Pending'
            }
        })

        const unAssigned = await IssuesModel.count({
            where: {
                isAssigned: false
            }
        })
        res.status(200).json({
            status: 'SUCCESS',
            message: 'Task status details retrieved successfully',
            stats: {
                pending: pendingTasks,
                inProgress: InProgressTasks,
                completed: completedTasks,
                unAssigned: unAssigned
            }
        })
    } catch (error) {
        console.error('An error occurred while retrieving task stats:', error)
        return res.status(500).json({
            status: 'FAILED',
            message: 'Internal server error' + error.message
        })
    }
}