require("dotenv").config();

const url = process.env.ENVIRONMENT === 'UAT' 
    ? process.env.BCX_URL 
    : process.env.BCX_URL_PROD;

const username = process.env.ENVIRONMENT === 'UAT' 
    ? process.env.BCX_USERNAME 
    : process.env.BCX_USERNAME_PROD;

const password = process.env.ENVIRONMENT === 'UAT' 
    ? process.env.BCX_PASSWORD 
    : process.env.BCX_PASSWORD_PROD;

exports.getBcxAuth = async (req, res) => {
    try {
        const authString = Buffer.from(`${username}:${password}`).toString('base64');

        console.log('Step 1: Requesting BCX access token...');

        const fetchAuth = async () => {
            return await fetch(`${url}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Basic ${authString}`
                }
            });
        };

        let authResponse = await fetchAuth();

        if (!authResponse.ok) {
            console.warn('⚠️ First BCX authentication attempt failed');
            console.warn('Status:', authResponse.status);

            const errorBody = await authResponse.text();
            console.warn('Response body:', errorBody);

            if (authResponse.status === 401) {
                return res.status(401).json({
                    status: 'FAILED',
                    message: 'Unauthorized: Invalid BCX credentials.'
                });
            }

            if (authResponse.status === 500) {
                return res.status(500).json({
                    status: 'FAILED',
                    message: 'Service is currently unavailable. Please try again later or contact system support.'
                });
            }

            authResponse = await fetchAuth();

            if (!authResponse.ok) {
                const retryBody = await authResponse.text();
                console.error('❌ Second BCX authentication attempt failed:', retryBody);
                throw new Error('Service is currently unavailable. Please try again later or contact system support.');
            }
        }

        console.log('✅ Access token successfully retrieved.');
        return authResponse;

    } catch (error) {
        console.error('Error retrieving BCX access token:', error.message);
        return res.status(503).json({
            status: 'FAILED',
            message: 'Service is currently unavailable. Please try again later or contact system support.'
        });
    }
};

