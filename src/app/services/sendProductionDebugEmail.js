const { transporter } = require("../../common/services/transporter");
require("dotenv").config();

const sendProductionDebugEmail = (type, error) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: [
      "PWilhelm@mtc.com.na",
      "TKandjimwena@mtc.com.na",
      "DKoopman@mtc.com.na",
    ],
    subject: `UAT ERROR - ${type} - ErongoRED`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 700px;">
        <h2 style="color: #c0392b;">Production Application Error</h2>

        <p>
          An error occurred in the UAT environment.
        </p>

        <table style="width:100%; border-collapse: collapse; margin-top: 15px;">
          <tr>
            <td style="padding:8px;"><strong>Error Type</strong></td>
            <td style="padding:8px;">${type}</td>
          </tr>
          <tr>
            <td style="padding:8px;"><strong>Error Message</strong></td>
            <td style="padding:8px;">${error}</td>
          </tr>
          <tr>
            <td style="padding:8px;"><strong>Timestamp</strong></td>
            <td style="padding:8px;">${new Date().toISOString()}</td>
          </tr>
        </table>

        <p style="margin-top: 20px;">
          Please investigate as soon as possible.
        </p>

        <p style="font-size: 12px; color: #777;">
          Automated production alert.
        </p>
      </div>
    `,
  };

  transporter.sendMail(mailOptions, (mailError) => {
    if (mailError) {
      console.error("UAT  debug email failed:", mailError.message);
    }
  });
};

module.exports = {
  sendProductionDebugEmail
};
