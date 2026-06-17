const TransactionModel = require("../../common/models/TransactionModel");
const usersModel = require("../../common/models/usersModel");
const bcrypt = require("bcrypt");
const admin = require("../../common/services/firebase");
const {
  isEmpty,
  isNumber,
  isValidPin,
} = require("../../common/services/utils");
const sequelize = require("../../config/db");
const ElectricityTokensModel = require("../../common/models/electricityTokensModel");
const PaymentsModel = require("../../common/models/paymentsModel");
const FcmTokensModel = require("../../common/models/fcmTokensModel");
const NotificationsModel = require("../../portal/models/NotificationsModel");
const UserNotifications = require("../../common/models/UsersNotificationModel");
const { generateReference } = require("../../common/services/utils");
const path = require("path");
const { generatePdf } = require('../../common/services/pdfService')
const fs = require("fs").promises;
const ReceiptsModel = require("../../common/models/receiptsModel");
const callExternalApi = require("../../common/services/connectSMS");

const RECEIPTS_DIR = "documents/receipts/";
const logoFilename = 'erongred-logo.png';
const absoluteLogoPath = path.join(__dirname, '..', '..', '..', 'assets', 'imgs', logoFilename);

exports.createTransaction = async (req, res) => {
  const {
    amount,
    transactionType,
    paymentDescription,
    serialNo,
    tokens,
    chargedUnits,
    vat,
    receiptNo,
    referenceNumber,
    cellphoneNumber,
  } = req.body;
  const userId = req.user.id;

  const transaction = await sequelize.transaction(); // start txn here

  try {
    const user = await usersModel.findOne({
      where: { id: userId, status: "active" },
      attributes: ["id", "fcmToken", "firstName", "lastName"],
    });

    if (!user) {
      await transaction.rollback();
      return res
        .status(404)
        .json({ status: "FAILED", message: "User not found" });
    }
    const fcmToken = await FcmTokensModel.findOne({
      where: {
        userId,
      },
    });
    // create transaction
    const newTransaction = await TransactionModel.create(
      {
        userId,
        amount,
        transactionType,
        status: "Completed",
        paymentDescription,
        serialNo,
        vat,
        receiptNo,
        chargedUnits,
        referenceNumber: referenceNumber || null,
      },
      { transaction }
    );

    // create tokens
    if (tokens?.length > 0) {
      const tokenData = tokens.map((tokenValue) => ({
        transactionId: newTransaction.id,
        token: tokenValue,
      }));
      await ElectricityTokensModel.bulkCreate(tokenData, { transaction });
    }

    // ✅ commit only DB operations
    await transaction.commit();

    const notification = await NotificationsModel.create({
      title: "Account Payment Successful",
      message: `Your payment of N$${amount} has been processed successfully for ${paymentDescription}`,
      createdAt: new Date(),
      notificationType: "vending",
    });

    await UserNotifications.create({
      userId,
      notificationId: notification.id,
      createdAt: new Date(),
      notificationType: "vending",
      isRead: false,
    });

    // 🔔 Send notification (outside of DB transaction)
    if (fcmToken.fcmToken) {
      const payload = {
        notification: {
          title: "Account Payment Successful",
          body: `Your payment of N$${amount} has been processed successfully for ${paymentDescription}`,
        },
        token: fcmToken.fcmToken,
      };

      try {
        await admin.messaging().send(payload);
      } catch (error) {
        console.error("Error sending push notifications:", error);
      }
    }

    // 📲 External SMS API (also outside DB transaction)
    try {
      await callExternalApi(
        "Erongo RED",
        `+${cellphoneNumber}`,
        `Dear ${user.firstName}, your electricity purchase was successful.\n
Amount Purchased: N$${amount}\n
Token: ${tokens.join(", ")}\n
Units Purchased: ${chargedUnits}\n
Please enter the token on your meter to activate your units.\n
Thank you for choosing Erongo RED.`
      );
    } catch (error) {
      console.error("Error sending SMS:", error.message);
    }

    res.status(201).json({
      status: "SUCCESS",
      message: "Transaction created successfully",
      transaction: newTransaction,
    });
  } catch (error) {
    // rollback if DB fails
    if (transaction) await transaction.rollback();
    console.error("Error", error);
    return res.status(500).json({
      status: "FAILED",
      message: "Internal server error: " + error.message,
    });
  }
};

exports.transactionHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10 } = req.query;

    if (!userId) {
      return res.status(400).json({
        status: "FAILED",
        message: "User ID is required",
      });
    }

    // Validate pagination params
    const pageNumber = parseInt(page, 10);
    const limitNumber = parseInt(limit, 10);

    if (pageNumber < 1 || limitNumber < 1) {
      return res.status(400).json({
        status: "FAILED",
        message: "Page and limit must be positive numbers",
      });
    }

    const offset = (pageNumber - 1) * limitNumber;

    // Fetch transactions + total count
    const { rows: transactions, count: totalTransactions } =
      await TransactionModel.findAndCountAll({
        where: { userId },
        include: [
          {
            model: ElectricityTokensModel,
            as: "tokens",
            attributes: ["token"],
          },
        ],
        order: [["createdAt", "DESC"]],
        limit: limitNumber,
        offset,
        distinct: true, // 🔥 important when using include
      });

    const totalPages = Math.ceil(totalTransactions / limitNumber);

    res.status(200).json({
      status: "SUCCESS",
      message: "Transaction History retrieved successfully",
      data: transactions,
      pagination: {
        currentPage: pageNumber,
        totalPages,
        totalTransactions,
        limit: limitNumber,
        hasNextPage: pageNumber < totalPages,
        hasPreviousPage: pageNumber > 1,
      },
    });
  } catch (error) {
    console.error("Error retrieving transaction history:", error);
    return res.status(500).json({
      status: "FAILED",
      message: "Internal server error: " + error.message,
    });
  }
};

exports.verifyPin = async (req, res) => {
  const { pin } = req.body;
  const userId = req.user.id;

  try {
    if (!pin || isEmpty(pin)) {
      return res.status(400).json({
        status: "FAILED",
        message: "PIN cannot be blank",
      });
    }

    if (!isValidPin(pin)) {
      return res.status(400).json({
        status: "FAILED",
        message: "PIN must be a 4 digit number",
      });
    }

    const user = await usersModel.findOne({
      where: { id: userId, status: "active" },
    });

    if (!user) {
      return res.status(404).json({
        status: "FAILED",
        message: "User not found",
      });
    }

    const isMatch = await bcrypt.compare(pin, user.pin);

    if (!isMatch) {
      return res.status(400).json({
        status: "FAILED",
        message: "Incorrect pin",
      });
    }

    res.status(200).json({
      status: "SUCCESS",
      message: "Pin is correct",
    });
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({
      status: "FAILED",
      message: "Internal server error" + error.message,
    });
  }
};

exports.resetPin = async (req, res) => {
  const { newPin } = req.body;
  const userId = req.user.id;
  try {
    if (!newPin || isEmpty(newPin)) {
      return res.status(400).json({
        status: "FAILED",
        message: "New PIN cannot be blank",
      });
    }

    if (!isValidPin(newPin)) {
      return res.status(400).json({
        status: "FAILED",
        message: "PIN must be a 4 digit number",
      });
    }

    const user = await usersModel.findOne({
      where: { id: userId, status: "active" },
    });

    if (!user) {
      return res.status(404).json({
        status: "FAILED",
        message: "User not found",
      });
    }

    const salt = await bcrypt.genSalt(12);

    const hashedNewPin = await bcrypt.hash(newPin, salt);

    await user.update({ pin: hashedNewPin }, { where: { id: userId } });

    res.status(201).json({
      status: "SUCCESS",
      message: "PIN reset successfully",
    });
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({
      status: "FAILED",
      message: "Internal server error" + error.message,
    });
  }
};
async function fileToBase64(filePath) {
    try {
        const fileBuffer = await fs.readFile(filePath);
        const fileExtension = path.extname(filePath).toLowerCase();
        let mimeType;

        switch (fileExtension) {
            case '.png':
                mimeType = 'image/png';
                break;
            case '.jpg':
            case '.jpeg':
                mimeType = 'image/jpeg';
                break;
            case '.svg':
                mimeType = 'image/svg+xml';
                break;
            default:
                throw new Error('Unsupported file type for Base64 conversion.');
        }

        return `data:${mimeType};base64,${fileBuffer.toString('base64')}`;
    } catch (error) {
        console.error(`Error converting file to Base64: ${error.message}`);
        return null;
    }
}
exports.createPayment = async (req, res) => {
  try {
    const {
      amount,
      accountNo,
      date,
      accountHolder,
      cellphoneNumber,
      paymentMethod,
      transactionReferenceNo,
      type,
      statusMessage,
      resultCode,
      transactionStatus,
      paymentBy,
    } = req.body;
    const userId = req.user.id;
    const status = "Pending";
    let paymentByDate = null;

    const fcmTokens = await FcmTokensModel.findAll({
      where: { userId },
      attributes: ["fcmToken"],
    });

    const refNo = generateReference(10);

    // Validation logic (keeping existing validations)
    if (!amount || isEmpty(amount)) {
      return res.status(400).json({
        status: "FAILED",
        message: "Amount cannot be blank",
      });
    }
    if (!accountNo || isEmpty(accountNo)) {
      return res.status(400).json({
        status: "FAILED",
        message: "Account number cannot be blank",
      });
    }
    if (!date || isEmpty(date)) {
      return res.status(400).json({
        status: "FAILED",
        message: "Date cannot be blank",
      });
    }
    if (!accountHolder || isEmpty(accountHolder)) {
      return res.status(400).json({
        status: "FAILED",
        message: "Account holder cannot be blank",
      });
    }
    if (!cellphoneNumber || isEmpty(cellphoneNumber)) {
      return res.status(400).json({
        status: "FAILED",
        message: "Cellphone number cannot be blank",
      });
    }
    if (!paymentMethod || isEmpty(paymentMethod)) {
      return res.status(400).json({
        status: "FAILED",
        message: "Payment method cannot be blank",
      });
    }

    if (paymentMethod === "Visa") {
      if (!transactionReferenceNo || isEmpty(transactionReferenceNo)) {
        return res.status(400).json({
          status: "FAILED",
          message: "Transaction reference number cannot be blank",
        });
      }

      if (!statusMessage || isEmpty(statusMessage)) {
        return res.status(400).json({
          status: "FAILED",
          message: "Status message cannot be blank",
        });
      }
      if (!resultCode || isEmpty(resultCode)) {
        return res.status(400).json({
          status: "FAILED",
          message: "Result code cannot be blank",
        });
      }
      if (!transactionStatus || isEmpty(transactionStatus)) {
        return res.status(400).json({
          status: "FAILED",
          message: "Transaction status cannot be blank",
        });
      }
    }

    if (paymentBy) {
      const dateString = paymentBy.toString();
      paymentByDate = new Date(
        `${dateString.substring(0, 4)}-${dateString.substring(
          4,
          6
        )}-${dateString.substring(6, 8)}`
      );
    }

    // Create payment in database
    const newPayment = await sequelize.transaction(async (transaction) => {
      return await PaymentsModel.create(
        {
          userId,
          amount,
          accountNo,
          date,
          accountHolder,
          cellphoneNumber,
          paymentMethod,
          status,
          refNo,
          transactionReferenceNo,
          statusMessage,
          transactionStatus,
          resultCode,
          paymentBy: paymentByDate,
        },
        { transaction }
      );
    });

   

    // Get user details for receipt
    let userDetails = {};
    try {
      const user = await usersModel.findByPk(userId);
      if (user) {
        userDetails = {
          fullName: `${user.firstName} ${user.lastName}`,
          email: user.email
        };
      }
    } catch (fetchError) {
      console.error('Error fetching user details for receipt:', fetchError);
    }

    // Generate receipt
    let receiptBuffer = null;
    let receiptFileName = null;
    try {
      const logoPath = path.join(__dirname, '..', '..', '..', 'assets', 'imgs', logoFilename);
      const base64Logo = await fileToBase64(logoPath);


      const receiptHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Erongo Red Payment Receipt</title>
  <style>
    body { font-family: 'Inter', Arial, sans-serif; font-size: 13px; margin:0; }
    .receipt-container { max-width: 750px; margin: auto; border:1px solid #e2e8f0; border-radius:8px; padding:1rem 1.5rem; }
    .header-banner { background:#0a234f; color:#fff; text-align:center; padding:1rem; }
    .receipt-title { font-size:1.5rem; margin:0; }
    .company-info { text-align:center; padding:0.5rem 0; border-bottom:2px solid #d21a22; font-size:0.85rem; }
    .contact-grid { display:flex; flex-wrap:wrap; justify-content:center; gap:0.5rem 1rem; margin-top:0.5rem; color:#64748b; }
    .receipt-header { display:flex; justify-content:space-between; background:#f8fafc; padding:0.8rem 1rem; border-left:3px solid #d21a22; margin:1rem 0; }
    .section-title { font-weight:600; font-size:1rem; color:#0a234f; margin:1rem 0 0.5rem; border-bottom:1px solid #e2e8f0; }
    .info-card { border:1px solid #e2e8f0; border-radius:8px; padding:1rem; margin-bottom:1rem; }
    .info-grid { display:grid; grid-template-columns:1fr 1fr; gap:0.8rem 1rem; font-size:0.85rem; }
    .info-label { color:#64748b; }
    .amount-highlight { background:#0a234f; color:#fff; text-align:center; padding:0.8rem; border-radius:6px; margin-bottom:1rem; }
    .amount-value { font-size:1.4rem; font-weight:700; }
    .status-badge { padding:0.2rem 0.6rem; border-radius:12px; font-size:0.75rem; font-weight:600; }
    .status-pending { background:#fef3c7; color:#d97706; }
    .status-completed { background:#d1fae5; color:#059669; }
    .footer-section { text-align:center; font-size:0.8rem; color:#64748b; border-top:1px solid #e2e8f0; padding-top:0.8rem; }
    @media print { body,.receipt-container{ font-size:11px; zoom:0.95; margin:0; } }
  </style>
</head>
<body>
  <div class="receipt-container">
    <div class="header-banner"><h1 class="receipt-title">Payment Receipt</h1></div>
    <div class="company-info">
      ERONGO RED • REG NO 2004/074
      <div class="contact-grid">
        <div>TEL +264 (64) 201 9000</div>
        <div>TOLL FREE 96000</div>
        <div>FAX +264 (64) 201 9001</div>
        <div>info@erongored.com.na</div>
        <div>91 HAGE GEINGOB STREET</div>
        <div>WALVIS BAY, NAMIBIA</div>
      </div>
    </div>
    <div class="receipt-header">
      <div>
        <div>Receipt No. </div>
        <div class="receipt-id">#${newPayment.id}</div>
      </div>
      <div>
        <strong>Date: </strong><br>
        ${new Intl.DateTimeFormat('en-GB', {year:'numeric',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(date))}
      </div>
    </div>
    <h2 class="section-title">Customer Information</h2>
    <div class="info-card">
      <div class="info-grid">
        <div><span class="info-label">Full Name: </span><span>${userDetails.fullName || 'N/A'}</span></div>
        <div><span class="info-label">Email: </span><span>${userDetails.email || 'N/A'}</span></div>
        <div><span class="info-label">Reference: </span><span>${newPayment.refNo}</span></div>
        <div><span class="info-label">Account No: </span><span>${newPayment.accountNo}</span></div>
      </div>
    </div>
    <h2 class="section-title">Payment Details</h2>
    <div class="info-card">
      <div class="amount-highlight">
        <div>Amount Paid</div>
        <div class="amount-value">N$ ${newPayment.amount}</div>
      </div>
      <div class="info-grid">
        <div><span class="info-label">Method: </span><span>${newPayment.paymentMethod}</span></div>
        <div><span class="info-label">Account Holder: </span><span>${newPayment.accountHolder}</span></div>
        <div><span class="info-label">Status</span>
          <span class="status-badge ${newPayment.status.toLowerCase() === 'completed' ? 'status-completed' : 'status-pending'}">
            ${newPayment.status}
          </span>
        </div>
        <div><span class="info-label">Transaction ID: </span><span>${newPayment.transactionReferenceNo || 'N/A'}</span></div>
      </div>
    </div>
    <div class="footer-section">
      Thank you for your payment submission.<br>
      Please keep this receipt for your records.
    </div>
  </div>
</body>
</html>
    `;


      const file = { content: receiptHtml };
      const options = { format: 'A4' };

      receiptBuffer = await generatePdf(file, options);
      receiptFileName = `receipt-${newPayment.id}.pdf`;
      
      // Save receipt to file system
      const filePath = path.join(RECEIPTS_DIR, receiptFileName);
      await fs.mkdir(RECEIPTS_DIR, { recursive: true });
      await fs.writeFile(filePath, receiptBuffer);

      // Store receipt information in database
      try {
        await ReceiptsModel.create({
          userId: newPayment.userId,
          fileName: receiptFileName,
          filePath: filePath
        });
        console.log(`Receipt record saved to database: ${receiptFileName}`);
      } catch (dbError) {
        console.error('Error saving receipt to database:', dbError);
      }

    } catch (receiptError) {
      console.error('Error generating receipt:', receiptError);
      // Continue with the flow even if receipt generation fails
    }

    // Send push notifications (existing logic)
    const tokens = fcmTokens.map((token) => token.fcmToken);
console.log(tokens);

if (tokens.length > 0) {
  const title = "Electricity Payment Successful";
  const message = `Your payment of N$${amount} has been received and is pending verification`;

  const notification = await NotificationsModel.create({
    title,
    message,
    createdAt: new Date(),
    notificationType: "MadeForYou",
  });

  await UserNotifications.create({
    userId,
    notificationId: notification.id,
    createdAt: new Date(),
    isRead: false,
    notificationType: "MadeForYou",
  });

  const payload = {
    notification: {
      title,
      body: message,
    },
    data: {
      type: "Payment",
      paymentId: newPayment.id.toString(),
    },
    tokens,
  };

  try {
    const response = await admin.messaging().sendEachForMulticast(payload);

    console.log(
      `Push notifications sent. Success: ${response.successCount}, Failure: ${response.failureCount}`
    );

    if (response.failureCount > 0) {
      response.responses.forEach(async (resp, idx) => {
        if (!resp.success) {
          console.error(`Failed to send to ${tokens[idx]}:`, resp.error);

          // Remove invalid/expired tokens
          if (
            resp.error.code === "messaging/registration-token-not-registered" ||
            resp.error.code === "messaging/invalid-argument"
          ) {
            await FcmTokensModel.destroy({
              where: { userId, fcmToken: tokens[idx] },
            });
          }
        }
      });
    }
  } catch (error) {
    console.error("Error sending push notifications:", error);
    // No idx available here, so don't attempt to delete tokens
  }
}

    const response = {
      status: "SUCCESS",
      message: "Payment created successfully",
      payment: newPayment,
    };

    // If receipt was generated, include it in response or send as attachment
    if (receiptBuffer && receiptFileName) {
      // // Option 1: Send receipt as PDF attachment
      // res.setHeader('Content-Type', 'application/pdf');
      // res.setHeader('Content-Disposition', `attachment; filename="${receiptFileName}"`);
      // res.send(receiptBuffer);
      res.status(201).json(response);
    } else {
      res.status(201).json(response);
    }

  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({
      status: "FAILED",
      message: "Internal server error: " + error.message,
    });
  }
};
exports.getReceipt = async (req, res) => {
  try {
    const userId = req.user.id;

    if (!userId || isEmpty(userId)) {
      return res.status(400).json({
        status: "FAILED",
        message: "User ID is required",
      });
    }

    const receiptRecords = await ReceiptsModel.findAll({
      where: {
        userId: userId,
      },
      order: [["createdAt", "DESC"]],
    });

    if (!receiptRecords || receiptRecords.length === 0) {
      return res.status(404).json({
        status: "FAILED",
        message: "No receipts found for this user",
      });
    }

    const availableReceipts = [];

    for (const receipt of receiptRecords) {
      try {
        await fs.access(receipt.filePath, fs.constants.R_OK);

        availableReceipts.push({
          id: receipt.id,
          fileName: receipt.fileName,
          filePath: receipt.filePath,
          createdAt: receipt.createdAt,
          updatedAt: receipt.updatedAt,
        });
      } catch (fileError) {
        console.warn(
          `File not found for receipt ${receipt.id}: ${receipt.filePath}`
        );
        continue;
      }
    }

    if (availableReceipts.length === 0) {
      return res.status(200).json({
        status: "SUCCESS",
        message: "No receipt files found on server for this user",
      });
    }

    return res.status(200).json({
      status: "SUCCESS",
      message: `Found ${availableReceipts.length} receipt(s) for user`,
      data: {
        userId: userId,
        receiptsCount: availableReceipts.length,
        receipts: availableReceipts,
      },
    });
  } catch (error) {
    console.error("Error retrieving user receipts:", error);
    return res.status(500).json({
      status: "FAILED",
      message: "Internal server error: " + error.message,
    });
  }
};

exports.nextPayment = async (req, res) => {
  try {
    const userId = req.user.id;
    const { paymentBy, amount, accountNo } = req.body;

    if (!paymentBy || isEmpty(paymentBy)) {
      return res.status(400).json({
        status: "FAILED",
        message: "Payment date cannot be blank",
      });
    }

    if (!amount || isEmpty(amount)) {
      return res.status(400).json({
        status: "FAILED",
        message: "Amount cannot be blank",
      });
    }

    if (!accountNo || isEmpty(accountNo)) {
      return res.status(400).json({
        status: "FAILED",
        message: "Account number cannot be blank",
      });
    }

    const paymentByDate = new Date(
      `${paymentBy.toString().substring(0, 4)}-${paymentBy
        .toString()
        .substring(4, 6)}-${paymentBy.toString().substring(6, 8)}`
    );

    const nextPayment = await PaymentsModel.create({
      userId,
      accountNo,
      amount,
      status: "Pending",
      paymentBy: paymentByDate,
    });

    res.status(201).json({
      status: "SUCCESS",
      message: "Next payment created successfully",
      nextPayment,
    });
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({
      status: "FAILED",
      message: "Internal server error" + error.message,
    });
  }
};

exports.getPendingPayments = async (req, res) => {
  try {
    const userId = req.user.id;

    const pendingPayments = await PaymentsModel.findAll({
      where: {
        userId: userId,
        status: "Pending",
      },
      order: [["date", "DESC"]],
    });

    res.status(200).json({
      status: "SUCCESS",
      message: "Pending payments retrieved successfully",
      payments: pendingPayments,
    });
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({
      status: "FAILED",
      message: "Internal server error" + error.message,
    });
  }
};

