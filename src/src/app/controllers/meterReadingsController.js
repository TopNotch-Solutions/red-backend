const MeterReadingsModel = require('../../common/models/meterReadingModel');
const { isNumber, isEmpty } = require('../../common/services/utils');

exports.insertMeterReading = async (req, res) => {
    const { fullName, accountNo, address, suburb, town, cellphone, email, meterReading } = req.body;

    try {
        if (!fullName || isEmpty(fullName)) {
            return res.status(400).json({
                status: 'FAILED',
                message: 'Fullname cannot be blank'
            });
        }

        if (!accountNo || isEmpty(accountNo)) {
            return res.status(400).json({
                status: 'FAILED',
                message: 'Account number cannot be blank'
            });
        }

        if (!address || isEmpty(address)) {
            return res.status(400).json({
                status: 'FAILED',
                message: 'Address cannot be blank'
            });
        }

        if (!suburb || isEmpty(suburb)) {
            return res.status(400).json({
                status: 'FAILED',
                message: 'Suburb cannot be blank'
            });
        }

        if (!town || isEmpty(town)) {
            return res.status(400).json({
                status: 'FAILED',
                message: 'Town cannot be blank'
            });
        }

        if (!cellphone || isEmpty(cellphone)) {
            return res.status(400).json({
                status: 'FAILED',
                message: 'Cellphone cannot be blank'
            });
        }

        if (!email || isEmpty(email)) {
            return res.status(400).json({
                status: 'FAILED',
                message: 'Email cannot be blank'
            });
        }

        if (!meterReading || isEmpty(meterReading)) {
            return res.status(400).json({
                status: 'FAILED',
                message: 'Meter reading cannot be blank'
            });
        }

        if(!isNumber(meterReading)){
            return res.status(400).json({
                status: 'FAILED',
                message: 'Meter reading must be a number'
            })
        }

        const newMeterReading = await MeterReadingsModel.create({
            fullName,
            accountNo,
            address,
            suburb,
            town,
            cellphone,
            email,
            meterReading
        });
        console.log('New meter reading inserted:', newMeterReading);
        res.status(201).json({
            status: 'SUCCESS',
            message: 'Meter reading inserted successfully',
            data: newMeterReading
        });
    } catch (error) {
        res.status(500).json({
            status: 'FAILURE',
            message: 'Error inserting meter reading',
            error: error.message
        });
    }
};