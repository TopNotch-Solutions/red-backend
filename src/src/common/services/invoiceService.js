const fs = require('fs');
const path = require('path');
const unzipper = require('unzipper');
const { Readable } = require('stream');

require("dotenv").config();

const invoiceUrl = process.env.ENVIRONMENT === 'UAT' 
    ? process.env.INVOICES_API_URL
    : process.env.INVOICES_API_URL_PROD;

const url = process.env.ENVIRONMENT === 'UAT' 
    ? process.env.BCX_URL
    : process.env.BCX_URL_PROD;

const username = process.env.ENVIRONMENT === 'UAT' 
    ? process.env.BCX_USERNAME 
    : process.env.BCX_USERNAME_PROD;

const password = process.env.ENVIRONMENT === 'UAT' 
    ? process.env.BCX_PASSWORD 
    : process.env.BCX_PASSWORD_PROD;

const code = process.env.ENVIRONMENT === 'UAT' 
    ? process.env.BCX_VENDOR_CODE 
    : process.env.BCX_VENDOR_CODE_PROD;

exports.getPeriodLabel = (period) => {
    const year = period.substring(0, 4)
    const month = period.substring(4, 6);
    const date = new Date(`${year}-${month}-01`)
    const monthName = date.toLocaleString('default', { month: 'long' });
    return `${monthName}_${year}`
}

exports.getCurrentPeriod = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}${month}`;
}

exports.fetchAndExtractInvoices = async (period) => {

    if (!period) {
        period = exports.getCurrentPeriod();
    }

    console.log('Period', period)

    const extractedFiles = [];
    const baseDir = path.join(process.cwd(), 'documents', 'invoices');

    fs.mkdirSync(baseDir, { recursive: true });

    try {
        const authString = Buffer.from(`${username}:${password}`).toString('base64');

        console.log('Step 1: Getting access token...');
        const authResponse = await fetch(`${url}`, {
            method: 'GET',
            headers: {
                'Authorization': `Basic ${authString}`
            }
        });

        if (!authResponse.ok) {
            const errText = await authResponse.text();
            throw new Error(`Failed to get token: ${authResponse.status} - ${errText}`);
        }

        const authText = await authResponse.text();
        const authData = JSON.parse(authText);
        const token = authData?.access_token;

        if (!token) {
            throw new Error('Token not found in response.');
        }

        console.log('Step 2: Fetching invoice ZIP...');
        const invoicesResponse = await fetch(`${invoiceUrl}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'BCX-User-Name': username,
                'BCX-Vendor-Code': code,
                'Accept-Encoding': 'identity'
            },
            body: JSON.stringify({ period })
        });

        if (!invoicesResponse.ok) {
            const errText = await invoicesResponse.text();

            if (invoicesResponse.status === 404) {
                {
                    let errorMessage = `No invoices found for period ${period}.`;
                    try {
                        const errorJson = JSON.parse(errText);
                        if (Array.isArray(errorJson.messages) && errorJson.messages.length > 0) {
                            errorMessage = errorJson.messages.join(', ');
                        }
                    } catch (error) {
                        console.error('Failed to parse error response:', error);
                    }

                    console.warn(`No invoices found for period ${period}.`, errorMessage);

                    return {
                        status: 'NO_INVOICES',
                        message: errorMessage,
                        files: []
                    }
                }
            }
        }

        const webStream = invoicesResponse.body;
        if (!webStream) throw new Error('No stream in response.');

        const nodeStream = Readable.fromWeb(webStream);

        console.log('Step 3: Extracting ZIP...');
        await new Promise((resolve, reject) => {
            nodeStream
                .pipe(unzipper.Parse())
                .on('entry', (entry) => {
                    const fileName = entry.path;
                    const match = fileName.match(/^Erongo_Statement_(.+)\.pdf$/)

                    if (!match) {
                        console.warn(`Skipping non-matching file: ${fileName}`);
                        entry.autodrain();
                        return;
                    }

                    const accountNo = match[1]
                    const accountDir = path.join(baseDir, accountNo)

                    fs.mkdirSync(accountDir, { recursive: true });

                    const periodLabel = exports.getPeriodLabel(period)
                    const newFileName = `Erongo_Statement_${accountNo}_${periodLabel}.pdf`
                    const fullPath = path.join(accountDir, newFileName);

                    if (path.resolve(fullPath).startsWith(path.resolve(baseDir))) {
                        if (entry.type === 'File') {
                            fs.mkdirSync(path.dirname(fullPath), { recursive: true });
                            entry.pipe(fs.createWriteStream(fullPath));
                            extractedFiles.push(fullPath);
                            console.log(`Extracted: ${fullPath}`);
                        } else {
                            entry.autodrain();
                        }
                    } else {
                        console.warn(`Malicious path skipped: ${fileName}`);
                        entry.autodrain();
                    }
                })
                .on('error', reject)
                .on('close', resolve);
        });

        console.log('Step 4: Extraction complete.');
        return {
            status: 'SUCCESS',
            message: 'Invoices downloaded and extracted successfully.',
            files: extractedFiles
        };

    } catch (error) {
        console.error('Error in fetchAndExtractInvoices:', error);
        throw error;
    }
};