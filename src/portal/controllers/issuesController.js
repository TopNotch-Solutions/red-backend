const IssueImageModel = require('../../common/models/issueImagesModel')
const IssuesModel = require('../../common/models/issuesModel')
const User = require('../models/UserModel')
const sequelize = require('../../config/db')

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

exports.getDashboardStatistics = async (req, res) => {
  try {
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const currentYear = new Date().getFullYear();
    const previousYear = currentYear - 1;

    const [
      systemMetrics,
      topElectricians,
      slowestResponders,
      workloadPerElectrician,
      activeElectricians,
      totalIssuesToday,
      monthlyIssuesRaw,
      dailyIssuesCompleted,
      completionRate
    ] = await Promise.all([

      // ---------------- SYSTEM METRICS ----------------
      sequelize.query(`
        SELECT
          COUNT(dateAssigned) AS totalAssigned,
          COUNT(dateAccepted) AS totalAccepted,
          COUNT(dateCompleted) AS totalCompleted,
          AVG(TIMESTAMPDIFF(MINUTE, i.createdAt, s.dateAssigned)) AS avgAssignmentTime,
          AVG(TIMESTAMPDIFF(MINUTE, s.dateAssigned, s.dateAccepted)) AS avgResponseTime,
          AVG(TIMESTAMPDIFF(MINUTE, s.dateAssigned, s.dateCompleted)) AS avgCompletionTime
        FROM issue_statistics s
        JOIN issues i ON i.id = s.issueId
      `),

      // ---------------- TOP ELECTRICIANS ----------------
      sequelize.query(`
        SELECT 
          s.electricianId,
          u.firstName,
          u.lastName,
          COUNT(*) AS totalCompleted,
          AVG(TIMESTAMPDIFF(MINUTE, s.dateAssigned, s.dateCompleted)) AS avgCompletionTime
        FROM issue_statistics s
        LEFT JOIN users u ON u.id = s.electricianId
        WHERE s.dateCompleted IS NOT NULL
        GROUP BY s.electricianId
        ORDER BY totalCompleted DESC
        LIMIT 5
      `),

      // ---------------- SLOWEST RESPONDERS ----------------
      sequelize.query(`
        SELECT
          s.electricianId,
          u.firstName,
          u.lastName,
          AVG(TIMESTAMPDIFF(MINUTE, s.dateAssigned, s.dateAccepted)) AS avgResponseTime
        FROM issue_statistics s
        LEFT JOIN users u ON u.id = s.electricianId
        WHERE s.dateAccepted IS NOT NULL
        GROUP BY s.electricianId
        ORDER BY avgResponseTime DESC
        LIMIT 5
      `),

      // ---------------- WORKLOAD PER ELECTRICIAN ----------------
      sequelize.query(`
        SELECT
          s.electricianId,
          u.firstName,
          u.lastName,
          COUNT(*) AS totalAssigned
        FROM issue_statistics s
        LEFT JOIN users u ON u.id = s.electricianId
        WHERE s.dateAssigned IS NOT NULL
        GROUP BY s.electricianId
      `),

      // ---------------- ACTIVE ELECTRICIANS ----------------
      sequelize.query(`
        SELECT
          s.electricianId,
          u.firstName,
          u.lastName,
          COUNT(*) AS activeIssues
        FROM issue_statistics s
        LEFT JOIN users u ON u.id = s.electricianId
        WHERE s.dateAccepted IS NOT NULL AND s.dateCompleted IS NULL
        GROUP BY s.electricianId
      `),

      // ---------------- TOTAL ISSUES TODAY ----------------
      sequelize.query(`
        SELECT COUNT(*) AS totalIssuesToday
        FROM issues
        WHERE DATE(createdAt) = CURDATE()
      `),

      // ---------------- MONTHLY ISSUES COMPARISON ----------------
      sequelize.query(`
        SELECT
          YEAR(createdAt) AS year,
          MONTH(createdAt) AS month,
          COUNT(*) AS totalIssues
        FROM issues
        WHERE YEAR(createdAt) IN (${currentYear}, ${previousYear})
        GROUP BY YEAR(createdAt), MONTH(createdAt)
      `),

      // ---------------- DAILY ISSUES COMPLETED ----------------
      sequelize.query(`
        SELECT
          DATE(dateCompleted) AS day,
          COUNT(*) AS issuesCompleted
        FROM issue_statistics
        WHERE dateCompleted IS NOT NULL
        GROUP BY DATE(dateCompleted)
        ORDER BY day DESC
        LIMIT 30
      `),

      // ---------------- COMPLETION RATE ----------------
      sequelize.query(`
        SELECT
          ROUND((COUNT(dateCompleted) / COUNT(dateAssigned)) * 100, 2) AS completionRate
        FROM issue_statistics
      `)
    ]);

    // ---------------- PROCESS MONTHLY ISSUES TO INCLUDE 0 ----------------
    const monthlyIssuesComparison = [previousYear, currentYear].flatMap(year => {
      return monthNames.map((month, index) => {
        const found = monthlyIssuesRaw[0].find(m => m.year === year && m.month === index + 1);
        return {
          year,
          month,
          totalIssues: found ? found.totalIssues : 0
        };
      });
    });

    return res.status(200).json({
      status: "SUCCESS",
      data: {
        systemMetrics: systemMetrics[0][0],
        topElectricians: topElectricians[0].map(e => ({
          electricianId: e.electricianId,
          electrician: { firstName: e.firstName, lastName: e.lastName },
          totalCompleted: e.totalCompleted,
          avgCompletionTime: e.avgCompletionTime
        })),
        slowestResponders: slowestResponders[0].map(e => ({
          electricianId: e.electricianId,
          electrician: { firstName: e.firstName, lastName: e.lastName },
          avgResponseTime: e.avgResponseTime
        })),
        workloadPerElectrician: workloadPerElectrician[0].map(e => ({
          electricianId: e.electricianId,
          electrician: { firstName: e.firstName, lastName: e.lastName },
          totalAssigned: e.totalAssigned
        })),
        activeElectricians: activeElectricians[0].map(e => ({
          electricianId: e.electricianId,
          electrician: { firstName: e.firstName, lastName: e.lastName },
          activeIssues: e.activeIssues
        })),
        totalIssuesToday: totalIssuesToday[0][0].totalIssuesToday,
        monthlyIssuesComparison,
        dailyIssuesCompleted: dailyIssuesCompleted[0],
        completionRate: completionRate[0][0]
      }
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      status: "ERROR",
      message: "Failed to fetch dashboard statistics"
    });
  }
};
