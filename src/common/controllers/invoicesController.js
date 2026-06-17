const fs = require('fs')
const path = require('path')
const InvoicesModel = require('../models/invoicesModel')
const InvoiceChargeModel = require('../models/invoiceChargesModel');
const pdf = require('html-pdf-node');
const { getPeriodLabel } = require('../services/invoiceService');
const { isEmpty } = require('../../common/services/utils')
const { getBcxAuth } = require("../../common/services/requestsService")
const INVOICE_DIR = 'documents/invoices/'
const logoFilename = 'erongred-logo.png';
const absoluteLogoPath = path.join(__dirname, '..', '..', '..', 'assets', 'imgs', logoFilename);
require("dotenv").config();

if (!fs.existsSync(INVOICE_DIR)) {
    fs.mkdirSync(INVOICE_DIR, { recursive: true });
}

const invoiceUrl = process.env.ENVIRONMENT === 'UAT' 
    ? process.env.INVOICES_API_URL
    : process.env.INVOICES_API_URL_PROD;

const username = process.env.ENVIRONMENT === 'UAT' 
    ? process.env.BCX_USERNAME 
    : process.env.BCX_USERNAME_PROD;

const code = process.env.ENVIRONMENT === 'UAT' 
    ? process.env.BCX_VENDOR_CODE 
    : process.env.BCX_VENDOR_CODE_PROD;

const generateInvoiceHtml = async (invoice) => {
    const charges = await InvoiceChargeModel.findAll({ where: { invoiceId: invoice.id } });

    let logoUri = ''

    let chargesTableContent = ''

    try {
        if (fs.existsSync(absoluteLogoPath)) {
            const imageBuffer = fs.readFileSync(absoluteLogoPath)
            const mimeType = 'image/png'

            logoUri = `data:${mimeType};base64,${imageBuffer.toString('base64')}`
        } else {
            console.error('Logo not found at:', absoluteLogoPath)
        }
    } catch (error) {
        console.error('Error:', error)
    }

    const formatCurrency = (value) => {
        const num = parseFloat(value);
        return isNaN(num) ? '0.00' : num.toFixed(2);
    };

    const now = new Date();
    const currentDateFormatted = now.toLocaleDateString('en-GB', {
        day: '2-digit', month: '2-digit', year: 'numeric'
    });

    const dueDateFormatted = invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString('en-GB') : 'N/A';
    const statementDateFormatted = invoice.date ? new Date(invoice.date).toLocaleDateString('en-GB') : 'N/A';

    if (charges && charges.length > 0) {
        chargesTableContent = charges.map(charge => `
            <tr>
                <td>${charge.date ? new Date(charge.date).toLocaleDateString('en-GB') : ''}</td>
                <td>${charge.description || ''}</td>
                <td>${charge.tariff ? formatCurrency(charge.tariff) : ''}</td>
                <td>${charge.vatPercent || ''}</td>
                <td>${charge.vatCharged ? formatCurrency(charge.vatCharged) : ''}</td>
                <td>${formatCurrency(charge.amountVatExcluded)}</td>
                <td>${formatCurrency(charge.amount)}</td>
            </tr>
        `).join('')
    } else {
        chargesTableContent = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 10px; font-style: italic; color: #555;">
                    No charges listed for this period.
                </td>
            </tr>
        `
    }

    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Invoice ${invoice.taxInvoiceNo || ''}</title>
        <style>
            * {
                box-sizing: border-box;
            }

            body { font-family: Arial, sans-serif; font-size: 12px; }
            .invoice-container { max-width: 800px; margin: auto; padding: 20px; position: relative; padding-bottom: 100px; }
            .bottom-right-square { 
                background-color: #E53981; 
                padding: 5px 8px;
                color: #fff; 
                font-size: 10px;
                font-weight: bold;
                text-align: center;
                line-height: 1.2; 
                width: 110px;
                height: 90px;
                box-sizing: border-box;
                margin-top: -10px;
            }
            .header { text-align: center; }
            
            .logo { width: 200px; height: 170px }

            .top-row { display: flex; justify-content: space-between; gap: 20px;}
            .info-table-container { flex: 2; }
            .address-box { flex: 1; border: 1px solid #000; padding: 10px; display: flex; flex-direction: column; height: 150px; }
            .address-box .address-details { margin-top: 5px; margin-bottom: auto; }
            .address-box .account-footer { margin-top: 10px; font-size: 11px; }

            .details-table { 
                width: 100%; 
                border-collapse: collapse; 
                margin-bottom: 10px;
                border: 1px solid #000;
                font-size: 11px;
            }
            
            .details-table td { 
                border: none;
                padding: 4px 8px;
                vertical-align: middle; 
                text-align: left;
            }

            .details-table .title-cell {
                text-align: center;
                font-weight: bold;
                font-size: 12px;
                padding-top: 6px;
                padding-bottom: 6px;
                border-bottom: 1px solid #000;
            }
            
            .details-table .label-cell {
                font-weight: bold;
                border-right: 1px solid #000;
            }

            .details-table .value-cell {
                text-align: left;
            }

            .details-table tr.separator-row td {
                border-bottom: 1px solid #000;
            }

            .details-table .currency-value {
                font-weight: bold;
            }

            .charges-table { 
                width: 100%; 
                border-collapse: collapse; 
                table-layout: fixed; 
                border: 1px solid #000;
            }
            .charges-table th, .charges-table td { 
                border: none; 
                padding: 6px 8px; 
                text-align: left; 
                vertical-align: top; 
                word-wrap: break-word; 
            }
            .charges-table th { 
                font-size: 10px; 
                text-transform: uppercase; 
                font-weight: bold;
                border-bottom: 1px solid #000;
            }

            .charges-table td { font-size: 11px; }

            .charges-table th:not(:first-child), 
            .charges-table td:not(:first-child) { 
                border-left: 1px solid #000; 
            }

             .charges-table th:nth-child(3), .charges-table td:nth-child(3),
             .charges-table th:nth-child(5), .charges-table td:nth-child(5),
             .charges-table th:nth-child(6), .charges-table td:nth-child(6),
             .charges-table th:nth-child(7), .charges-table td:nth-child(7) { text-align: right; }
             .charges-table th:nth-child(4), .charges-table td:nth-child(4) { text-align: center; }

            .summary-table { width: 100%; border-collapse: collapse; margin-top: 0; table-layout: fixed; }
            .summary-table td { border: 1px solid #000; font-size: 11px; vertical-align: top; padding: 0; }

            .summary-table colgroup col:nth-child(1) { width: 18%; } /* Due Date */
            .summary-table colgroup col:nth-child(2) { width: 12%; } /* Current */
            .summary-table colgroup col:nth-child(3) { width: 12%; } /* 30 Days */
            .summary-table colgroup col:nth-child(4) { width: 12%; } /* 60 Days */
            .summary-table colgroup col:nth-child(5) { width: 12%; } /* 90 Days */
            .summary-table colgroup col:nth-child(6) { width: 12%; }
            .summary-table colgroup col:nth-child(7) { width: 22%; }

            .summary-table .due-date-cell {
                font-weight: bold;
                text-align: center;
                padding: 4px 6px;
                vertical-align: middle;
            }
             .summary-table .due-date-cell .value {
                 font-weight: normal;
             }

             .summary-table .total-due-cell {
                text-align: center;
                vertical-align: middle;
                font-weight: bold;
                 padding: 4px 6px;
            }
             .summary-table .total-due-cell .value {
                 font-size: 13px; 
                 font-weight: bold;
                 display: block;
                 margin-top: 2px;
             }

            .aging-cell { text-align: center; font-weight: normal; padding: 0; vertical-align: top; }
            .aging-cell strong { display: block; font-weight: bold; padding: 4px 6px; border-bottom: 1px solid #000; margin-bottom: 4px; font-size: 10px; }
            .aging-cell .value { display: block; padding: 2px 6px; font-size: 11px; }

             .summary-table td + td {
                 border-left: 1px solid #aaa;
             }

            .invoice-title { text-align: center; font-size: 20px; font-weight: bold; margin-top: 10px; margin-bottom: 20px; text-transform: uppercase; }
            .footer-notes { margin-top: -5px; padding-top: 10px; font-size: 9px; color:rgb(132, 134, 133); text-align: center; position: relative; z-index: 1;}
            .payment-info { margin-top: 20px; padding: 10px; border: 1px dashed #ccc; font-size: 10px;}
            .payment-info strong {font-size: 11px;}
            .summary-header-row td {
                 font-size: 10px;
                 text-align: center;
                 font-weight: bold;
                 padding: 5px 6px;
                 border-bottom: 1px solid #bbb;
                 border-top: 1px solid #bbb;
                 vertical-align: middle;
             }

             .summary-header-row td:first-child {
                 background-color: white;
                 border-right: 1px solid #000;
                 border-left: 1px solid #000;
             }
             .summary-header-row td + td, th {
                  border-left: 1px solid #000;
             }
            .prop_info {
                display: block;
                width: 100%;
            }
            .reverse-box {
                padding: 10px;
                border: 1px solid #000;
                margin-top: 10px;
            }
            .dotted-separator {
                border-top: 2px dotted #000;
                margin: 10px 0 0 0;
                width: 100%;
                height: 1px;
            }
            .separator {
                border-top: 1px solid #000;
                margin: 10px 0;
                width: 100%;
                height: 1px;
            }

            .information-box{
                border: 1px solid #000;
                padding: 10px;
                margin-top: 20px;
            }
            .row {
                display: flex;
                gap: 20px;
                margin-bottom: 0;
            }
            .column {
                float: left;
                width: 50%;
                height: 300px;
                color: #000;
            }
            .left-column {
                flex: 30%;
                height: 120px;
                color: #000;
            }

            .left-column p {
                text-align: left;
                color: #000;
            }

            .right-column {
                flex: 70%;
                height: 120px;
                color: #000;
            }

            .right-column p {
                color: #000;
            }

            .left-column p {
                color: black;
            }
                
            .column2 {
                float: left;
                height: 92px;
                border: 1px solid black;
                color: #000;
            }

            .right * {
                text-align: right;
                justify-content: center;
            }

            .middle, .right {
                width: 25%;
                text-align: left;
            }

            .left {
                width: 50%;
                text-align: left;
            }

            .page-break { display: none; }

            @media print {
                body {
                    margin: 0;
                    padding: 0;
                    font-size: 10pt;
                    background-color: #fff;
                }
                .invoice-container {
                    margin: 0;
                    padding: 10mm;
                    border: none;
                    box-shadow: none;
                    max-width: none;
                    width: auto;
                }
                .invoice-container p{
                    color: grey;
                }
                 .page-break {
                     display: block;
                     break-before: page;
                     height: 0;
                     margin: 0;
                     padding: 0;
                     border: none;
                }
                .no-print {
                    display: none;
                }
                 .top-row, .address-box, .info-table-container, .charges-table, .summary-table, .property-info-table, .row {
                     break-inside: avoid;
                 }
                 .reverse-box, .dotted-separator, .payment-info, .footer-notes {
                    break-before: auto;
                 }
            }

            .account-payments p {
                font-size: 10px;
                text-align: left;
                color: #000;
            }

            .account-payments {
                margin-top: 20px;
            }

            .directors-container {
                width: 100%;
            }

            .line-through-text-wrapper {
                display: flex;
                align-items: center;
                text-align: center;
                margin: 10px 0;
            }

            .line {
                height: 1px;
                background-color: #000;
                flex-grow: 1;
            }

            .right-line {
                flex-grow: 4;
            }

            .line-through-text-wrapper p {
                font-size: 10px;
            }

            .line-through-text {
                margin: 0;
                flex-shrink: 0;
                padding: 0 15px;
            }

            .directors-container p {
                font-size: 9px;
                color: #000;
            }

            .directors-container.grid-layout {
                display: grid;
                grid-template-columns: auto 1fr;
                align-items: start;
                width: 100%;
                font-size: 0.9em;
                line-height: 1.5;
                padding-left: 13%;
                box-sizing: border-box;
            }

            .invoice-container.page-2 p {
                text-align: left;
                color: #000;
                font-size: 12px;
            }

            .account-payments span {
                
            }

            .grid-full-width {
                grid-column: 1 / -1;
            }

            .director-label {
                white-space: nowrap;
                font-size: 8px;
                color: #000
            }

            .director-details {
                text-align: left;
                font-size: 8px;
                color: #000
            }

            .header div p {
                font-size: 10px;
            }

            .contact-details {
                margin-top: -40px;
            }

            .page-2 p {
                align-text: left;
                justify-content: left;
                color: #000;
            }

            .property-meter-table {
                width: 100%;
                border-collapse: collapse;
                table-layout: fixed;
                border: 1px solid #000;
                margin-bottom: 10px;
            }

            .property-meter-table th,
            .property-meter-table td {
                border: none;
                padding: 4px 6px;
                text-align: left;
                vertical-align: top;
                font-size: 10px;
                word-wrap: break-word;
            }

            .property-meter-table th:not(:first-child),
            .property-meter-table td:not(:first-child) {
                border-left: 1px solid #000;
            }

            .property-meter-table thead th {
                font-weight: bold;
                text-align: center;
                vertical-align: middle;
                border-bottom: 1px solid #000;
                background-color: #f4f4f4;
            }
            .property-meter-table thead tr:first-child th:not([rowspan]) {
                border-bottom: none;
            }
            .property-meter-table thead tr:first-child th:nth-child(2) {
                border-right: 1px solid #000;
            }
            .property-meter-table thead tr:nth-child(2) th:nth-child(2) {
                border-left: none;
            }
            .property-meter-table thead tr:nth-child(2) th:nth-child(4) {
                border-left: none;
            }
            .property-meter-table thead tr:nth-child(2) th:nth-child(5) {
                border-left: none;
            }
            .property-meter-table tbody td { font-size: 10px; }
            .prop_info { display: block; margin-bottom: 2px; line-height: 1.3; }
            .property-meter-table tbody td:first-child { font-weight: bold; }
            .property-meter-table tbody td:nth-child(3) { text-align: center; }
            .property-meter-table tbody td:nth-child(4),
            .property-meter-table tbody td:nth-child(5) { text-align: center; }
            .property-meter-table tbody td:nth-child(6),
            .property-meter-table tbody td:nth-child(7),
            .property-meter-table tbody td:nth-child(8) { text-align: right; }
            
            .prop_info {
                display: block;
                margin-bottom: 2px;
                line-height: 1.3;
            }

            .property-meter-table tbody td:first-child {
                font-weight: bold;
            }

            .property-meter-table tbody td:nth-child(3) { text-align: center; }
            .property-meter-table tbody td:nth-child(4),
            .property-meter-table tbody td:nth-child(5) { text-align: center; }
            .property-meter-table tbody td:nth-child(6),
            .property-meter-table tbody td:nth-child(7),
            .property-meter-table tbody td:nth-child(8) { text-align: right; }
        </style>
    </head>
    <body>
        <div class="invoice-container pdf-safe-zone">
            <div class="header">
                <img src="${logoUri}" alt="Company Logo" class="logo" />
                <div class="contact-details">
                    <p style="color: black;">
                        TEL + 264 (64) 201 9000 <span style="color: #E53981;">|</span>
                        TOLL FREE 96000 <span style="color: #E53981;">|</span>
                        FAX + 264 (64) 201 9001 <span style="color: #E53981;">|</span>
                        EMAIL support@erongored.com.na <span style="color: #E53981;">|</span>
                    </p>
                <div>
                <div>
                    <p style="color: #000;">
                        ERONGO <span style="color: red;">RED</span> BUILDING <span style="color: #E53981;">|</span>
                        REG NO 2004/074 <span style="color: #E53981;">|</span>
                        91 HAGE GEINGOB STREET <span style="color: #E53981;">|</span>
                        PO BOX 2925 <span style="color: #E53981;">|</span>
                        WALVIS BAY <span style="color: #E53981;">|</span>
                        NAMIBIA
                    </p>
                <div>
            </div>
            <div class="separator"></div>

            <div class="top-row">
                 <div class="address-box">
                     <div class="address-details"><strong>${invoice.accountHolder || 'N/A'}</strong><br>${invoice.postalAddress ? invoice.postalAddress.replace(/\n/g, '<br>') : 'Postal Address not available'}</div>
                 </div>
                 <div class="info-table-container">
                     <table class="details-table">
                        <colgroup>
                            <col style="width: 45%">
                            <col style="width: 55%">
                        </colgroup>
                        <tbody>
                            <tr>
                                <td colspan="2" class="title-cell">TAX INVOICE</td>
                            </tr>
                            <tr>
                                <td class="label-cell">VAT No:</td>
                                <td class="value-cell">${invoice.vatNo}</td>
                            </tr>
                            <tr class="separator-row">
                                <td class="label-cell">Tax Invoice No:</td>
                                <td class="value-cell">${invoice.taxInvoiceNo}</td>
                            </tr>
                            <tr>
                                <td class="label-cell">Statement Date:</td>
                                <td class="value-cell">${statementDateFormatted}</td>
                            </tr>
                            <tr>
                                <td class="label-cell">Account No:</td>
                                <td class="value-cell">${invoice.accountNo}</td>
                            </tr>
                            <tr>
                                <td class="label-cell">Reference:</td>
                                <td class="value-cell">${invoice.reference}</td>
                            </tr>
                            <tr>
                                <td class="label-cell">Deposit / Guarantee:</td>
                                <td class="value-cell currency-value">N$ ${formatCurrency(invoice.deposit)}</td>
                            </tr>
                        </tbody>
                     </table>
                 </div>
            </div>

            <table class="charges-table">
                 <colgroup>
                    <col span="1" style="width: 12%;"> 
                    <col span="1" style="width: 28%;"> 
                    <col span="1" style="width: 12%;"> 
                    <col span="1" style="width: 8%;"> 
                    <col span="1" style="width: 12%;"> 
                    <col span="1" style="width: 14%;"> 
                    <col span="1" style="width: 14%;">
                </colgroup>
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
                    ${chargesTableContent}
                </tbody>
            </table>
            <table class="summary-table">
                <colgroup>
                    <col style="width: 12%;"> 
                    <col style="width: 12%;"> 
                    <col style="width: 14%;"> 
                    <col style="width: 11%;"> 
                    <col style="width: 11%;"> 
                    <col style="width: 12%;"> 
                    <col style="width: 14%;"> 
                    <col style="width: 14%;"> 
                </colgroup>
                <tbody>
                    <tr class="summary-header-row">
                        <th rowspan="3">Due Date</th>
                        <th rowspan="3">${dueDateFormatted}</th>
                        <td colspan="3">Total N$</td>
                        <td>${invoice.total}</td>
                        <td>${invoice.total}</td>
                        <td>${invoice.total}</td>
                    </tr>
                    <tr>
                        <td class="aging-cell"> <strong>+120 Days</strong><span class="value">N$ ${formatCurrency(invoice.plus120Days)}</span></td>
                        <td class="aging-cell"> <strong>90 Days</strong><span class="value">N$ ${formatCurrency(invoice.ninetyDays)}</span></td>
                        <td class="aging-cell"> <strong>60 Days</strong><span class="value">N$ ${formatCurrency(invoice.sixtyDays)}</span></td>
                        <td class="aging-cell"> <strong>30 Days</strong><span class="value">N$ ${formatCurrency(invoice.thirtyDays)}</span></td>
                        <td class="aging-cell"> <strong>Current</strong><span class="value">N$ ${formatCurrency(invoice.current)}</span></td>
                        <td class="total-due-cell"> Total Due:<br><span class="value">N$ ${formatCurrency(invoice.totalAmount)}</span></td>
                    </tr>
                </tbody>
            </table>
            <table class="property-meter-table">
                <colgroup>
                    <col style="width: 15%;"> 
                    <col style="width: 20%;"> 
                    <col style="width: 12%;"> 
                    <col style="width: 10%;"> 
                    <col style="width: 10%;"> 
                    <col style="width: 11%;"> 
                    <col style="width: 11%;"> 
                    <col style="width: 11%;">
                </colgroup>
                <thead>
                    <tr>
                        <th colspan="2" rowspan="2">Property Information</th>
                        <th rowspan="2">Meter Number</th>
                        <th colspan="2">Meter Reading Dates</th>
                        <th colspan="3">Details / Meter Readings</th>
                    </tr>
                    <tr>
                        <th>Previous</th>
                        <th>Current</th>
                        <th>Previous</th>
                        <th>Current</th>
                        <th>Consumption</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>
                            <span class="prop_info">Stand No</span> 
                            <span class="prop_info">Township</span> 
                            <span class="prop_info">Address</span> 
                            <span class="prop_info">Portion</span> 
                            <span class="prop_info">Area</span> 
                            <span class="prop_info">Unit</span> 
                        </td>
                        <td>
                            <span class="prop_info">${invoice.standNo || ''}</span> 
                            <span class="prop_info">${invoice.townShip || ''}</span> 
                            <span class="prop_info">${invoice.address || ''}</span> 
                            <span class="prop_info">${invoice.portion || ''}</span> 
                            <span class="prop_info">${invoice.area || ''}</span> 
                            <span class="prop_info">${invoice.unit || ''}</span> 
                        </td>
                        <td>${invoice.meterNumber || ''}</td>
                        <td>${invoice.previousReadingDateFormatted}</td>
                        <td>${invoice.currentReadingDateFormatted || ''}</td>
                        <td>${invoice.previousMeterReading || ''}</td>
                        <td>${invoice.currentMeterReading || ''}</td>
                        <td>${invoice.consumption || ''}</td>
                    </tr>
                </tbody>
            </table>
            <div class="reverse-box">
                <p style="color: black;">PLEASE SEE REVERSE SIDE FOR NOTIFICATIONS</p>
            </div>
            <div class="dotted-separator"></div>
            <div class="row">
                 <div class="left-column">
                     <p style="color: black;">Erongo Regional Electricity</p>
                     <p style="color: black;">Distributer Company (Pty) Ltd</p>
                     <p style="color: black;">PO Box 2925</p>
                     <p style="color: black;">Walvis Bay</p>
                     <p style="color: black;">Namibia</p>
                     <p style="color: black;"><b>GENERAL INFORMATION</b></p>
                 </div>
                 <div class="right-column">
                    <p style="color: black;">KINDLY TEAR OFF AND RETURN WITH PAYMENT</p>
                     <div class="column2 left">
                        <p style="color: black; text-align: left;">${invoice.accountHolder}</p>
                        <p style="color: black; text-align: left;"><b>REMITTANCE ADVICE</b></p>
                     </div>
                     <div class="column2 middle">
                        <p style="color: black;">Due Date</p>
                        <p style="color: black;">Amount Due N$</p>
                        <p style="color: black;">Account Number</p>
                     </div>
                     <div class="column2 right">
                        <p style="color: black;">${dueDateFormatted}</p>
                        <p style="color: black;">${formatCurrency(invoice.totalAmount)}</p>
                        <p style="color: black;">${invoice.accountNo}</p>
                     </div>
                 </div>
            </div>  
            <div class="account-payments">
                <p style="color: black;">1. Accounts must be settled on or before the due date, in order to avoid additional fees and the discontinuation of electricity supply</p>
                <p style="color: black;">2. Direct/Internet deposits should be made to: First Nation Bank - Walvis Bay - Branch No. 282-172 - Account No: 62103311156 or Bank Windhoek - 
                    Walvis Bay - Branch No. 481-872 - Account No: 8000630203 or Standard Bank Namibia - Walvis Bay - Branch No: 082-272 - Account No: 0428596689</p>
                <p style="color: black;">3. Please quote your electricity account number as beneficiary reference when effecting payment and fax deposit slips/proof to 064-200691, or 
                email to support@erongored.com.na</p>
                <p style="color: black;">4. All cash payments must be receipted at Erongo RED pay points upon which you will be issued with a receipt.</p>
            </div>
            <div class="line-through-text-wrapper">
                <div class="line left-line"></div>
                <p class="line-through-text" style="color: black;"><b>Please address all correspondence to Chief Executive Officer</b></p>
                <div class="line right-line"></div>
            </div>
            <div class="directors-container grid-layout">
                <div class="director-label" style="grid-column: 1; grid-row: 1 / span 2; align-self: start; padding-top: 2px;">
                    Directors:
                </div>
                <div class="director-details" style="grid-column: 2; grid-row: 1; padding-top: 2px;">
                    Mrs YZN Nambahu <span style="color: #E53981;">Chairperson</span> <span style="color: red;">|</span>
                    Mr ! !Hanabeb <span style="color: #E53981;">Chief Executive Officer</span>
                </div>
                <div class="director-details" style="grid-column: 2; grid-row: 1; padding-top: 10px;">
                    Mr M Skini <span style="color: #E53981;">|</span>
                    Ms El Simeon-Kurtz <span style="color: #E53981;">|</span>
                    Mr SJA Januarie <span style="color: #E53981;">|</span>
                    Mr MV Tjipita <span style="color: #E53981;">|</span>
                    Mr L Victor <span style="color: #E53981;">|</span>
                    Mr L Victor <span style="color: #E53981;">|</span>
                    Mr R Hoaeb <span style="color: #E53981;">|</span>
                    Mr M Kaluhoni            
                </div>
                <div class="bottom-right-square" style="grid-column: 2; grid-row: 1 / span 2; justify-self: end; align-self: start;">
                    erongored.com
                </div>
            </div>
             <div class="footer-notes">
                   Date Printed: ${currentDateFormatted}
             </div>
        </div>
        <div class="page-break"></div>

        <div class="invoice-container page-2" style="margin-top: 30px;">
            <p><b>Dear Esteemed Customer,</b></p>
            <p><b><u>Enquiries:</u></b></p>
            <p>Kindly address all enquiries through our Call Centre at the following contact numbers: 96000 (toll free) or 064-2019680 (not toll free).
            <p><b><u>NOTICE:</u></b></p>
            <p><b><u>Objection to Statement rendered by Erongo RED for electricity supplied:</u></b></p>
            <p>
                In accordance with the Standard Conditions of Supply, enquiries or complaints regarding the charges on your account must be lodged within 14
                working days after receipt of your account. Adjustments as a result of charges on the account after the mentioned period will not be entertained.
            </p>
            <p><b><u>Account Payment</u></b></p>
            <p>
                Please note that failure to settle your account before the due date as stipulated on your account may result in the suspension of electricity 
                without prior notice. Penalty fees will also be levied on your account upon suspension of services.
            </p>
            <p><b><u>Account Statements</u></b></p>
            <p style="margin-top: 10px;">
                Accounts are mailed to the postal/email address as supplied by customers. However, the onus rests on the customer to ensure that they receive 
                an account on a monthly basis. Account balances/printouts/duplicate accounts can be obtained upon request.
            </p>
            <p style="margin-bottom: 4px; margin-top: 10px;">Thank you in advance for your co-operation.</p>
            <p>Yours Truly</p>
            <p style="margin-bottom: 15px; margin-top: 30px;">Original signed</p>
            <p><b>Claude Tjizo</b></p>
            <p><b>Executive Manager: Supply Business</b></p>
        </div> 
    </body>
    </html>
    `;
}


const generateInvoicePDF = async (invoice, invoiceItems) => {
    const htmlContent = await generateInvoiceHtml(invoice, invoiceItems);

    const fileName = `invoice_${invoice.accountNo}_${invoice.date}.pdf`;
    const filePath = path.join(INVOICE_DIR, fileName);

    const file = {
        content: htmlContent
    };

    const options = {
        format: 'A4',
        printBackground: true,
        path: filePath,
        margin: {
            top: '0px',
            right: '0px',
            bottom: '0px',
            left: '0px'
        }
    };

    try {
        await pdf.generatePdf(file, options);
        return filePath;
    } catch (err) {
        console.error(`Error generating PDF for invoice Acc: ${invoice.accountNo}, Date: ${invoice.date} at path ${filePath}:`, err);
        throw err;
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

        const invoices = await InvoicesModel.findAll({
            where: { accountNo },
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
        const dateFormatRegex = /^\d{4}-\d{2}-\d{2}$/;

        for (const invoice of invoices) {
            const safeAccountNo = String(invoice.accountNo).replace(/[\/\\]/g, '_');

            const dateString = invoice.date;

            if (!dateString || !dateFormatRegex.test(dateString)) {
                console.warn(`Skipping invoice ID ${invoice.id} for account ${safeAccountNo}. Reason: Unexpected date format found ('${dateString}'). Expected YYYY-MM-DD.`);
                continue;
            }

            const pdfFileName = `invoice_${safeAccountNo}_${dateString}.pdf`;
            const pdfFilePath = path.join(INVOICE_DIR, pdfFileName);

            if (!fs.existsSync(pdfFilePath)) {
                console.log(`PDF not found for invoice ${invoice.id} (Path: ${pdfFilePath}), generating...`);
                try {
                    const invoiceItems = invoice.items || [];
                    await generateInvoicePDF(invoice, invoiceItems, pdfFilePath);

                } catch (generationError) {
                    console.error(`Failed to generate PDF for invoice ${invoice.id}:`, generationError);
                    continue;
                }
            } else {
                console.log(`PDF found for invoice ${invoice.id} (Path: ${pdfFilePath}).`);
            }

            const invoiceUrl = `${req.protocol}://${req.get('host')}/documents/invoices/${pdfFileName}`;

            invoiceUrls.push({
                invoiceId: invoice.id,
                invoiceUrl
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

// exports.getInvoices = async (req, res) => {
//     try {
//         const accountNo = req.params.accountNo
//         const invoicesDir = path.join(process.cwd(), 'documents', 'invoices', accountNo)

//         if (!fs.existsSync(invoicesDir)) {
//             return res.status(404).json({
//                 status: 'FAILED',
//                 message: 'No invoices found for this account number'
//             });
//         }

//         const baseUrl = `${req.protocol}://${req.get('host')}`;
//         console.log(`Base URL for invoice files: ${baseUrl}`);

//         const files = fs.readdirSync(invoicesDir).map(file => ({
//             name: file,
//             url: `${baseUrl}/documents/invoices/${accountNo}/${file}`,
//         }))

//         return res.status(200).json({
//             status: 'SUCCESS',
//             message: 'Invoices retrieved successfully',
//             files
//         });
//     } catch (error) {
//         console.error('Error retrieving invoices:', error);
//         return res.status(500).json({
//             status: 'FAILED',
//             message: 'Internal server error: ' + error.message
//         });
//     }
// }

exports.getInvoices = async (req, res) => {
   const { period, accountNumber } = req.body;
   if (!period || period.trim() === '') {
       return res.status(400).json({
           status: 'FAILED',
           message: 'Period cannot be blank'
       });
   }
   try {
       // 1. Get BCX auth
       const auth = await getBcxAuth();
       const authResponse = await auth.text();
       const authData = JSON.parse(authResponse);
       const token = authData?.access_token;
       // 2. Call BCX API
       const postData = {
        "period": period,
        "accountNumber": accountNumber
        };
       const bcxResponse = await fetch(`${invoiceUrl}`, {
           method: 'POST',
           headers: {
               'Authorization': `Bearer ${token}`,
               'Content-Type': 'application/json',
               'BCX-User-Name': username,
               'BCX-Vendor-Code': code,
           },
           body: JSON.stringify(postData),
       });
console.log(bcxResponse);
       // 3. Forward status + headers
       res.status(bcxResponse.status);
       bcxResponse.headers.forEach((value, key) => {
           res.setHeader(key, value);
       });
       // 4. Stream the body as-is (RAW)
       const buffer = Buffer.from(await bcxResponse.arrayBuffer());
       return res.send(buffer);
   } catch (error) {
       console.error('Error', error);
       return res.status(500).json({
           status: 'FAILED',
           message: 'Something went wrong',
       });
   }
};
exports.getInvoicesByPeriod = async (req, res) => {
    try {
        const { accountNo, period } = req.params;

        if (!/^\d{6}$/.test(period)) {
            return res.status(400).json({ message: 'Invalid period format. Expected YYYYMM.' });
        }

        const periodLabel = getPeriodLabel(period);
        const filename = `Erongo_Statement_${accountNo}_${periodLabel}.pdf`;
        console.log(filename)
        const filePath = path.join(process.cwd(), 'documents', 'invoices', accountNo, filename);

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({
                message: 'Invoice not found.',
                details: `No invoice for account ${accountNo} and period ${period}.`
            });
        }

        res.sendFile(filePath);
    } catch (error) {
        console.error('Error retrieving invoice by period:', error);
        return res.status(500).json({
            status: 'FAILED',
            message: 'Internal server error: ' + error.message
        });
    }
}
