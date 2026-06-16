const IssuesModel = require("../../common/models/issuesModel")

const calculateOvertime = async (startTime, endTime, issueId) => {
    const OVERTIME_START = 17
    const SPECIAL_HOURS_START = 22

    const start = new Date(startTime)
    const end = new Date(endTime)

    if(end <= start) {
        throw new Error('End time must be greater than start time')
    }

    const endHour = end.getHours() + (end.getMinutes() / 60)
    const overtime = Math.max(0, Math.min(endHour, SPECIAL_HOURS_START) - Math.max(OVERTIME_START, start.getHours() + (start.getMinutes() / 60)))
    const specialHours = endHour > SPECIAL_HOURS_START ? endHour - SPECIAL_HOURS_START : 0

    try {
        await IssuesModel.update(
            {overtime: overtime.toFixed(2), specialHours: specialHours.toFixed(2)},
            {where: {id: issueId}}
        )

        console.log(`Overtime: ${overtime.toFixed(2)}, Special Hours: ${specialHours.toFixed(2)}`)
        return {overtime: overtime.toFixed(2), specialHours: specialHours.toFixed(2)}
    } catch(error) {
        console.error('Error updating issue', error)
        throw error
    }
}

module.exports = {calculateOvertime}