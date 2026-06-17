const { getBcxAuth } = require("../../common/services/requestsService")
const { isEmpty } = require('../../common/services/utils')

exports.accountBalanceDetails = async (req, res) => {
    const { accountNumber } = req.body;

    if (!accountNumber || isEmpty(accountNumber)) {
        return res.status(400).json({
            status: 'FAILED',
            message: 'Account number cannot be blank'
        });
    }

    try {
        const auth = await getBcxAuth();
        const authResponse = await auth.text();
        const authData = JSON.parse(authResponse);
        const token = authData?.access_token;

        const fetchBalance = async () => {
            return await fetch(`${process.env.BCX_BALANCE_DETAILS}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'BCX-User-Name': process.env.BCX_USERNAME,
                    'BCX-Vendor-Code': process.env.BCX_VENDOR_CODE,
                },
                body: JSON.stringify({ accountNumber })
            });
        };

        let response = await fetchBalance();

        if (!response.ok) {
            const errorText = await response.text();
            console.warn('⚠️ BCX first balance request failed');
            console.warn('Status:', response.status);
            console.warn('Response body:', errorText);

            let parsedError;
            try {
                parsedError = JSON.parse(errorText);
            } catch {
                parsedError = { message: errorText };
            }

            if (response.status === 404) {
                console.warn('ℹ️ Account not found, no retry will be attempted.');
                return res.status(404).json({
                    status: 'FAILED',
                    message: parsedError?.messages?.[0] || 'Account not found.'
                });
            }

            if (response.status === 500) {
                console.warn('⚠️ BCX server error — retrying once...');
                response = await fetchBalance();

                if (!response.ok) {
                    const secondErrorText = await response.text();
                    console.error('❌ BCX second request failed');
                    console.error('Status:', response.status);
                    console.error('Response body:', secondErrorText);
                    throw new Error(
                        'Service is currently unavailable. Please try again later or contact system support.'
                    );
                }
            } else {
                // Other unexpected errors (400, 403, etc.)
                return res.status(response.status).json({
                    status: 'FAILED',
                    message: parsedError?.messages?.[0] || 'Unexpected error occurred.'
                });
            }
        }

        // ✅ Successful response
        const balanceResponse = await response.text();
        const balanceData = JSON.parse(balanceResponse);

        return res.status(200).json({
            status: 'SUCCESS',
            message: 'Balance retrieved successfully',
            balanceData
        });

    } catch (error) {
        console.error('❌ Error retrieving balance:', error.message);
        return res.status(503).json({
            status: 'FAILED',
            message: 'Service is currently unavailable. Please try again later or contact system support.'
        });
    }
};


exports.accountBalance = async (req, res) => {
    const { accountNumber } = req.body;

    if (!accountNumber || isEmpty(accountNumber)) {
        return res.status(400).json({
            status: 'FAILED',
            message: 'Account number cannot be blank'
        });
    }

    try {
        const auth = await getBcxAuth();
        const authResponse = await auth.text();
        const authData = JSON.parse(authResponse);
        const token = authData?.access_token;

        const fetchBalance = async () => {
            return await fetch(`${process.env.BCX_ACCOUNT_BALANCE}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'BCX-User-Name': process.env.BCX_USERNAME,
                    'BCX-Vendor-Code': process.env.BCX_VENDOR_CODE,
                },
                body: JSON.stringify({ accountNumber })
            });
        };

        let response = await fetchBalance();

        if (!response.ok) {
            const errorText = await response.text();
            console.warn('⚠️ BCX first account balance request failed');
            console.warn('Status:', response.status);
            console.warn('Response body:', errorText);

            let parsedError;
            try {
                parsedError = JSON.parse(errorText);
            } catch {
                parsedError = { message: errorText };
            }

            if (response.status === 404) {
                console.warn('ℹ️ Account not found, no retry will be attempted.');
                return res.status(404).json({
                    status: 'FAILED',
                    message: parsedError?.messages?.[0] || 'Account not found.'
                });
            }

            if (response.status === 500) {
                console.warn('⚠️ BCX server error — retrying once...');
                response = await fetchBalance();

                if (!response.ok) {
                    const secondErrorText = await response.text();
                    console.error('❌ BCX second request failed');
                    console.error('Status:', response.status);
                    console.error('Response body:', secondErrorText);
                    throw new Error(
                        'Service is currently unavailable. Please try again later or contact system support.'
                    );
                }
            } else {
                return res.status(response.status).json({
                    status: 'FAILED',
                    message: parsedError?.messages?.[0] || 'Unexpected error occurred.'
                });
            }
        }

        const balanceResponse = await response.text();
        const balanceData = JSON.parse(balanceResponse);

        return res.status(200).json({
            status: 'SUCCESS',
            message: 'Balance retrieved successfully',
            balanceData
        });

    } catch (error) {
        console.error('❌ Error retrieving account balance:', error.message);
        return res.status(503).json({
            status: 'FAILED',
            message: 'Service is currently unavailable. Please try again later or contact system support.'
        });
    }
};



exports.accountPaymentHistory = async (req, res) => {
    const { accountNumber } = req.body;

    if (!accountNumber || isEmpty(accountNumber)) {
        return res.status(400).json({
            status: 'FAILED',
            message: 'Account number cannot be blank'
        });
    }

    try {
        const auth = await getBcxAuth();
        const authResponse = await auth.text();
        const authData = JSON.parse(authResponse);

        const token = authData?.access_token;

        const fetchPaymentHistory = async () => {
            return await fetch(`${process.env.BCX_PAYMENT_HISTORY}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'BCX-User-Name': process.env.BCX_USERNAME,
                    'BCX-Vendor-Code': process.env.BCX_VENDOR_CODE,
                },
                body: JSON.stringify({ accountNumber })
            });
        };

        let response = await fetchPaymentHistory();

        if (!response.ok) {
            console.warn('⚠️ BCX first payment history request failed');
            console.warn('Status:', response.status);

            const errorBody = await response.text();
            console.warn('Response body:', errorBody);

            if (response.status === 404) {
                return res.status(404).json({
                    status: 'FAILED',
                    message: `No payment history found for account number ${accountNumber}`
                });
            }

            if (response.status === 500) {
                return res.status(500).json({
                    status: 'FAILED',
                    message: 'Service is currently unavailable. Please try again later or contact system support.'
                });
            }

            response = await fetchPaymentHistory();

            if (!response.ok) {
                const retryBody = await response.text();
                console.error('❌ Second BCX payment history request failed:', retryBody);
                throw new Error('Service is currently unavailable. Please try again later or contact system support.');
            }
        }

        const dataText = await response.text();
        const data = JSON.parse(dataText);

        return res.status(200).json({
            status: 'SUCCESS',
            message: 'Payment history retrieved successfully',
            paymentHistory: data
        });

    } catch (error) {
        console.error('Error retrieving payment history:', error.message);

        return res.status(503).json({
            status: 'FAILED',
            message: 'Service is currently unavailable. Please try again later or contact system support.'
        });
    }
};



exports.accounts = async (req, res) => {
    const { idNumber } = req.body;

    if (!idNumber || isEmpty(idNumber)) {
        return res.status(400).json({
            status: 'FAILED',
            message: 'ID number cannot be blank'
        });
    }

    try {
        const auth = await getBcxAuth();
        const authResponse = await auth.text();
        const authData = JSON.parse(authResponse);
        const token = authData?.access_token;

        const fetchAccounts = async () => {
            return await fetch(`${process.env.BCX_ACCOUNT_PER_ID_NUMBER}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'BCX-User-Name': process.env.BCX_USERNAME,
                    'BCX-Vendor-Code': process.env.BCX_VENDOR_CODE,
                },
                body: JSON.stringify({ idNumber })
            });
        };

        let response = await fetchAccounts();

        if (!response.ok) {
            console.warn('⚠️ BCX first account lookup request failed');
            console.warn('Status:', response.status);

            const errorBody = await response.text();
            console.warn('Response body:', errorBody);

            if (response.status === 404) {
                return res.status(404).json({
                    status: 'FAILED',
                    message: `No accounts found for ID number ${idNumber}`
                });
            }

            if (response.status === 500) {
                return res.status(500).json({
                    status: 'FAILED',
                    message: 'Service is currently unavailable. Please try again later or contact system support.'
                });
            }

            response = await fetchAccounts();

            if (!response.ok) {
                const retryBody = await response.text();
                console.error('❌ Second BCX account lookup request failed:', retryBody);
                throw new Error('Service is currently unavailable. Please try again later or contact system support.');
            }
        }

        const dataText = await response.text();
        const data = JSON.parse(dataText);

        return res.status(200).json({
            status: 'SUCCESS',
            message: 'Accounts retrieved successfully',
            accounts: data
        });

    } catch (error) {
        console.error('Error retrieving accounts:', error.message);
        return res.status(503).json({
            status: 'FAILED',
            message: 'Service is currently unavailable. Please try again later or contact system support.'
        });
    }
};



exports.accountDetails = async (req, res) => {
    const { accountNumber } = req.body;

    if (!accountNumber || isEmpty(accountNumber)) {
        return res.status(400).json({
            status: 'FAILED',
            message: 'Account number cannot be blank'
        });
    }

    try {
        const auth = await getBcxAuth();
        const authResponse = await auth.text();
        const authData = JSON.parse(authResponse);
        const token = authData?.access_token;

        const fetchAccountDetails = async () => {
            return await fetch(`${process.env.BCX_ACCOUNT_DETAILS}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'BCX-User-Name': process.env.BCX_USERNAME,
                    'BCX-Vendor-Code': process.env.BCX_VENDOR_CODE,
                },
                body: JSON.stringify({ accountNumber })
            });
        };

        // First attempt
        let response = await fetchAccountDetails();

        if (!response.ok) {
            console.warn('⚠️ BCX first account details request failed');
            console.warn('Status:', response.status);

            const errorBody = await response.text();
            console.warn('Response body:', errorBody);

            if (response.status === 404) {
                return res.status(404).json({
                    status: 'FAILED',
                    message: `Could not find account details for account number ${accountNumber}`
                });
            }

            if (response.status === 500) {
                return res.status(500).json({
                    status: 'FAILED',
                    message: 'Service is currently unavailable. Please try again later or contact system support.'
                });
            }

            response = await fetchAccountDetails();

            if (!response.ok) {
                const retryBody = await response.text();
                console.error('❌ Second BCX account details request failed:', retryBody);
                throw new Error('Service is currently unavailable. Please try again later or contact system support.');
            }
        }

        const responseText = await response.text();
        const data = JSON.parse(responseText);

        return res.status(200).json({
            status: 'SUCCESS',
            message: 'Account details retrieved successfully',
            balanceData: data
        });

    } catch (error) {
        console.error('Error retrieving account details:', error.message);
        return res.status(503).json({
            status: 'FAILED',
            message: 'Service is currently unavailable. Please try again later or contact system support.'
        });
    }
};



exports.meters = async (req, res) => {
    const { accountNumber } = req.body;

    if (!accountNumber || isEmpty(accountNumber)) {
        return res.status(400).json({
            status: 'FAILED',
            message: 'Account number cannot be blank'
        });
    }

    try {
        const auth = await getBcxAuth();
        const authResponse = await auth.text();
        const authData = JSON.parse(authResponse);
        const token = authData?.access_token;

        const fetchMeters = async () => {
            return await fetch(`${process.env.BCX_METERS_PER_ACCOUNT}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'BCX-User-Name': process.env.BCX_USERNAME,
                    'BCX-Vendor-Code': process.env.BCX_VENDOR_CODE,
                },
                body: JSON.stringify({ accountNumber })
            });
        };

        let response = await fetchMeters();

        if (!response.ok) {
            console.warn('⚠️ BCX first meters request failed');
            console.warn('Status:', response.status);

            const errorBody = await response.text();
            console.warn('Response body:', errorBody);

            if (response.status === 404) {
                return res.status(404).json({
                    status: 'FAILED',
                    message: `Could not find meters for account number ${accountNumber}`
                });
            }

            if (response.status === 500) {
                return res.status(500).json({
                    status: 'FAILED',
                    message: 'Service is currently unavailable. Please try again later or contact system support.'
                });
            }

            response = await fetchMeters();

            if (!response.ok) {
                const retryBody = await response.text();
                console.error('❌ Second BCX meters request failed:', retryBody);
                throw new Error('Service is currently unavailable. Please try again later or contact system support.');
            }
        }

        const responseText = await response.text();
        const data = JSON.parse(responseText);

        return res.status(200).json({
            status: 'SUCCESS',
            message: 'Meter details retrieved successfully',
            meters: data
        });

    } catch (error) {
        console.error('Error retrieving meter details:', error.message);
        return res.status(503).json({
            status: 'FAILED',
            message: 'Service is currently unavailable. Please try again later or contact system support.'
        });
    }
};

exports.consumption = async (req, res) => {
    const { meterReference, meterType, noOfReadings } = req.body;

    if (!meterReference || isEmpty(meterReference)) {
        return res.status(400).json({
            status: 'FAILED',
            message: 'Meter reference cannot be blank'
        });
    }

    if (!meterType || isEmpty(meterType)) {
        return res.status(400).json({
            status: 'FAILED',
            message: 'Meter type cannot be blank'
        });
    }

    if (!noOfReadings || isEmpty(noOfReadings)) {
        return res.status(400).json({
            status: 'FAILED',
            message: 'Number of readings cannot be blank'
        });
    }

    try {
        const auth = await getBcxAuth();
        const authResponse = await auth.text();
        const authData = JSON.parse(authResponse);
        const token = authData?.access_token;

        const fetchConsumption = async () => {
            return await fetch(`${process.env.BCX_CONSUMPTION}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'BCX-User-Name': process.env.BCX_USERNAME,
                    'BCX-Vendor-Code': process.env.BCX_VENDOR_CODE,
                },
                body: JSON.stringify({ meterReference, meterType, noOfReadings })
            });
        };

        // First attempt
        let response = await fetchConsumption();

        if (!response.ok) {
            console.warn('⚠️ BCX first consumption request failed');
            console.warn('Status:', response.status);

            const errorBody = await response.text();
            console.warn('Response body:', errorBody);

            if (response.status === 404) {
                return res.status(404).json({
                    status: 'FAILED',
                    message: `No consumption data found for meter reference ${meterReference}`
                });
            }

            if (response.status === 500) {
                return res.status(500).json({
                    status: 'FAILED',
                    message: 'Service is currently unavailable. Please try again later or contact system support.'
                });
            }

            response = await fetchConsumption();

            if (!response.ok) {
                const retryBody = await response.text();
                console.error('❌ Second BCX consumption request failed:', retryBody);
                throw new Error('Service is currently unavailable. Please try again later or contact system support.');
            }
        }

        const responseText = await response.text();
        const data = JSON.parse(responseText);

        return res.status(200).json({
            status: 'SUCCESS',
            message: 'Consumption data retrieved successfully',
            consumptionData: data
        });

    } catch (error) {
        console.error('Error retrieving consumption data:', error.message);
        return res.status(503).json({
            status: 'FAILED',
            message: 'Service is currently unavailable. Please try again later or contact system support.'
        });
    }
};


