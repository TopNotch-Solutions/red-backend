const fs = require('fs')
const path = require('path')
const InvoicesModel = require('../../common/models/invoicesModel')
const InvoiceChargeModel = require('../../common/models/invoiceChargesModel');
const { default: puppeteer } = require('puppeteer');
const { format } = require('date-fns');

const INVOICE_DIR = 'documents/invoices/'
const LOGO_PATH = 'assets/imgs/erongred-logo.png'

if (!fs.existsSync(INVOICE_DIR)) {
    fs.mkdirSync(INVOICE_DIR, { recursive: true });
}

const generateInvoiceHtml = async (invoice, invoiceItems) => {
    const charges = await InvoiceChargeModel.findAll({ where: { invoiceId: invoice.id } })

    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Invoice</title>
        <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            .invoice-container { max-width: 800px; margin: auto; border: 1px solid #ddd; padding: 20px; }
            .header { text-align: center; }
            .logo { width: 150px; margin-bottom: 10px; }
            .details-table, .charges-table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            .details-table td, .charges-table th, .charges-table td { border: 1px solid #ddd; padding: 10px; text-align: left; }
            .charges-table th { background-color: #f4f4f4; }
            .total { text-align: right; font-weight: bold; }
        </style>
    </head>
    <body>
        <div class="invoice-container">
            <div class="header">
                <img src="${LOGO_PATH}" class="logo" />
                <h2>Tax Invoice</h2>
            </div>
            
            <table class="details-table">
                <tr><td><strong>Account Holder:</strong></td><td>${invoice.accountHolder}</td></tr>
                <tr><td><strong>Account No:</strong></td><td>${invoice.accountNo}</td></tr>
                <tr><td><strong>Invoice No:</strong></td><td>${invoice.taxInvoiceNo}</td></tr>
                <tr><td><strong>Date:</strong></td><td>${invoice.date}</td></tr>
            </table>

            <h3>Invoice Charges</h3>
            <table class="charges-table">
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Description</th>
                        <th>Tariff (N$)</th>
                        <th>VAT %</th>
                        <th>VAT Charge (N$)</th>
                        <th>Amount (VAT excl.)</th>
                        <th>Amount (N$)</th>
                    </tr>
                </thead>
                <tbody>
                    ${charges.map(charge => `
                        <tr>
                            <td>${charge.date}</td>
                            <td>${charge.description || ''}</td>
                            <td>${charge.tariff ? charge.tariff.toFixed(2) : ''}</td>
                            <td>${charge.vatPercent || ''}</td>
                            <td>${charge.vatCharged || ''}</td>
                            <td>${charge.amountVatExcluded}</td>
                            <td>${charge.amount}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    </body>
    </html>
    `;
}

const generateInvoicePDF = async (invoice, invoiceItems, targetFilePath) => {
    try {
        console.log(`Generating PDF for invoice Acc: ${invoice.accountNo}, Date: ${invoice.date} -> ${targetFilePath}`);
        const htmlContent = await generateInvoiceHtml(invoice, invoiceItems);

        const dir = path.dirname(targetFilePath);
        if (!fs.existsSync(dir)) {
            console.log(`Creating directory: ${dir}`);
            await fs.promises.mkdir(dir, { recursive: true });
        }

        const browser = await puppeteer.launch({
             headless: 'new',
             args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = await browser.newPage();
        await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

        await page.pdf({ path: targetFilePath, format: 'A4', printBackground: true });

        await browser.close();
        console.log(`Successfully generated PDF: ${targetFilePath}`);
        return targetFilePath;
    } catch (error) {
        console.error(`Error generating PDF for invoice Acc: ${invoice.accountNo}, Date: ${invoice.date} at path ${targetFilePath}:`, error);
        throw error;
    }
};

exports.getInvoicePDF = async (req, res) => {
    try {
        const { invoiceId } = req.params;

        const invoice = await InvoicesModel.findOne({
            where: { id: invoiceId },
            include: InvoiceChargeModel
        });

        if (!invoice) {
            return res.status(404).json({ status: 'FAILED', message: 'Invoice not found' });
        }

        const pdfFilePath = await generateInvoicePDF(invoice);

        res.setHeader('Content-Type', 'application/pdf')
        res.setHeader('Content-Disposition', 'inline; filename=invoice.pdf')

        res.sendFile(path.resolve(pdfFilePath), (error) => {
            if (error) {
                console.error('Error sending PDF:', error)
                res.status(500).json({
                    status: 'FAILED',
                    message: 'Could not retrieve PDF'
                })
            }
        })

    } catch (error) {
        console.error('Error generating invoice PDF:', error);
        res.status(500).json({ status: 'FAILED', message: 'Internal server error' });
    }
};

exports.getInvoicesByAccountNumber = async (req, res) => {
    try {
        const { accountNo } = req.params;

        if (!accountNo) {
            return res.status(400).json({
                status: 'FAILED',
                message: 'Account number is required'
            });
        }

        console.log(`Workspaceing invoices for account: ${accountNo}`);
        const invoices = await InvoicesModel.findAll({
            where: { accountNo },
            // include: [{ model: InvoiceItemsModel, as: 'items' }], // Eager load if needed
            order: [['date', 'DESC']]
        });

        if (!invoices || invoices.length === 0) {
            return res.status(404).json({
                status: 'FAILED',
                message: 'No invoices found for this account number'
            });
        }

        console.log(`Found ${invoices.length} invoices for account: ${accountNo}`);
        const invoiceUrls = [];

        // Simple regex to validate YYYY-MM-DD format
        const dateFormatRegex = /^\d{4}-\d{2}-\d{2}$/;

        for (const invoice of invoices) {
            // *** Ensure accountNo is filesystem-safe ***
            const safeAccountNo = String(invoice.accountNo).replace(/[\/\\]/g, '_');

            // *** Get the date string directly ***
            const dateString = invoice.date;

            // *** Optional but Recommended: Validate the date string format ***
            if (!dateString || !dateFormatRegex.test(dateString)) {
                console.warn(`Skipping invoice ID ${invoice.id} for account ${safeAccountNo}. Reason: Unexpected date format found ('${dateString}'). Expected YYYY-MM-DD.`);
                continue; // Skip this invoice if date format is not as expected
            }

            // *** Filename based on accountNo and the validated date string ***
            const pdfFileName = `invoice_${safeAccountNo}_${dateString}.pdf`;
            const pdfFilePath = path.join(INVOICE_DIR, pdfFileName);

            console.log(`Processing invoice ID: ${invoice.id}. Path: ${pdfFilePath}`);

            // Check if the file exists at the standardized path
            if (!fs.existsSync(pdfFilePath)) {
                console.log(`PDF not found for invoice ${invoice.id} (Path: ${pdfFilePath}), generating...`);
                try {
                    // Fetch/prepare invoice items if needed
                    const invoiceItems = invoice.items || [];

                    // Call generateInvoicePDF with the correct target path
                    await generateInvoicePDF(invoice, invoiceItems, pdfFilePath);

                } catch (generationError) {
                     console.error(`Failed to generate PDF for invoice ${invoice.id}:`, generationError);
                     continue; // Skip this invoice on generation failure
                }
            } else {
                 console.log(`PDF found for invoice ${invoice.id} (Path: ${pdfFilePath}).`);
            }

            // Generate URL using the consistent accountNo/date filename
            const invoiceUrl = `${req.protocol}://${req.get('host')}/documents/invoices/${pdfFileName}`;

            invoiceUrls.push({
                invoiceId: invoice.id, // Keep for reference
                invoiceUrl // URL uses accountNo and date string
            });
        }

        res.status(200).json({
            status: 'SUCCESS',
            message: 'Invoices retrieved successfully',
            invoiceUrls
        });
    } catch (error) {
        console.error('Error retrieving invoices:', error);
        return res.status(500).json({
            status: 'FAILED',
            message: 'Internal server error: ' + error.message
        });
    }
};