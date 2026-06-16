
const { transporter } = require("../../common/services/transporter");
require("dotenv").config();

const sendVendNotificationEmailFailure = (
  transaction,
  failure,
  xmlRequest,
  xmlResponse
) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: [
      "PWilhelm@mtc.com.na",
      "TKandjimwena@mtc.com.na",
      "DKoopman@mtc.com.na",
    ],
    subject: "Vend Transaction FAILED UAT - ErongoRED",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 800px;">
        <h2 style="color: #c0392b;">Vend Transaction Failure Alert</h2>

        <p>
          A vending transaction has <strong>FAILED</strong>.  
          Details are provided below for investigation.
        </p>

        <h3>Transaction Details</h3>
        <table style="width:100%; border-collapse: collapse;">
          <tr><td><strong>Meter Number</strong></td><td>${transaction.meterNumber}</td></tr>
          <tr><td><strong>Amount</strong></td><td>N$ ${transaction.amount}</td></tr>
          <tr><td><strong>Mobile Number</strong></td><td>${transaction.mobileNumber}</td></tr>
          <tr><td><strong>Date</strong></td><td>${new Date().toLocaleString()}</td></tr>
        </table>

        <h3 style="margin-top: 20px;">Failure Details</h3>
        <table style="width:100%; border-collapse: collapse;">
          <tr><td><strong>Failure Reason</strong></td><td>${failure}</td></tr>
        </table>

        <h3 style="margin-top: 20px;">XML Request</h3>
        <pre style="background:#f4f4f4; padding:10px; overflow:auto; font-size:12px;">
${xmlRequest.replace(/</g, "&lt;").replace(/>/g, "&gt;")}
        </pre>

        <h3>XML Response</h3>
        <pre style="background:#f4f4f4; padding:10px; overflow:auto; font-size:12px;">
${xmlResponse.replace(/</g, "&lt;").replace(/>/g, "&gt;")}
        </pre>

        <p style="margin-top: 20px;">
          Please investigate this failure as soon as possible.
        </p>

        <p style="font-size: 12px; color: #777;">
          This is an automated system alert.
        </p>
      </div>
    `,
  };

  transporter.sendMail(mailOptions, (error) => {
    if (error) {
      console.error("Vend failure notification email failed:", error.message);
    }
  });
};

module.exports = {
  sendVendNotificationEmailFailure,
};
