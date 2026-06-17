require("dotenv").config();

const url = process.env.ENVIRONMENT === 'UAT' 
    ? process.env.BCX_URL 
    : process.env.BCX_URL_PROD;
exports.generateAuth = async (req, res) => {
    try {
        const authString = Buffer.from
        const response = await fetch(`${url}`, {
            method: 'GET',
            headers: {
                'Authorization': `Basic ${process.env.BCX_AUTH}`, 
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();
        
        if (data.scope && data.access_token && data.expires_in && data.token_type) {
            return res.status(200).json(data);
        } else {
            return res.status(500).json({ success: false, message: "Invalid response from external API", data });
        }
    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: 'Failed to call external auth API', error: error.message });
    }
}