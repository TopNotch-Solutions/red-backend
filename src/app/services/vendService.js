const { transporter } = require("../../common/services/transporter");
require("dotenv").config();

const sendVendNotificationEmail = (transaction) => {

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: ["PWilhelm@mtc.com.na"],
    subject: "Vend Transaction Notification - ErongoRED",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px;">
        <h2 style="color: #2c3e50;">Vend Transaction Alert</h2>

        <p>A vending transaction has been completed with the following details:</p>

        <table style="width:100%; border-collapse: collapse;">
          <tr><td><strong>Meter Number</strong></td><td>${transaction.meterNumber}</td></tr>
          <tr><td><strong>Amount</strong></td><td>N$ ${transaction.amount}</td></tr>
          <tr><td><strong>Mobile Number</strong></td><td>${transaction.mobileNumber}</td></tr>
          <tr><td><strong>Date</strong></td><td>${new Date().toLocaleString()}</td></tr>
        </table>

        <p style="margin-top: 20px;">
          This is an automated notification for internal monitoring purposes.
        </p>
      </div>
    `,
  };

  // 🔥 Fire-and-forget
  transporter.sendMail(mailOptions, (error) => {
    if (error) {
      console.error("Vend notification email failed:", error.message);
    }
  });
};

module.exports = {
  sendVendNotificationEmail,
};
