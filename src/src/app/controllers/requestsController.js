const TransactionModel = require("../../common/models/TransactionModel");
const MCodeModel = require("../../common/models/mcodeModel");
const xml2js = require("xml2js");
const bcrypt = require("bcrypt");
const { Op, where } = require("sequelize");
const { isEmpty } = require("../../common/services/utils");
const { transporter } = require("../../common/services/transporter");
const usersModel = require("../../common/models/usersModel");
const FcmTokensModel = require("../../common/models/fcmTokensModel");
const admin = require("../../common/services/firebase");
const UserNotifications = require("../../common/models/UsersNotificationModel");
const NotificationsModel = require("../../portal/models/NotificationsModel");
const ElectricityTokensModel = require("../../common/models/electricityTokensModel");
require("dotenv").config();
const callExternalApi = require("../../common/services/connectSMS");

const partnerCode =
  process.env.ENVIRONMENT === "UAT"
    ? process.env.PARTNER_CODE_UAT
    : process.env.PARTNER_CODE_PROD;

const key =
  process.env.ENVIRONMENT === "UAT"
    ? process.env.SECURITY_KEY_UAT
    : process.env.SECURITY_KEY_PROD;

const authCode =
  process.env.ENVIRONMENT === "UAT"
    ? process.env.LOCAL_AUTH_CODE_UAT
    : process.env.LOCAL_AUTH_CODE_PROD;

const authName =
  process.env.ENVIRONMENT === "UAT"
    ? process.env.LOCAL_AUTH_NAME_UAT
    : process.env.LOCAL_AUTH_NAME_PROD;

const partnerName =
  process.env.ENVIRONMENT === "UAT"
    ? process.env.PARTNER_NAME_UAT
    : process.env.PARTNER_NAME_PROD;

const syntelBaseURL =
  process.env.ENVIRONMENT === "UAT"
    ? process.env.SYNTELL_URL2
    : process.env.SYNTELL_URL2_PROD;

const lookUpUrlHeader = process.env.LOOKUP_REQUEST_URL;

const VendUrlHeader = process.env.VEND_REQUEST_URL;

exports.mcode = async (req, res) => {
  let { meterNumber, mobileNumber, amount } = req.body;

  if (!meterNumber || isEmpty(meterNumber)) {
    return res.status(400).json({
      status: "FAILED",
      message: "Meter number cannot be blank",
    });
  }

  if (!mobileNumber || isEmpty(mobileNumber)) {
    return res.status(400).json({
      status: "FAILED",
      message: "Mobile number cannot be blank",
    });
  }

  if (!amount || isEmpty(amount)) {
    return res.status(400).json({
      status: "FAILED",
      message: "Amount cannot be blank",
    });
  }

  try {
    const now = new Date();
    const dateTime = now
      .toISOString()
      .replace(/[-T:.Z]/g, "")
      .slice(0, 14);
    const uniqueNumber = now.getTime();

    const xmlRequest = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
    xmlns:tem="http://tempuri.org/"
    xmlns:s3v="http://schemas.datacontract.org/2004/07/S3VendingWS.Messages.ComplextType"
    xmlns:s3v1="http://schemas.datacontract.org/2004/07/S3VendingWS.Messages">
  <soapenv:Header/>
  <soapenv:Body>
    <tem:VendContext>
      <tem:vendContextRequest>
        <s3v:PartnerCode>${partnerCode}</s3v:PartnerCode>
        <s3v:SecurityKey>${key}</s3v:SecurityKey>
        <s3v:LocalAuthorityCode>${authCode}</s3v:LocalAuthorityCode>
        <s3v:TerminalIdentifier>${authName}</s3v:TerminalIdentifier>
        <s3v:MessageId>
          <s3v:DateTime>${dateTime}</s3v:DateTime>
          <s3v:UniqueNo>${uniqueNumber}</s3v:UniqueNo>
        </s3v:MessageId>
        <s3v:OperatorName>${partnerName}</s3v:OperatorName>
        <s3v1:VendIdMethod xsi:type="s3v:Meter" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
          <s3v:SerialNumber>${meterNumber}</s3v:SerialNumber>
        </s3v1:VendIdMethod>
      </tem:vendContextRequest>
    </tem:VendContext>
  </soapenv:Body>
</soapenv:Envelope>`;

    const response = await fetch(`${syntelBaseURL}`, {
      method: "POST",
      headers: {
        SOAPAction: `${lookUpUrlHeader}`,
        "Content-Type": "text/xml",
      },
      body: xmlRequest,
    });

    const responseData = await response.text();

    const result = await xml2js.parseStringPromise(responseData, {
      explicitArray: false,
      trim: true,
    });

    const body = result["s:Envelope"]["s:Body"];
    if (body["VendContextResponse"]) {
      const maxVendAmount =
        body["VendContextResponse"]["VendContextResult"]["a:maxVendAmt"];
      const minVendAmount =
        body["VendContextResponse"]["VendContextResult"]["a:minVendAmt"];

      if (amount < minVendAmount || amount > maxVendAmount) {
        return res.status(400).json({
          status: "FAILED",
          code: "4004",
          message:
            "Amount must be between " + minVendAmount + " and " + maxVendAmount,
        });
      }

      const secondApiCall = await fetch(
        `${process.env.MARIS_EXECUTE_GENERATE_MCODE}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: process.env.MARIS_EXECUTE_GENERATE_MCODE_TOKEN,
          },
          body: JSON.stringify({
            amount,
            channelMask: "1001",
            currency: "NAD",
            mobileNumber,
          }),
        },
      );

      const contentType = secondApiCall.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const rawResponse = await secondApiCall.text();
        console.error("❌ Expected JSON but got something else:", rawResponse);
        return res.status(500).json({
          status: "FAILED",
          code: "5001",
          message: "Received non-JSON response from second API",
          raw: rawResponse,
        });
      }

      const secondApiResponse = await secondApiCall.json();

      if (secondApiResponse.response.code === "0000") {
        const salt = await bcrypt.genSalt();
        let hashedOTP = await bcrypt.hash(
          secondApiResponse.transaction.mcode,
          salt,
        );
        await MCodeModel.create({
          mcode: hashedOTP,
          createdAt: Date.now(),
          expiresAt: Date.now() + 60000,
        });

        return res.status(200).json({
          status: "SUCCESS",
          code: "0000",
          message: "Mcode generated successfully",
          data: secondApiResponse.response,
          mcode: secondApiResponse.transaction.mcode,
        });
      }

      return res.status(404).json({
        status: "FAILED",
        code: "4001",
        message: "Sender Customer Profile not found",
        data: secondApiResponse.response,
      });
    } else {
      return res.status(404).json({
        status: "FAILED",
        code: "4000",
        message: "Meter number does not exist",
      });
    }
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({
      status: "FAILED",
      code: "5000",
      message: "Internal Server Error " + error.message,
    });
  }
};

exports.mcodeTest = async (req, res) => {
  let { meterNumber, mobileNumber, amount } = req.body;

  const userId = req.user.id;

  if (!meterNumber || isEmpty(meterNumber)) {
    return res.status(400).json({
      status: "FAILED",
      message: "Meter number cannot be blank",
    });
  }

  if (!mobileNumber || isEmpty(mobileNumber)) {
    return res.status(400).json({
      status: "FAILED",
      message: "Mobile number cannot be blank",
    });
  }

  if (!amount || isEmpty(amount)) {
    return res.status(400).json({
      status: "FAILED",
      message: "Amount cannot be blank",
    });
  }

  try {
    const user = await usersModel.findByPk(userId, {
      attributes: ["email"],
      where: { status: "active" },
    });

    const now = new Date();
    const dateTime =
      now.getFullYear().toString() +
      (now.getMonth() + 1).toString().padStart(2, "0") +
      now.getDate().toString().padStart(2, "0") +
      now.getHours().toString().padStart(2, "0") +
      now.getMinutes().toString().padStart(2, "0") +
      now.getSeconds().toString().padStart(2, "0");
    const uniqueNumber = now.getTime();

    const xmlRequest = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
    xmlns:tem="http://tempuri.org/"
    xmlns:s3v="http://schemas.datacontract.org/2004/07/S3VendingWS.Messages.ComplextType"
    xmlns:s3v1="http://schemas.datacontract.org/2004/07/S3VendingWS.Messages">
  <soapenv:Header/>
  <soapenv:Body>
    <tem:VendContext>
      <tem:vendContextRequest>
        <s3v:PartnerCode>${partnerCode}</s3v:PartnerCode>
        <s3v:SecurityKey>${key}</s3v:SecurityKey>
        <s3v:LocalAuthorityCode>${authCode}</s3v:LocalAuthorityCode>
        <s3v:TerminalIdentifier>${authName}</s3v:TerminalIdentifier>
        <s3v:MessageId>
          <s3v:DateTime>${dateTime}</s3v:DateTime>
          <s3v:UniqueNo>${uniqueNumber}</s3v:UniqueNo>
        </s3v:MessageId>
        <s3v:OperatorName>${partnerName}</s3v:OperatorName>
        <s3v1:VendIdMethod xsi:type="s3v:Meter" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
          <s3v:SerialNumber>${meterNumber}</s3v:SerialNumber>
        </s3v1:VendIdMethod>
      </tem:vendContextRequest>
    </tem:VendContext>
  </soapenv:Body>
</soapenv:Envelope>`;

    const response = await fetch(`${syntelBaseURL}`, {
      method: "POST",
      headers: {
        SOAPAction: `${lookUpUrlHeader}`,
        "Content-Type": "text/xml",
      },
      body: xmlRequest,
    });

    const responseData = await response.text();

    const result = await xml2js.parseStringPromise(responseData, {
      explicitArray: false,
      trim: true,
    });

    const body = result["s:Envelope"]["s:Body"];

    if (body["VendContextResponse"]) {
      const maxVendAmount =
        body["VendContextResponse"]["VendContextResult"]["a:maxVendAmt"];
      const minVendAmount =
        body["VendContextResponse"]["VendContextResult"]["a:minVendAmt"];

      if (amount < minVendAmount || amount > maxVendAmount) {
        return res.status(400).json({
          status: "FAILED",
          code: "4004",
          message:
            "Amount must be between " + minVendAmount + " and " + maxVendAmount,
        });
      }

      const secondApiCall = await fetch(
        `${process.env.MARIS_EXECUTE_GENERATE_MCODE}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: process.env.MARIS_EXECUTE_GENERATE_MCODE_TOKEN,
          },
          body: JSON.stringify({
            amount,
            channelMask: "1001",
            currency: "NAD",
            mobileNumber,
          }),
        },
      );

      const rawText = await secondApiCall.text();

      let secondApiResponse;
      try {
        secondApiResponse = JSON.parse(rawText);
      } catch (jsonErr) {
        console.error(
          "❌ Failed to parse JSON from second API response. Raw response:",
        );
        console.error(rawText);
        return res.status(502).json({
          status: "FAILED",
          code: "4002",
          message: "Invalid response from downstream service (not JSON)",
        });
      }

      if (secondApiResponse.response.code === "0000") {
        const salt = await bcrypt.genSalt();
        let hashedOTP = await bcrypt.hash(
          secondApiResponse.transaction.mcode,
          salt,
        );

        await MCodeModel.create({
          mcode: hashedOTP,
          createdAt: Date.now(),
          expiresAt: Date.now() + 60000,
        });

        await transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: user.email,
          subject: "Your mcode",
          text: `Your mcode is: ${secondApiResponse.transaction.mcode}`,
        });

        return res.status(200).json({
          status: "SUCCESS",
          code: "0000",
          message: "Mcode generated successfully",
          data: secondApiResponse.response,
          mcode: secondApiResponse.transaction.mcode,
        });
      }

      return res.status(404).json({
        status: "FAILED",
        code: "4001",
        message: "Sender Customer Profile not found",
        data: secondApiResponse.response,
      });
    } else {
      return res.status(404).json({
        status: "FAILED",
        code: "4000",
        message: "Meter number does not exist",
      });
    }
  } catch (error) {
    console.error("💥 Internal Error:", error);
    return res.status(500).json({
      status: "FAILED",
      code: "5000",
      message: "Internal Server Error " + error.message,
    });
  }
};

exports.mcodePostpaid = async (req, res) => {
  let { mobileNumber, amount } = req.body;

  if (!mobileNumber || isEmpty(mobileNumber)) {
    return res.status(400).json({
      status: "FAILED",
      message: "Mobile number cannot be blank",
    });
  }

  if (!amount || isEmpty(amount)) {
    return res.status(400).json({
      status: "FAILED",
      message: "Amount cannot be blank",
    });
  }

  try {
    const secondApiCall = await fetch(
      `${process.env.MARIS_EXECUTE_GENERATE_MCODE}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: process.env.MARIS_EXECUTE_GENERATE_MCODE_TOKEN,
        },
        body: JSON.stringify({
          amount,
          channelMask: "1001",
          currency: "NAD",
          mobileNumber,
        }),
      },
    );

    const secondApiResponse = await secondApiCall.json();
    if (secondApiResponse.response.code === "0000") {
      const salt = await bcrypt.genSalt();
      let hashedOTP = await bcrypt.hash(
        secondApiResponse.transaction.mcode,
        salt,
      );
      console.warn(hashedOTP);
      await MCodeModel.create({
        mcode: hashedOTP,
        createdAt: Date.now(),
        expiresAt: Date.now() + 60000,
      });
      console.error(secondApiResponse.transaction.mcode);
      return res.status(200).json({
        status: "SUCCESS",
        code: "0000",
        message: "Mcode generated successfully",
        data: secondApiResponse.response,
        mcode: secondApiResponse.transaction.mcode,
      });
    }

    return res.status(404).json({
      status: "FAILED",
      code: "4001",
      message: "Sender Customer Profile not found",
      data: secondApiResponse.response,
    });
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({
      status: "FAILED",
      code: "5000",
      message: "Internal Server Error " + error.message,
    });
  }
};

exports.mcodePostpaidTest = async (req, res) => {
  let { mobileNumber, amount } = req.body;

  const userId = req.user.id;

  if (!mobileNumber || isEmpty(mobileNumber)) {
    return res.status(400).json({
      status: "FAILED",
      message: "Mobile number cannot be blank",
    });
  }

  if (!amount || isEmpty(amount)) {
    return res.status(400).json({
      status: "FAILED",
      message: "Amount cannot be blank",
    });
  }

  try {
    const user = await usersModel.findByPk(userId, {
      attributes: ["email"],
      where: { status: "active" },
    });

    if (!user) {
      return res.status(404).json({
        status: "FAILED",
        message: "User not found",
      });
    }
    const secondApiCall = await fetch(
      `${process.env.MARIS_EXECUTE_GENERATE_MCODE}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: process.env.MARIS_EXECUTE_GENERATE_MCODE_TOKEN,
        },
        body: JSON.stringify({
          amount,
          channelMask: "1001",
          currency: "NAD",
          mobileNumber,
        }),
      },
    );

    const secondApiResponse = await secondApiCall.json();
    if (secondApiResponse.response.code === "0000") {
      const salt = await bcrypt.genSalt();
      let hashedOTP = await bcrypt.hash(
        secondApiResponse.transaction.mcode,
        salt,
      );
      console.warn(hashedOTP);
      await MCodeModel.create({
        mcode: hashedOTP,
        createdAt: Date.now(),
        expiresAt: Date.now() + 60000,
      });

      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: user.email,
        subject: "Your mcode",
        text: `Your mcode is: ${secondApiResponse.transaction.mcode}`,
      });

      console.error(secondApiResponse.transaction.mcode);
      return res.status(200).json({
        status: "SUCCESS",
        code: "0000",
        message: "Mcode generated successfully",
        data: secondApiResponse.response,
        mcode: secondApiResponse.transaction.mcode,
      });
    }

    return res.status(404).json({
      status: "FAILED",
      code: "4001",
      message: "Sender Customer Profile not found",
      data: secondApiResponse.response,
    });
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({
      status: "FAILED",
      code: "5000",
      message: "Internal Server Error " + error.message,
    });
  }
};

exports.resendMcode = async (req, res) => {
  let { mobileNumber, amount } = req.body;

  if (!mobileNumber || isEmpty(mobileNumber)) {
    return res.status(400).json({
      status: "FAILED",
      message: "Mobile number cannot be blank",
    });
  }
  console.log("amount", amount);
  if (!amount || isEmpty(amount)) {
    return res.status(400).json({
      status: "FAILED",
      message: "Amount cannot be blank",
    });
  }

  try {
    await MCodeModel.destroy({
      where: {
        expiresAt: {
          [Op.lt]: new Date(),
        },
      },
    });

    const secondApiCall = await fetch(
      `${process.env.MARIS_EXECUTE_GENERATE_MCODE}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: process.env.MARIS_EXECUTE_GENERATE_MCODE_TOKEN,
        },
        body: JSON.stringify({
          amount,
          channelMask: "1001",
          currency: "NAD",
          mobileNumber,
        }),
      },
    );

    const secondApiResponse = await secondApiCall.json();
    if (secondApiResponse.response.code === "0000") {
      const salt = await bcrypt.genSalt();
      hashedOTP = await bcrypt.hash(secondApiResponse.transaction.mcode, salt);
      console.warn(hashedOTP);
      await MCodeModel.create({
        mcode: hashedOTP,
        createdAt: Date.now(),
        expiresAt: Date.now() + 60000,
      });
      console.error(secondApiResponse.transaction.mcode);
      return res.status(200).json({
        status: "SUCCESS",
        message: secondApiResponse.response,
        mocode: secondApiResponse.transaction.mcode,
      });
    }

    return res.status(404).json({
      status: "FAILED",
      message: "Sender Customer Profile not found",
      data: secondApiResponse.response,
    });
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({
      status: "FAILED",
      message: "Internal Server Error " + error.message,
    });
  }
};

exports.vend = async (req, res) => {
  let { meterNumber, mcode, mobileNumber, amount, type, transactionType } =
    req.body;
  const userId = req.user.id;

  if (amount <= 0) {
    return res.status(400).json({
      status: "FAILED",
      code: "4006",
      message: "Invalid amount. Please enter a value greater than $N 0.00",
    });
  }

  try {
    if (type === "maris") {
      if (!mobileNumber || isEmpty(mobileNumber)) {
        return res.status(400).json({
          status: "FAILED",
          message: "Mobilenumber cannot be blank",
        });
      }

      if (!amount || isEmpty(amount)) {
        return res.status(400).json({
          status: "FAILED",
          message: "Amount cannot be blank",
        });
      }

      if (!meterNumber || isEmpty(meterNumber)) {
        return res.status(400).json({
          status: "FAILED",
          message: "Meter number cannot be blank",
        });
      }
      if (!mcode || isEmpty(mcode)) {
        return res.status(400).json({
          status: "FAILED",
          message: "Mcode cannot be blank",
        });
      }

      const codes = await MCodeModel.findAll({
        where: {
          expiresAt: { [Op.gt]: new Date() },
        },
      });

      let matchedCode = null;
      for (const code of codes) {
        const isValid = await bcrypt.compare(mcode, code.mcode);
        if (isValid) {
          matchedCode = code;
          break;
        }
      }

      if (!matchedCode) {
        await MCodeModel.destroy({
          where: {
            expiresAt: {
              [Op.lt]: new Date(),
            },
          },
        });

        return res.status(404).json({
          status: "FAILED",
          code: "4005",
          message: "Invalid or expired code.",
        });
      }

      const secondApiCall = await fetch(
        `${process.env.MARIS_EXECUTE_MERCHANT_PAYMENT}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: process.env.MARIS_EXECUTE_MERCHANT_PAYMENT_TOKEN,
          },
          body: JSON.stringify({
            amount,
            channelMask: "2002",
            currency: "NAD",
            mcode,
            mobileNumber,
            reason: "Payment to merchant account for services rendered",
            receiverMobileNumber: "264818133436",
            receiverServiceMask: "MERCHANT_PAY_RECEIPT",
            senderServiceMask: "MERCHANT_PAY_SEND",
            transactionSubType: "MERCHANT_PAYMENT",
            userName: "TC",
            merchantId: "202269730",
            requestType: "PULL",
          }),
        },
      );

      const contentType = secondApiCall.headers.get("content-type");
      let secondApiResponse;
      if (contentType && contentType.includes("application/json")) {
        secondApiResponse = await secondApiCall.json();
      } else if (contentType && contentType.includes("text/html")) {
        const html = await secondApiCall.text();
        console.error("Received HTML response from secondApiCall:", html);
        return res.status(400).json({
          status: "FAILED",
          code: "4002",
          message: "Unexpected HTML response from payment provider.",
          html: html,
        });
      } else {
        return res.status(400).json({
          status: "FAILED",
          code: "4002",
          message: "Unexpected response format from payment provider.",
        });
      }

      if (secondApiResponse.response.code !== "0000") {
        return res.status(404).json({
          status: "FAILED",
          message: secondApiResponse.response,
        });
      }

      if (secondApiResponse.response.code === "0000") {
        const notificationTitle = "Payment Successful";
        const notificationMessage = `Your payment of NAD ${amount} for meter ${meterNumber} was successful.`;

        let notification = await NotificationsModel.findOne({
          where: {
            title: notificationTitle,
            message: notificationMessage,
            notificationType: "payment",
          },
        });

        if (!notification) {
          notification = await NotificationsModel.create({
            title: notificationTitle,
            message: notificationMessage,
            image: null,
            scheduledAt: null,
            createdAt: new Date(),
            notificationType: "payment",
          });
        }

        const existingUserNotification = await UserNotifications.findOne({
          where: {
            userId: userId,
            notificationId: notification.id,
          },
        });

        if (!existingUserNotification) {
          await UserNotifications.create({
            userId: userId,
            notificationId: notification.id,
            createdAt: new Date(),
            isRead: false,
            notificationType: "payment",
          });
        }

        const fcmTokensWithUsers = await FcmTokensModel.findAll({
          where: { userId },
          attributes: ["fcmToken"],
        });

        const fcmTokens = fcmTokensWithUsers.map(
          (tokenRecord) => tokenRecord.fcmToken,
        );

        if (fcmTokens.length > 0) {
          const message = {
            notification: {
              title: notificationTitle,
              body: notificationMessage,
            },
            data: {
              navigationId: "PaymentsHistory",
              notificationId: notification.id,
            },
            tokens: fcmTokens,
          };
          try {
            await admin.messaging().sendEachForMulticast(message);
            console.log(
              `✅ Push notifications sent successfully to ${fcmTokens.length} devices.`,
            );
          } catch (error) {
            console.error("❌ Error sending notification:", error);
          }
        }

        // return res.status(200).json({
        //   status: "SUCCESS",
        //   message: "Payment successful",
        //   data: secondApiResponse.response,
        //   notificationId: notification.id
        // });

        const now = new Date();
        const dateTime =
          now.getFullYear().toString() +
          (now.getMonth() + 1).toString().padStart(2, "0") +
          now.getDate().toString().padStart(2, "0") +
          now.getHours().toString().padStart(2, "0") +
          now.getMinutes().toString().padStart(2, "0") +
          now.getSeconds().toString().padStart(2, "0");
        const uniqueNumber = now.getTime();

        const xmlRequest = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
    xmlns:tem="http://tempuri.org/"
    xmlns:s3v="http://schemas.datacontract.org/2004/07/S3VendingWS.Messages.ComplextType"
    xmlns:s3v1="http://schemas.datacontract.org/2004/07/S3VendingWS.Messages"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
    <soapenv:Header/>
    <soapenv:Body>
        <tem:Vend>
            <tem:vendRequest>
                <s3v:PartnerCode>${partnerCode}</s3v:PartnerCode>
                <s3v:SecurityKey>${key}</s3v:SecurityKey>
                <s3v:LocalAuthorityCode>${authCode}</s3v:LocalAuthorityCode>
                <s3v:TerminalIdentifier>${authName}</s3v:TerminalIdentifier>
                <s3v:MessageId>
                    <s3v:DateTime>${dateTime}</s3v:DateTime>
                    <s3v:UniqueNo>${uniqueNumber}</s3v:UniqueNo>
                </s3v:MessageId>
                <s3v:OperatorName>${partnerName}</s3v:OperatorName>
                <s3v1:VendIdMethod xsi:type="s3v:Meter">
                    <s3v:SerialNumber>${meterNumber}</s3v:SerialNumber>
                </s3v1:VendIdMethod>
                <s3v1:Amount>${amount}</s3v1:Amount>
                <s3v1:PayType xsi:type="s3v:Cash" />
            </tem:vendRequest>
        </tem:Vend>
    </soapenv:Body>
</soapenv:Envelope>`;

        const sendRequestWithRetry = async (attempt = 1) => {
          try {
            const response = await fetch(`${syntelBaseURL}`, {
              method: "POST",
              headers: {
                SOAPAction: `${lookUpUrlHeader2}`,
                "Content-Type": "text/xml",
              },
              body: xmlRequest,
            });
            const responseText = await response.text();
            console.log("here is my response response: ", responseText);

            if (!response.ok) {
              throw new Error(`Request failed with status ${response.status}`);
            }

            return responseText;
          } catch (error) {
            if (attempt < 3) {
              console.log(`Retry attempt ${attempt} failed. Retrying...`);
              return await sendRequestWithRetry(attempt + 1);
            }
            console.error(`All retry attempts failed: ${error.message}`);

            const failedNotificationTitle = "Vending Failed";
            const failedNotificationMessage = `Your purchase of NAD ${amount} for meter ${meterNumber} failed. Contact help desk to get your money back.`;

            try {
              let failedNotification = await NotificationsModel.findOne({
                where: {
                  title: failedNotificationTitle,
                  message: failedNotificationMessage,
                  notificationType: "vending_failed",
                },
              });

              if (!failedNotification) {
                failedNotification = await NotificationsModel.create({
                  title: failedNotificationTitle,
                  message: failedNotificationMessage,
                  image: null,
                  scheduledAt: null,
                  createdAt: new Date(),
                  notificationType: "vending_failed",
                });
              }

              const existingFailedUserNotification =
                await UserNotifications.findOne({
                  where: {
                    userId: userId,
                    notificationId: failedNotification.id,
                  },
                });

              if (!existingFailedUserNotification) {
                await UserNotifications.create({
                  userId: userId,
                  notificationId: failedNotification.id,
                  createdAt: new Date(),
                  isRead: false,
                  notificationType: "vending_failed",
                });
              }
            } catch (notificationError) {
              console.error(
                "Error creating failed vending notification:",
                notificationError,
              );
            }

            await TransactionModel.create({
              meterNumber,
              amount,
              status: "FAILED",
              userId,
              paymentDescription: `${error.message} ${mobileNumber}}`,
              transactionType,
            });
            const newError = new Error(
              "Vending unsuccessful. Contact help desk to get your money back",
            );
            newError.code = "5001";
            throw newError;
          }
        };

        const responseData = await sendRequestWithRetry();

        const xmlResult = await new Promise((resolve, reject) => {
          xml2js.parseString(
            responseData,
            { explicitArray: false, trim: true },
            (err, result) => {
              if (err)
                reject(
                  new Error(`Failed to parse XML response: ${err.message}`),
                );
              else resolve(result);
            },
          );
        });

        const body = xmlResult["s:Envelope"]["s:Body"];

        if (body["VendResponse"] && body["VendResponse"]["VendResult"]) {
          const vendResult = body["VendResponse"]["VendResult"];
          console.log(body["VendResponse"]["a:Token"]);
          let tokens = vendResult["a:Token"]?.["b:string"];
          tokens = Array.isArray(tokens) ? tokens : [tokens];

          const notificationTitle = "Vending Successful";
          const notificationMessage = `Your purchase of NAD ${amount} for meter ${meterNumber} was successful.`;

          let notification = await NotificationsModel.findOne({
            where: {
              title: notificationTitle,
              message: notificationMessage,
              notificationType: "vending",
            },
          });

          if (!notification) {
            notification = await NotificationsModel.create({
              title: notificationTitle,
              message: notificationMessage,
              image: null,
              scheduledAt: null,
              createdAt: new Date(),
              notificationType: "vending",
            });
          }

          const existingUserNotification = await UserNotifications.findOne({
            where: {
              userId: userId,
              notificationId: notification.id,
            },
          });

          if (!existingUserNotification) {
            await UserNotifications.create({
              userId: userId,
              notificationId: notification.id,
              createdAt: new Date(),
              isRead: false,
              notificationType: "vending",
            });
          }

          const fcmTokensWithUsers = await FcmTokensModel.findAll({
            where: { userId },
            attributes: ["fcmToken"],
          });

          const fcmTokens = fcmTokensWithUsers.map(
            (tokenRecord) => tokenRecord.fcmToken,
          );

          if (fcmTokens.length > 0) {
            const message = {
              notification: {
                title: notificationTitle,
                body: notificationMessage,
              },
              data: {
                navigationId: "PaymentsHistory",
                tokens: tokens.join(", "),
                notificationId: notification.id,
              },
              tokens: fcmTokens,
            };
            try {
              await admin.messaging().sendEachForMulticast(message);
              console.log(
                `✅ Push notifications sent successfully to ${fcmTokens.length} devices.`,
              );
            } catch (error) {
              console.error("❌ Error sending notification:", error);
            }
          }

          return res.json({
            partnerCode: vendResult.PartnerCode._,
            localAuthorityCode: vendResult.LocalAuthorityCode._,
            terminalIdentifier: vendResult.TerminalIdentifier._,
            requestMessageId: {
              dateTime: vendResult.RequestMessageId.DateTime,
              uniqueNo: vendResult.RequestMessageId.UniqueNo,
            },
            operatorName: vendResult.OperatorName._,
            responseDateTime: vendResult["a:ResponseDateTime"],
            meterDetail: {
              meterNumber: vendResult["a:MeterDetail"]["b:MeterNumber"],
              supplyGroupCode: vendResult["a:MeterDetail"]["b:SupplyGroupCode"],
              keyRevisionNumber:
                vendResult["a:MeterDetail"]["b:KeyRevisionNumber"],
              tariffIndex: vendResult["a:MeterDetail"]["b:TariffIndex"],
            },
            debtPayment: {
              name: vendResult["a:DebtPayment"]["b:Name"],
              amount: vendResult["a:DebtPayment"]["b:Amount"],
            },
            utilityDetail: {
              name: vendResult["a:UtilityDetail"]["b:Name"],
              varRegistrationNumber:
                vendResult["a:UtilityDetail"]["b:VarRegistrationNumber"],
              message: vendResult["a:UtilityDetail"]["b:Message"],
            },
            customerDetail: {
              name: vendResult["a:CustomerDetail"]["b:Name"],
              address: vendResult["a:CustomerDetail"]["b:Address"],
              daysSinceLastPurchase:
                vendResult["a:CustomerDetail"]["b:DaysSinceLastPurchase"],
              tariff: {
                name: vendResult["a:CustomerDetail"]["b:Tariff"]["b:Name"],
                centsPerUnit:
                  vendResult["a:CustomerDetail"]["b:Tariff"]["b:CentsPerUnit"][
                    "c:string"
                  ],
              },
            },
            request: xmlRequest,
            response: responseData,
            utilityAmountExclVat: vendResult["a:UtilityAmountExclVat"],
            vat: vendResult["a:Vat"],
            token: tokens,
            freeUnits: vendResult["a:FreeUnits"],
            receiptNumber: vendResult["a:ReceiptNumber"],
            chargedUnits: vendResult["a:ChargedUnits"],
            serviceChargeExclVat: vendResult["a:ServiceChargeExclVat"],
            isReprint: vendResult["a:IsReprint"],
            utilityLevies: [
              {
                units: vendResult["a:UtilityLevyUnits"],
                desc: vendResult["a:UtilityLevyDesc"],
              },
              {
                units: vendResult["a:UtilityLevy2Units"],
                desc: vendResult["a:UtilityLevy2Desc"],
              },
              {
                units: vendResult["a:UtilityLevy3Units"],
                desc: vendResult["a:UtilityLevy3Desc"],
              },
            ],
            notificationId: notification.id,
          });
        }

        if (body["s:Fault"]) {
          const fault = body["s:Fault"];

          const errorNotificationTitle = "Vending Error";
          const errorMessage =
            fault.faultstring?.match(/<ns0:fault>(.*?)<\/ns0:fault>/)?.[1] ||
            "Unknown error";
          const errorNotificationMessage = `Vending failed for meter ${meterNumber}: ${errorMessage}`;

          try {
            let errorNotification = await NotificationsModel.findOne({
              where: {
                title: errorNotificationTitle,
                message: errorNotificationMessage,
                notificationType: "vending_error",
              },
            });

            if (!errorNotification) {
              errorNotification = await NotificationsModel.create({
                title: errorNotificationTitle,
                message: errorNotificationMessage,
                image: null,
                scheduledAt: null,
                createdAt: new Date(),
                notificationType: "vending_error",
              });
            }

            const existingErrorUserNotification =
              await UserNotifications.findOne({
                where: {
                  userId: userId,
                  notificationId: errorNotification.id,
                },
              });

            if (!existingErrorUserNotification) {
              await UserNotifications.create({
                userId: userId,
                notificationId: errorNotification.id,
                createdAt: new Date(),
                isRead: false,
                notificationType: "vending_error",
              });
            }
          } catch (notificationError) {
            console.error(
              "Error creating vending error notification:",
              notificationError,
            );
          }

          return res.status(400).json({
            status: "FAILED",
            code: "5001",
            errorCode:
              fault.faultstring?.match(
                /<ns0:errorCode>(.*?)<\/ns0:errorCode>/,
              )?.[1] || "Unknown",
            message: errorMessage,
          });
        }

        return res.status(500).json({
          status: "FAILED",
          code: "4006",
          message: "Unexpected response format",
        });
      }
    }
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({
      status: "FAILED",
      code: "5000",
      message: "Internal Server Error " + error,
    });
  }
};

exports.vendPostpaid = async (req, res) => {
  let { mcode, mobileNumber, amount } = req.body;

  if (!mobileNumber || isEmpty(mobileNumber)) {
    return res.status(400).json({
      status: "FAILED",
      message: "Mobilenumber cannot be blank",
    });
  }

  if (!amount || isEmpty(amount)) {
    return res.status(400).json({
      status: "FAILED",
      message: "Amount cannot be blank",
    });
  }

  if (!mcode || isEmpty(mcode)) {
    return res.status(400).json({
      status: "FAILED",
      message: "Mcode cannot be blank",
    });
  }

  if (amount <= 0) {
    return res.status(400).json({
      status: "FAILED",
      code: "4006",
      message: "Invalid amount. Please enter a value greater than $N 0.00",
    });
  }

  try {
    const codes = await MCodeModel.findAll({
      where: {
        expiresAt: { [Op.gt]: new Date() },
      },
    });

    let matchedCode = null;
    for (const code of codes) {
      const isValid = await bcrypt.compare(mcode, code.mcode);
      if (isValid) {
        matchedCode = code;
        break;
      }
    }

    if (!matchedCode) {
      await MCodeModel.destroy({
        where: {
          expiresAt: {
            [Op.lt]: new Date(),
          },
        },
      });

      return res.status(400).json({
        status: "FAILED",
        message: "Invalid or expired code.",
      });
    }

    const secondApiCall = await fetch(
      `${process.env.MARIS_EXECUTE_MERCHANT_PAYMENT}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: process.env.MARIS_EXECUTE_MERCHANT_PAYMENT_TOKEN,
        },
        body: JSON.stringify({
          amount,
          channelMask: "2002",
          currency: "NAD",
          mcode,
          mobileNumber,
          reason: "Payment to merchant account for services rendered",
          receiverMobileNumber: "264818133436",
          receiverServiceMask: "MERCHANT_PAY_RECEIPT",
          senderServiceMask: "MERCHANT_PAY_SEND",
          transactionSubType: "MERCHANT_PAYMENT",
          userName: "TC",
          merchantId: "202269730",
          requestType: "PULL",
        }),
      },
    );

    const contentType = secondApiCall.headers.get("content-type");
    let secondApiResponse;
    if (contentType && contentType.includes("application/json")) {
      secondApiResponse = await secondApiCall.json();
    } else if (contentType && contentType.includes("text/html")) {
      const html = await secondApiCall.text();
      console.error("Received HTML response from secondApiCall:", html);

      const user = await usersModel.findOne({
        where: { cellphoneNumber: mobileNumber },
      });

      if (user) {
        const errorNotificationTitle = "Payment Error";
        const errorNotificationMessage = `Payment of NAD ${amount} failed due to an unexpected response from payment provider.`;

        try {
          let errorNotification = await NotificationsModel.findOne({
            where: {
              title: errorNotificationTitle,
              message: errorNotificationMessage,
              notificationType: "postpaid_error",
            },
          });

          if (!errorNotification) {
            errorNotification = await NotificationsModel.create({
              title: errorNotificationTitle,
              message: errorNotificationMessage,
              image: null,
              scheduledAt: null,
              createdAt: new Date(),
              notificationType: "postpaid_error",
            });
          }

          const existingErrorUserNotification = await UserNotifications.findOne(
            {
              where: {
                userId: user.id,
                notificationId: errorNotification.id,
              },
            },
          );

          if (!existingErrorUserNotification) {
            await UserNotifications.create({
              userId: user.id,
              notificationId: errorNotification.id,
              createdAt: new Date(),
              isRead: false,
              notificationType: "postpaid_error",
            });
          }
        } catch (notificationError) {
          console.error(
            "Error creating postpaid error notification:",
            notificationError,
          );
        }
      }

      return res.status(400).json({
        status: "FAILED",
        code: "4002",
        message: "Unexpected HTML response from payment provider.",
        html: html,
      });
    } else {
      const user = await usersModel.findOne({
        where: { cellphoneNumber: mobileNumber },
      });

      if (user) {
        const errorNotificationTitle = "Payment Error";
        const errorNotificationMessage = `Payment of NAD ${amount} failed due to an unexpected response format from payment provider.`;

        try {
          let errorNotification = await NotificationsModel.findOne({
            where: {
              title: errorNotificationTitle,
              message: errorNotificationMessage,
              notificationType: "postpaid_error",
            },
          });

          if (!errorNotification) {
            errorNotification = await NotificationsModel.create({
              title: errorNotificationTitle,
              message: errorNotificationMessage,
              image: null,
              scheduledAt: null,
              createdAt: new Date(),
              notificationType: "postpaid_error",
            });
          }

          const existingErrorUserNotification = await UserNotifications.findOne(
            {
              where: {
                userId: user.id,
                notificationId: errorNotification.id,
              },
            },
          );

          if (!existingErrorUserNotification) {
            await UserNotifications.create({
              userId: user.id,
              notificationId: errorNotification.id,
              createdAt: new Date(),
              isRead: false,
              notificationType: "postpaid_error",
            });
          }
        } catch (notificationError) {
          console.error(
            "Error creating postpaid error notification:",
            notificationError,
          );
        }
      }

      return res.status(400).json({
        status: "FAILED",
        code: "4002",
        message: "Unexpected response format from payment provider.",
      });
    }

    if (secondApiResponse.response.code !== "0000") {
      const user = await usersModel.findOne({
        where: { cellphoneNumber: mobileNumber },
      });

      if (user) {
        const failedNotificationTitle = "Payment Failed";
        const failedNotificationMessage = `Your payment of NAD ${amount} was unsuccessful. Please try again or contact support.`;

        try {
          let failedNotification = await NotificationsModel.findOne({
            where: {
              title: failedNotificationTitle,
              message: failedNotificationMessage,
              notificationType: "postpaid_failed",
            },
          });

          if (!failedNotification) {
            failedNotification = await NotificationsModel.create({
              title: failedNotificationTitle,
              message: failedNotificationMessage,
              image: null,
              scheduledAt: null,
              createdAt: new Date(),
              notificationType: "postpaid_failed",
            });
          }

          const existingFailedUserNotification =
            await UserNotifications.findOne({
              where: {
                userId: user.id,
                notificationId: failedNotification.id,
              },
            });

          if (!existingFailedUserNotification) {
            await UserNotifications.create({
              userId: user.id,
              notificationId: failedNotification.id,
              createdAt: new Date(),
              isRead: false,
              notificationType: "postpaid_failed",
            });
          }
        } catch (notificationError) {
          console.error(
            "Error creating postpaid failed notification:",
            notificationError,
          );
        }
      }

      return res.status(404).json({
        status: "FAILED",
        message: secondApiResponse.response,
      });
    }

    if (secondApiResponse.response.code === "0000") {
      const user = await usersModel.findOne({
        where: { cellphoneNumber: mobileNumber },
      });

      if (user) {
        const notificationTitle = "Payment Successful";
        const notificationMessage = `Your payment of NAD ${amount} was successful.`;

        let notification = await NotificationsModel.findOne({
          where: {
            title: notificationTitle,
            message: notificationMessage,
            notificationType: "postpaid_payment",
          },
        });

        if (!notification) {
          notification = await NotificationsModel.create({
            title: notificationTitle,
            message: notificationMessage,
            image: null,
            scheduledAt: null,
            createdAt: new Date(),
            notificationType: "postpaid_payment",
          });
        }

        const existingUserNotification = await UserNotifications.findOne({
          where: {
            userId: user.id,
            notificationId: notification.id,
          },
        });

        if (!existingUserNotification) {
          await UserNotifications.create({
            userId: user.id,
            notificationId: notification.id,
            createdAt: new Date(),
            isRead: false,
            notificationType: "postpaid_payment",
          });
        }

        const fcmTokensWithUsers = await FcmTokensModel.findAll({
          where: { userId: user.id },
          attributes: ["fcmToken"],
        });

        const fcmTokens = fcmTokensWithUsers.map(
          (tokenRecord) => tokenRecord.fcmToken,
        );

        if (fcmTokens.length > 0) {
          const message = {
            notification: {
              title: notificationTitle,
              body: notificationMessage,
            },
            data: {
              navigationId: "PaymentsHistory",
              notificationId: notification.id,
            },
            tokens: fcmTokens,
          };
          try {
            await admin.messaging().sendEachForMulticast(message);
            console.log(
              `✅ Push notifications sent successfully to ${fcmTokens.length} devices.`,
            );
          } catch (error) {
            console.error("❌ Error sending notification:", error);
          }
        }

        return res.status(200).json({
          status: "SUCCESS",
          message: "Payment successful",
          data: secondApiResponse.response,
          notificationId: notification.id,
        });
      } else {
        console.warn(
          `Payment successful but user not found for mobile number: ${mobileNumber}`,
        );
        return res.status(200).json({
          status: "SUCCESS",
          message: "Payment successful",
          data: secondApiResponse.response,
          warning: "User notification not sent - user not found",
        });
      }
    }
  } catch (error) {
    console.error("Error:", error);

    try {
      const user = await usersModel.findOne({
        where: { cellphoneNumber: mobileNumber },
      });

      if (user) {
        const serverErrorTitle = "Payment Error";
        const serverErrorMessage = `Payment of NAD ${amount} encountered a server error. Please try again or contact support.`;

        let serverErrorNotification = await NotificationsModel.findOne({
          where: {
            title: serverErrorTitle,
            message: serverErrorMessage,
            notificationType: "postpaid_server_error",
          },
        });

        if (!serverErrorNotification) {
          serverErrorNotification = await NotificationsModel.create({
            title: serverErrorTitle,
            message: serverErrorMessage,
            image: null,
            scheduledAt: null,
            createdAt: new Date(),
            notificationType: "postpaid_server_error",
          });
        }

        const existingServerErrorUserNotification =
          await UserNotifications.findOne({
            where: {
              userId: user.id,
              notificationId: serverErrorNotification.id,
            },
          });

        if (!existingServerErrorUserNotification) {
          await UserNotifications.create({
            userId: user.id,
            notificationId: serverErrorNotification.id,
            createdAt: new Date(),
            isRead: false,
            notificationType: "postpaid_server_error",
          });
        }
      }
    } catch (notificationError) {
      console.error(
        "Error creating server error notification:",
        notificationError,
      );
    }

    return res.status(500).json({
      status: "FAILED",
      message: "Internal Server Error " + error,
    });
  }
};
function formatToken(token) {
  if (!token) return "";
  return token
    .toString()
    .replace(/(.{4})/g, "$1-")
    .replace(/-$/, "");
}

exports.dpo = async (req, res) => {
  let { meterNumber, mobileNumber, amount } = req.body;
  const userId = req.user.id;
  if (!mobileNumber || isEmpty(mobileNumber)) {
    return res.status(400).json({
      status: "FAILED",
      code: "4003",
      message: "Mobile number cannot be blank",
    });
  }

  if (!amount || isEmpty(amount)) {
    return res.status(400).json({
      status: "FAILED",
      code: "4003",
      message: "Amount cannot be blank",
    });
  }

  if (!meterNumber || isEmpty(meterNumber)) {
    return res.status(400).json({
      status: "FAILED",
      code: "4003",
      message: "Meter number cannot be blank",
    });
  }
  if (!userId || isEmpty(userId)) {
    return res.status(400).json({
      status: "FAILED",
      code: "4003",
      message: "User ID cannot be blank",
    });
  }

  if (amount <= 0) {
    return res.status(400).json({
      status: "FAILED",
      code: "4006",
      message: "Invalid amount. Please enter a value greater than $N 0.00",
    });
  }
  try {
    const now = new Date();
    const dateTime =
      now.getFullYear().toString() +
      (now.getMonth() + 1).toString().padStart(2, "0") +
      now.getDate().toString().padStart(2, "0") +
      now.getHours().toString().padStart(2, "0") +
      now.getMinutes().toString().padStart(2, "0") +
      now.getSeconds().toString().padStart(2, "0");
    const uniqueNumber = now.getTime();

    const xmlRequest = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
    xmlns:tem="http://tempuri.org/"
    xmlns:s3v="http://schemas.datacontract.org/2004/07/S3VendingWS.Messages.ComplextType"
    xmlns:s3v1="http://schemas.datacontract.org/2004/07/S3VendingWS.Messages"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <soapenv:Header/>
  <soapenv:Body>
    <tem:Vend>
      <tem:vendRequest>
        <s3v:PartnerCode>${partnerCode}</s3v:PartnerCode>
        <s3v:SecurityKey>${key}</s3v:SecurityKey>
        <s3v:LocalAuthorityCode>${authCode}</s3v:LocalAuthorityCode>
        <s3v:TerminalIdentifier>${authName}</s3v:TerminalIdentifier>
        <s3v:MessageId>
          <s3v:DateTime>${dateTime}</s3v:DateTime>
          <s3v:UniqueNo>${uniqueNumber}</s3v:UniqueNo>
        </s3v:MessageId>
        <s3v:OperatorName>${partnerName}</s3v:OperatorName>
        <s3v1:VendIdMethod xsi:type="s3v:Meter">
          <s3v:SerialNumber>${meterNumber}</s3v:SerialNumber>
        </s3v1:VendIdMethod>
        <s3v1:Amount>${amount}</s3v1:Amount>
        <s3v1:PayType xsi:type="s3v:Cash" />
      </tem:vendRequest>
    </tem:Vend>
  </soapenv:Body>
</soapenv:Envelope>`;

    const sendRequestWithRetry = async (attempt = 1) => {
      try {
        const response = await fetch(`${syntelBaseURL}`, {
          method: "POST",
          headers: {
            SOAPAction: `${VendUrlHeader}`,
            "Content-Type": "text/xml",
          },
          body: xmlRequest,
        });
        const responseText = await response.text();
        console.log("here is my response response: ", responseText);

        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }

        return responseText;
      } catch (error) {
        if (attempt < 3) {
          console.log(`Retry attempt ${attempt} failed. Retrying...`);
          return await sendRequestWithRetry(attempt + 1);
        }
        console.error(`All retry attempts failed: ${error.message}`);
        const newError = new Error(
          "Your purchase was unsuccessful. To get your money back, please contact our help desk.",
        );
        newError.code = "5001";
        throw newError;
      }
    };

    const responseData = await sendRequestWithRetry();

    const xmlResult = await new Promise((resolve, reject) => {
      xml2js.parseString(
        responseData,
        { explicitArray: false, trim: true },
        (err, result) => {
          if (err)
            reject(new Error(`Failed to parse XML response: ${err.message}`));
          else resolve(result);
        },
      );
    });

    const body = xmlResult?.["s:Envelope"]?.["s:Body"];

    if (!body || Object.keys(body).length === 0) {
      await TransactionModel.create({
        userId,
        amount,
        transactionType: "Purchase",
        status: "FAILED",
      });
      return res.status(500).json({
        status: "FAILED",
        code: "5003",
        message:
          "Your purchase was unsuccessful. To get your money back, please contact our help desk.",
      });
    }

    if (body["s:Fault"]) {
      await TransactionModel.create({
        userId,
        amount,
        transactionType: "Purchase",
        status: "FAILED",
      });
      return res.status(400).json({
        status: "FAILED",
        code: "5001",
        message:
          "Your purchase was unsuccessful. To get your money back, please contact our help desk.",
      });
    }

    if (body["VendResponse"] && body["VendResponse"]["VendResult"]) {
      const vendResult = body["VendResponse"]["VendResult"];
      console.log(vendResult["a:Token"]);

      let tokens = vendResult["a:Token"]?.["b:string"];
      tokens = Array.isArray(tokens) ? tokens : [tokens];

      const user = await usersModel.findOne({
        where: { cellphoneNumber: mobileNumber },
      });

      // Generate reference number with milliseconds for uniqueness
      const now = new Date();
      const referenceNumber = `${meterNumber}-${new Date().toISOString().slice(0, 16).replace("T", "-")}`;

      const newTransaction = await TransactionModel.create({
        userId,
        amount,
        transactionType: "Purchase",
        status: "Completed",
        referenceNumber: referenceNumber,
        serialNo: vendResult["a:MeterDetail"]["b:MeterNumber"],
        vat: vendResult["a:Vat"],
        chargedUnits: vendResult["a:ChargedUnits"],
        receiptNo: vendResult["a:ReceiptNumber"],

        debtPaymentName: vendResult["a:DebtPayment"]?.["b:Name"],
        debtPaymentAmount: vendResult["a:DebtPayment"]?.["b:Amount"],

        meterNumber: vendResult["a:MeterDetail"]?.["b:MeterNumber"],
        supplyGroupCode: vendResult["a:MeterDetail"]?.["b:SupplyGroupCode"],
        keyRevisionNumber: vendResult["a:MeterDetail"]?.["b:KeyRevisionNumber"],
        tariffIndex: vendResult["a:MeterDetail"]?.["b:TariffIndex"],

        utilityName: vendResult["a:UtilityDetail"]?.["b:Name"],
        utilityVarRegistrationNumber:
          vendResult["a:UtilityDetail"]?.["b:VarRegistrationNumber"],
        utilityMessage: vendResult["a:UtilityDetail"]?.["b:Message"],

        customerName: vendResult["a:CustomerDetail"]?.["b:Name"],
        customerAddress: vendResult["a:CustomerDetail"]?.["b:Address"],
        daysSinceLastPurchase:
          vendResult["a:CustomerDetail"]?.["b:DaysSinceLastPurchase"],
        tariffName: vendResult["a:CustomerDetail"]?.["b:Tariff"]["b:Name"],
        tariffCentsPerUnit:
          vendResult["a:CustomerDetail"]?.["b:Tariff"]["b:CentsPerUnit"]?.[
            "c:string"
          ],

        utilityAmountExclVat: vendResult["a:UtilityAmountExclVat"],
        freeUnits: vendResult["a:FreeUnits"],
        serviceChargeExclVat: vendResult["a:ServiceChargeExclVat"],
        isReprint: vendResult["a:IsReprint"],

        utilityLevyUnits: vendResult["a:UtilityLevyUnits"],
        utilityLevyDesc: vendResult["a:UtilityLevyDesc"],
        utilityLevy2Units: vendResult["a:UtilityLevy2Units"],
        utilityLevy2Desc: vendResult["a:UtilityLevy2Desc"],
        utilityLevy3Units: vendResult["a:UtilityLevy3Units"],
        utilityLevy3Desc: vendResult["a:UtilityLevy3Desc"],
      });

      if (tokens?.length > 0) {
        const tokenData = tokens.map((tokenValue) => ({
          transactionId: newTransaction.id,
          token: tokenValue,
        }));
        await ElectricityTokensModel.bulkCreate(tokenData);
      }
      if (user) {
        const notificationTitle = "Electricity Purchase Successful";
        const notificationMessage = `You have successfully purchased electricity worth NAD ${amount} for meter ${meterNumber}. Receipt No: ${vendResult["a:ReceiptNumber"]}.`;

        const notification = await NotificationsModel.create({
          title: notificationTitle,
          message: notificationMessage,
          image: null,
          scheduledAt: null,
          createdAt: new Date(),
          notificationType: "vending",
        });
        await UserNotifications.create({
          userId: user.id,
          notificationId: notification.id,
          createdAt: new Date(),
          isRead: false,
          notificationType: "vending",
        });
        const fcmTokensWithUsers = await FcmTokensModel.findAll({
          where: { userId: user.id },
          attributes: ["fcmToken"],
        });

        const fcmTokens = fcmTokensWithUsers.map(
          (tokenRecord) => tokenRecord.fcmToken,
        );

        if (fcmTokens.length > 0) {
          const message = {
            notification: {
              title: notificationTitle,
              body: notificationMessage,
            },
            data: {
              navigationId: "PaymentsHistory",
              notificationId: notification.id,
            },
            tokens: fcmTokens,
          };
          try {
            await admin.messaging().sendEachForMulticast(message);
            console.log(
              `✅ Push notifications sent successfully to ${fcmTokens.length} devices.`,
            );
          } catch (error) {
            console.error("❌ Error sending notification:", error);
          }
        }
      }
      try {
        await callExternalApi(
          "Erongo RED",
          `${mobileNumber}`,
          `Dear ${user ? user.firstName : "Customer"}, your electricity purchase was successful.\n
Amount Purchased: N$${amount}\n
Token: ${tokens.map(formatToken).join(", ")}\n
Units Purchased: ${vendResult["a:ChargedUnits"]}\n
Please enter the token on your meter to activate your units.\n
Thank you for choosing Erongo RED.`,
        );
      } catch (error) {
        console.error("Error sending SMS:", error.message);
      }
      return res.json({
        code: "0000",
        partnerCode: vendResult.PartnerCode._,
        localAuthorityCode: vendResult.LocalAuthorityCode._,
        terminalIdentifier: vendResult.TerminalIdentifier._,
        requestMessageId: {
          dateTime: vendResult.RequestMessageId.DateTime,
          uniqueNo: vendResult.RequestMessageId.UniqueNo,
        },
        operatorName: vendResult.OperatorName._,
        responseDateTime: vendResult["a:ResponseDateTime"],
        debtPayment: {
          name: vendResult["a:DebtPayment"]["b:Name"],
          amount: vendResult["a:DebtPayment"]["b:Amount"],
        },
        meterDetail: {
          meterNumber: vendResult["a:MeterDetail"]["b:MeterNumber"],
          supplyGroupCode: vendResult["a:MeterDetail"]["b:SupplyGroupCode"],
          keyRevisionNumber: vendResult["a:MeterDetail"]["b:KeyRevisionNumber"],
          tariffIndex: vendResult["a:MeterDetail"]["b:TariffIndex"],
        },
        utilityDetail: {
          name: vendResult["a:UtilityDetail"]["b:Name"],
          varRegistrationNumber:
            vendResult["a:UtilityDetail"]["b:VarRegistrationNumber"],
          message: vendResult["a:UtilityDetail"]["b:Message"],
        },
        customerDetail: {
          name: vendResult["a:CustomerDetail"]["b:Name"],
          address: vendResult["a:CustomerDetail"]["b:Address"],
          daysSinceLastPurchase:
            vendResult["a:CustomerDetail"]["b:DaysSinceLastPurchase"],
          tariff: {
            name: vendResult["a:CustomerDetail"]["b:Tariff"]["b:Name"],
            centsPerUnit:
              vendResult["a:CustomerDetail"]["b:Tariff"]["b:CentsPerUnit"][
                "c:string"
              ],
          },
        },
        request: xmlRequest,
        response: responseData,
        utilityAmountExclVat: vendResult["a:UtilityAmountExclVat"],
        vat: vendResult["a:Vat"],
        token: tokens,
        freeUnits: vendResult["a:FreeUnits"],
        receiptNumber: vendResult["a:ReceiptNumber"],
        chargedUnits: vendResult["a:ChargedUnits"],
        serviceChargeExclVat: vendResult["a:ServiceChargeExclVat"],
        isReprint: vendResult["a:IsReprint"],
        utilityLevies: [
          {
            units: vendResult["a:UtilityLevyUnits"],
            desc: vendResult["a:UtilityLevyDesc"],
          },
          {
            units: vendResult["a:UtilityLevy2Units"],
            desc: vendResult["a:UtilityLevy2Desc"],
          },
          {
            units: vendResult["a:UtilityLevy3Units"],
            desc: vendResult["a:UtilityLevy3Desc"],
          },
        ],
      });
    }

    // If we reach here, it means the response was not handled by any of the above conditions
    await TransactionModel.create({
      userId,
      amount,
      transactionType: "Purchase",
      status: "FAILED",
    });
    return res.status(500).json({
      status: "FAILED",
      code: "4006",
      message: "Unexpected response format",
    });
  } catch (error) {
    await TransactionModel.create({
      userId,
      amount,
      transactionType: "Purchase",
      status: "FAILED",
    });
    return res.status(500).json({
      status: "FAILED",
      code: "5000",
      message: "Internal Server Error: " + error.message,
    });
  }
};

exports.lookup = async (req, res) => {
  let { meterNumber } = req.body;

  if (!meterNumber || meterNumber.trim() === "") {
    return res.status(400).json({
      status: "FAILED",
      code: "4003",
      message: "Meter number cannot be blank",
    });
  }

  try {
    const now = new Date();
    const dateTime =
      now.getFullYear().toString() +
      (now.getMonth() + 1).toString().padStart(2, "0") +
      now.getDate().toString().padStart(2, "0") +
      now.getHours().toString().padStart(2, "0") +
      now.getMinutes().toString().padStart(2, "0") +
      now.getSeconds().toString().padStart(2, "0");

    const uniqueNumber = now.getTime();

    const xmlRequest = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
    xmlns:tem="http://tempuri.org/"
    xmlns:s3v="http://schemas.datacontract.org/2004/07/S3VendingWS.Messages.ComplextType"
    xmlns:s3v1="http://schemas.datacontract.org/2004/07/S3VendingWS.Messages">
  <soapenv:Header/>
  <soapenv:Body>
    <tem:VendContext>
      <tem:vendContextRequest>
        <s3v:PartnerCode>${partnerCode}</s3v:PartnerCode>
        <s3v:SecurityKey>${key}</s3v:SecurityKey>
        <s3v:LocalAuthorityCode>${authCode}</s3v:LocalAuthorityCode>
        <s3v:TerminalIdentifier>${authName}</s3v:TerminalIdentifier>
        <s3v:MessageId>
          <s3v:DateTime>${dateTime}</s3v:DateTime>
          <s3v:UniqueNo>${uniqueNumber}</s3v:UniqueNo>
        </s3v:MessageId>
        <s3v:OperatorName>${partnerCode}</s3v:OperatorName>
        <s3v1:VendIdMethod xsi:type="s3v:Meter" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
          <s3v:SerialNumber>${meterNumber}</s3v:SerialNumber>
        </s3v1:VendIdMethod>
      </tem:vendContextRequest>
    </tem:VendContext>
  </soapenv:Body>
</soapenv:Envelope>`;

    const fetchLookup = async () => {
      return await fetch(`${syntelBaseURL}`, {
        method: "POST",
        headers: {
          SOAPAction: `${lookUpUrlHeader}`,
          "Content-Type": "text/xml",
        },
        body: xmlRequest,
      });
    };

    // First attempt
    let response = await fetchLookup();
    let responseData = await response.text();
    let result = await xml2js.parseStringPromise(responseData, {
      explicitArray: false,
      trim: true,
      ignoreAttrs: true,
      tagNameProcessors: [xml2js.processors.stripPrefix],
    });

    let body = result["Envelope"]?.["Body"];

    // If SOAP Fault is returned, handle known cases
    if (body?.["Fault"]) {
      const fault = body["Fault"];
      const detail = fault?.["detail"]?.["FaultResponse"];
      const errorCode = detail?.["ErrorCode"];
      const errorMessage = detail?.["FaultMessage"];

      // Retry if meter not registered (1002)
      if (
        errorCode === "1002" ||
        errorMessage?.includes("Meter Number Not Registered")
      ) {
        console.warn("Meter not registered — retrying lookup once...");
        response = await fetchLookup();
        responseData = await response.text();
        result = await xml2js.parseStringPromise(responseData, {
          explicitArray: false,
          trim: true,
          ignoreAttrs: true,
          tagNameProcessors: [xml2js.processors.stripPrefix],
        });
        body = result["Envelope"]?.["Body"];

        // Check after retry
        if (body?.["Fault"]) {
          const faultRetry = body["Fault"];
          const detailRetry = faultRetry?.["detail"]?.["FaultResponse"];
          const errorCodeRetry = detailRetry?.["ErrorCode"];
          const errorMessageRetry = detailRetry?.["FaultMessage"];

          if (
            errorCodeRetry === "1002" ||
            errorMessageRetry?.includes("Meter Number Not Registered")
          ) {
            return res.status(404).json({
              status: "FAILED",
              code: "1002",
              message:
                "The provided meter number is not registered. Please verify and try again.",
            });
          }
        }
      }

      // Other SOAP errors
      return res.status(503).json({
        status: "FAILED",
        code: "5030",
        message:
          "Service is currently unavailable. Please try again later or contact system support.",
      });
    }

    // Parse valid response
    const vendContext = body?.["VendContextResponse"]?.["VendContextResult"];
    if (vendContext) {
      const meterDetails = vendContext["MeterDetail"];
      const customerDetails = vendContext["CustomerDetail"];

      return res.status(200).json({
        status: "SUCCESS",
        code: "0000",
        message: "Meter number found",
        data: {
          meterNumber: meterDetails?.["MeterNumber"],
          supplyGroup: meterDetails?.["SupplyGroupCode"],
          krn: meterDetails?.["KeyRevisionNumber"],
          tariffIndex: meterDetails?.["TariffIndex"],
          customerName: customerDetails?.["Name"],
          customerAddress: customerDetails?.["Address"],
          maxVendAmt: vendContext["MaxVendAmount"],
          minVendAmt: vendContext["MinVendAmount"],
        },
      });
    }

    // Unexpected format
    return res.status(503).json({
      status: "FAILED",
      code: "5030",
      message:
        "Service is currently unavailable. Please try again later or contact system support.",
    });
  } catch (error) {
    console.error("Error retrieving meter lookup:", error.message);
    return res.status(503).json({
      status: "FAILED",
      code: "5030",
      message:
        "Service is currently unavailable. Please try again later or contact system support.",
    });
  }
};
