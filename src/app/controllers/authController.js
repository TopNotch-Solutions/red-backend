const userModel = require("../../common/models/usersModel");
const OtpModel = require("../../common/models/otpModel");
const crypto = require("crypto");
const bcrypt = require("bcrypt");
const bcryptjs = require("bcryptjs");
const jwt = require("jsonwebtoken");
const numberValidator = require("../../common/services/numberValidator");
const { transporter } = require("../../common/services/transporter");
const usersModel = require("../../common/models/usersModel");
const { isEmpty } = require("../../common/services/isEmpty");
const {
  isValidPassword,
  isValidPin,
  isValidEmail,
} = require("../../common/services/utils");
const LoginAttemptsModel = require("../../common/models/loginAttemptsModel");
const FcmTokensModel = require("../../common/models/fcmTokensModel");
const AnonymousTokensModel = require("../../common/models/AnonymousTokensModel");
const UserAccountsModel = require("../models/userAccountsModel");
const MeterNumbersModel = require("../../common/models/meterNumbersModel");
const { isValidCellphoneNumber } = require("../../common/services/utils");
const callExternalApi = require("../../common/services/connectSMS");
const AnonymousUsersModel = require("../../common/models/anonymousUsers");
require("dotenv").config();

exports.signUp = async (req, res) => {
  const {
    firstName,
    lastName,
    cellphoneNumber,
    email,
    password,
    meterNumbers,
    customerType,
    address,
    town,
    suburb,
    meterType,
    accountNumbers,
    primaryMeterNumber,
    primaryAccountNumber,
  } = req.body;
  const profileImage = req.file ? req.file.path : null;
  const userType = "AppUser";

  if (!firstName || isEmpty(firstName)) {
    return res.status(400).json({
      status: "FAILED",
      message: "First name cannot be blank",
    });
  }

  if (!lastName || isEmpty(lastName)) {
    return res.status(400).json({
      status: "FAILED",
      message: "Last name cannot be blank",
    });
  }

  if (!cellphoneNumber || isEmpty(cellphoneNumber)) {
    return res.status(400).json({
      status: "FAILED",
      message: "Cellphone number cannot be blank",
    });
  }

  if (!email || isEmpty(email)) {
    return res.status(400).json({
      status: "FAILED",
      message: "Email cannot be blank",
    });
  }
  if (email.toLowerCase().endsWith("@erongored.com.na")) {
  return res.status(400).json({
    status: "FAILED",
   message: "Sorry, emails ending with @erongored.com.na are reserved. Please use a different email."
  });
}

  if (!isValidEmail(email)) {
    return res.status(400).json({
      status: "FAILED",
      message: "Invalid email",
    });
  }

  if (!password || isEmpty(password)) {
    return res.status(400).json({
      status: "FAILED",
      message: "Password cannot be blank",
    });
  }

  if (!isValidPassword(password)) {
    return res.status(400).json({
      status: "FAILED",
      message:
        "Password must be at least 8 characters long, contain at least one uppercase letter, one lower case letter, and one number",
    });
  }

  if (!address || isEmpty(address)) {
    return res.status(400).json({
      status: "FAILED",
      message: "Address cannot be blank",
    });
  }

  if (!town || isEmpty(town)) {
    return res.status(400).json({
      status: "FAILED",
      message: "Town cannot be blank",
    });
  }

  if (!customerType || isEmpty(customerType)) {
    return res.status(400).json({
      status: "FAILED",
      message: "Customer type cannot be blank",
    });
  }

  if (!isValidCellphoneNumber(cellphoneNumber)) {
    return res.status(400).json({
      status: "FAILED",
      message:
        "Invalid cellphone number. Cellphone number must start with 264, and be 12 digits long",
    });
  }

  if (accountNumbers) {
    if (!Array.isArray(accountNumbers)) {
      return res.status(400).json({
        status: "FAILED",
        message: "At least one account number is required",
      });
    }
  }

  if (meterNumbers && !Array.isArray(meterNumbers)) {
    return res.status(400).json({
      status: "FAILED",
      message: "Meter numbers must be an array",
    });
  }

  try {
    const exisitingUser = await userModel.findOne({ where: { email } });

    if (exisitingUser) {
      return res.status(400).json({
        status: "FAILED",
        message: "User already exists",
      });
    }

    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = await userModel.create({
      firstName,
      lastName,
      customerType,
      cellphoneNumber,
      address,
      profileImage,
      password: hashedPassword,
      email,
      userType,
      town,
      suburb_name: suburb || null,
      meterType,
      primaryMeterNumber,
      primaryAccountNumber,
    });

    const accountRecords = Array.isArray(accountNumbers)
      ? accountNumbers.filter(Boolean).map((accountNumber) => ({
          userId: newUser.id,
          accountNumber: accountNumber.trim(),
        }))
      : [];

    if (accountRecords.length > 0) {
      await UserAccountsModel.bulkCreate(accountRecords);
    }

    if (Array.isArray(meterNumbers) && meterNumbers.length > 0) {
      const meterRecords = meterNumbers.filter(Boolean).map((meterNumber) => ({
        userId: newUser.id,
        meterNumber: meterNumber.trim(),
      }));

      if (meterRecords.length > 0) {
        await MeterNumbersModel.bulkCreate(meterRecords);
      }
    }

    res.status(201).json({
      status: "SUCCESS",
      message: "User registered successfully",
    });
  } catch (error) {
    console.error("Error during signup:", error);
    res.status(500).json({
      status: "FAILED",
      message: "Internal server error" + error.message,
    });
  }
};

exports.login = async (req, res) => {
  const { email, password, fcmToken } = req.body;

  // --- Input Validation ---
  if (!email || isEmpty(email)) {
    return res.status(400).json({
      status: "FAILED",
      message: "Email cannot be blank",
    });
  }

  if (!isValidEmail(email)) {
    return res.status(400).json({
      status: "FAILED",
      message: "Invalid email",
    });
  }

  if (!password || isEmpty(password)) {
    return res.status(400).json({
      status: "FAILED",
      message: "Password cannot be blank",
    });
  }

  try {
    // --- The corrected query ---
    // We'll explicitly select all columns to prevent the "Unknown column 'true'" error
    const user = await usersModel.findOne({
      where: { email, status: "active" },
    });

    if (!user) {
      return res.status(404).json({
        status: "FAILED",
        message:
          "Invalid credentials. Please check username or password and try again.",
      });
    }

    if (user.status === "deleted") {
      return res.status(404).json({
        status: "FAILED",
        message:
          "This account has been deactivated. If you believe this is an error, please contact support.",
      });
    }
    let loginAttempt = await LoginAttemptsModel.findOne({
      where: { userId: user.id },
    });

    if (!loginAttempt) {
      loginAttempt = await LoginAttemptsModel.create({
        userId: user.id,
        attempts: 0,
      });
      console.log(
        `[LOGIN ATTEMPT CREATED] For userId: ${user.id}, attempts: ${loginAttempt.attempts}`
      );
    } else {
      console.log(
        `[LOGIN ATTEMPT FOUND] For userId: ${user.id}, attempts: ${loginAttempt.attempts}, lastAttempt: ${loginAttempt.lastAttempt}`
      );
    }

    const lockoutDurations = [5, 10, 15, 30];

    if (loginAttempt.attempts >= 3 && loginAttempt.lastAttempt) {
      const now = new Date();
      const lastAttemptTime = new Date(loginAttempt.lastAttempt);
      const diffMinutes =
        (now.getTime() - lastAttemptTime.getTime()) / (1000 * 60);

      const lockoutOccurrence = Math.floor((loginAttempt.attempts - 1) / 3);
      const currentLockoutDuration =
        lockoutDurations[
          Math.min(lockoutOccurrence, lockoutDurations.length - 1)
        ];

      if (diffMinutes < currentLockoutDuration) {
        const waitTime = Math.ceil(currentLockoutDuration - diffMinutes);
        console.log(
          `[LOCKOUT] User ${user.email} is locked. Attempts: ${loginAttempt.attempts}. Needs to wait ${waitTime} more min(s). Current lockout duration: ${currentLockoutDuration} min.`
        );
        return res.status(403).json({
          status: "FAILED",
          message: `Too many failed attempts. Try again in ${waitTime} minute(s).`,
        });
      }
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      const failedAttemptsCount = loginAttempt.attempts + 1;

      await loginAttempt.update({
        attempts: failedAttemptsCount,
        lastAttempt: new Date(),
      });

      console.log(
        `[LOGIN FAIL] User: ${user.email}, Attempts updated to: ${failedAttemptsCount}`
      );

      let message =
        "Invalid credentials. Please check username or password and try again.";

      if (failedAttemptsCount >= 3 && failedAttemptsCount % 3 === 0) {
        const lockoutOccurrence = Math.floor((failedAttemptsCount - 1) / 3);
        const nextLockoutDuration =
          lockoutDurations[
            Math.min(lockoutOccurrence, lockoutDurations.length - 1)
          ];
        message = `Invalid email or password. Too many failed attempts. Try again in ${nextLockoutDuration} minute(s).`;
      }

      return res.status(401).json({
        status: "FAILED",
        message: message,
      });
    }

    console.log(
      `[LOGIN SUCCESS] User: ${user.email}. Current attempts before reset: ${loginAttempt.attempts}`
    );

    if (loginAttempt.attempts > 0 || loginAttempt.lastAttempt !== null) {
      const [numberOfAffectedRows] = await LoginAttemptsModel.update(
        { attempts: 0, lastAttempt: null },
        { where: { userId: user.id } }
      );

      if (numberOfAffectedRows > 0) {
        console.log(
          `[LOGIN SUCCESS] Login attempts reset successfully for userId: ${user.id}. Rows affected: ${numberOfAffectedRows}`
        );
      } else {
        console.warn(
          `[LOGIN SUCCESS] FAILED TO RESET login attempts for userId: ${user.id}. No rows were updated. This is unexpected. Current attempts: ${loginAttempt.attempts}`
        );
      }
    } else {
      console.log(
        `[LOGIN SUCCESS] No reset needed for userId: ${user.id} as attempts were already 0 and lastAttempt was null.`
      );
    }

    const updatedLoginAttempt = await LoginAttemptsModel.findOne({
      where: { userId: user.id },
    });
    if (updatedLoginAttempt) {
      console.log(
        `[LOGIN SUCCESS] LoginAttempt state AFTER successful login for userId: ${user.id}, attempts: ${updatedLoginAttempt.attempts}, lastAttempt: ${updatedLoginAttempt.lastAttempt}`
      );
      loginAttempt = updatedLoginAttempt;
    } else {
      console.warn(
        `[LOGIN SUCCESS] LoginAttempt record NOT FOUND for userId: ${user.id} after successful login. Creating one.`
      );
      loginAttempt = await LoginAttemptsModel.create({
        userId: user.id,
        attempts: 0,
      });
    }

    const token = jwt.sign(
      { id: user.id, userType: user.userType },
      process.env.JWT_SECRET
    );

    if (fcmToken && !isEmpty(fcmToken)) {
      const [userFcmToken, created] = await FcmTokensModel.findOrCreate({
        where: { userId: user.id, fcmToken: fcmToken },
        defaults: { userId: user.id, fcmToken: fcmToken },
      });

      if (created) {
        console.log(
          `[FCM TOKEN ADDED/FOUND] for userId: ${user.id}. New token created: ${created}`
        );
        const anonToken = await AnonymousTokensModel.findOne({
          where: { fcmToken },
        });
        if (anonToken) {
          await anonToken.destroy();
          console.log(
            `[ANON TOKEN REMOVED] for FCM: ${fcmToken} after user login.`
          );
        }
      } else {
        console.log(`[FCM TOKEN FOUND] Existing token for userId: ${user.id}.`);
      }
    }

    return res.status(200).json({
      status: "SUCCESS",
      message: "Login successful",
      token,
      user: {
        id: user.id,
        email: user.email,
        userType: user.userType,
      },
    });
  } catch (error) {
    console.error("[LOGIN ERROR] An unexpected error occurred:", error);
    return res.status(500).json({
      status: "FAILED",
      message: "Internal server error. Please try again later.",
    });
  }
};

exports.generateOtp = async (req, res) => {
  const { identifier, number } = req.body;

  if (!identifier || isEmpty(identifier)) {
    return res.status(400).json({
      status: "FAILED",
      messsage: "Identifier cannot be blank (email or phone)",
    });
  }
  if (!number || isEmpty(number)) {
    return res.status(400).json({
      status: "FAILED",
      messsage: "Cellphone number cannot be blank.",
    });
  }

  try {
    const existingOtp = await OtpModel.findOne({ where: { identifier } });

    if (existingOtp) {
      await OtpModel.destroy({ where: { identifier } });
    }

    const otpCode = Math.floor(1000 + Math.random() * 9000).toString();
    const hashedOtp = crypto.createHash("sha256").update(otpCode).digest("hex");

    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await OtpModel.create({
      identifier,
      otp: hashedOtp,
      expiresAt,
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: identifier,
      subject: "Your OTP Code - ErongoRed",
      html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px;">
                    <h2 style="color: #e74c3c;">Your One-Time Password (OTP)</h2>
                    
                    <p>Dear User,</p>
                    
                    <p>You requested a one-time password (OTP) for authentication. Use the OTP below to proceed:</p>
                    
                    <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0; text-align: center;">
                        <p style="margin: 0; font-size: 20px; font-weight: bold; color: #e74c3c; font-family: monospace;">
                            ${otpCode}
                        </p>
                    </div>
        
                    <p><strong>Important Information:</strong></p>
                    <ul>
                        <li>This OTP is valid for <strong>5 minutes</strong> only.</li>
                        <li>Do not share this OTP with anyone.</li>
                        <li>If you did not request this OTP, please ignore this email.</li>
                    </ul>
        
                    <p>If you need assistance, please contact our support team.</p>
                    
                    <p style="margin-top: 30px;">Best regards,<br>The ErongoRed Team</p>
                    
                    <div style="border-top: 1px solid #ddd; margin-top: 20px; padding-top: 20px; font-size: 12px; color: #666;">
                        <p>This is an automated message, please do not reply to this email.</p>
                    </div>
                </div>
            `,
    };

    try {
      const result = await callExternalApi(
        "Erongo RED",
        `+${number}`,
        `Your OTP code is ${otpCode}. It is valid for 5 minutes.`
      );
      console.log("External API call result:", result);
    } catch (err) {
      console.error("Error sending email:", err);
    }
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.log("Error sending email:", error);
        return res.status(500).json({
          status: "FAILED",
          message: "Something went wrong while sending OTP",
        });
      }
      res.status(200).json({
        status: "SUCCESS",
        message: `OTP successfully generated and sent successfully to ${identifier}`,
      });
    });
  } catch (error) {
    console.error("Error generating OTP:", error);
    res.status(500).json({
      status: "FAILED",
      message: "Internal server error" + error.message,
    });
  }
};

exports.validateOtp = async (req, res) => {
  const { identifier, otp } = req.body;

  try {
    if (!identifier || isEmpty(identifier)) {
      return res.status(400).json({
        status: "FAILED",
        message: "Identifier cannot be blank",
      });
    }

    if (!otp || isEmpty(otp)) {
      return res.status(400).json({
        status: "FAILED",
        message: "OTP cannot be blank",
      });
    }

    const otpRecord = await OtpModel.findOne({
      where: { identifier },
    });

    if (!otpRecord) {
      return res.status(400).json({
        status: "FAILED",
        message: "Invalid OTP",
      });
    }

    const hashedOtp = crypto.createHash("sha256").update(otp).digest("hex");

    if (otpRecord.otp !== hashedOtp) {
      return res.status(400).json({
        status: "FAILED",
        message: "Invalid OTP",
      });
    }

    if (new Date() > new Date(otpRecord.expiresAt)) {
      return res.status(400).json({
        status: "FAILED",
        message: "OTP expired",
      });
    }

    await otpRecord.destroy({ where: { identifier } });

    res.status(200).json({
      status: "SUCCESS",
      message: "OTP verified successfully",
    });
  } catch (error) {
    console.error("Error validating otp:", error);
    res.status(500).json({
      status: "FAILED",
      message: "Internal server error" + error.message,
    });
  }
};

exports.resetPasswordOtp = async (req, res) => {
  const { identifier } = req.body;

  try {
    if (!identifier || isEmpty(identifier)) {
      return res.status(400).json({
        status: "FAILED",
        message: "Identifier cannot be blank",
      });
    }

    const existingOtp = await OtpModel.findOne({ where: { identifier } });

    if (existingOtp) {
      await OtpModel.destroy({ where: { identifier } });
    }

    const user = await userModel.findOne({ where: { email: identifier } });

    if (!user) {
      return res.status(404).json({
        status: "FAILED",
        message: "User not found",
      });
    }

    const otpCode = Math.floor(1000 + Math.random() * 9000).toString();
    const hashedOtp = crypto.createHash("sha256").update(otpCode).digest("hex");
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await OtpModel.create({
      identifier,
      otp: hashedOtp,
      expiresAt,
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: identifier,
      subject: "Verification OTP for Your Account",
      html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px;">
                    <h2 style="color: #e74c3c;">Account Verification OTP</h2>
                    
                    <p>Dear User,</p>
                    
                    <p>To complete your account verification, please use the following one-time password (OTP):</p>
                    
                    <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0; text-align: center;">
                        <p style="margin: 0; font-size: 20px; font-weight: bold; color: #e74c3c; font-family: monospace;">
                            ${otpCode}
                        </p>
                    </div>
        
                    <p><strong>Important Information:</strong></p>
                    <ul>
                        <li>This OTP is valid for <strong>5 minutes</strong> only.</li>
                        <li>Do not share this OTP with anyone.</li>
                        <li>If you did not request this OTP, please ignore this email.</li>
                    </ul>
        
                    <p>If you need assistance, please contact our support team.</p>
                    
                    <p style="margin-top: 30px;">Best regards,<br>The ErongoRed Team</p>
                    
                    <div style="border-top: 1px solid #ddd; margin-top: 20px; padding-top: 20px; font-size: 12px; color: #666;">
                        <p>This is an automated message, please do not reply to this email.</p>
                    </div>
                </div>
            `,
    };

    try {
      const user = await usersModel.findOne({ where: { email: identifier } });
      if (user) {
        const result = await callExternalApi(
          "Erongo RED",
          `+${user.cellphoneNumber}`,
          `Your OTP code is ${otpCode}. It is valid for 5 minutes.`
        );
        console.log("External API call result:", result);
      }
    } catch (err) {
      console.error("Error sending email:", err);
    }
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.log("Error sending email:", error);
        return res.status(500).json({
          status: "FAILED",
          message: "Something went wrong",
        });
      }
      res.status(200).json({
        status: "SUCCESS",
        message: `OTP successfully generated and sent to ${identifier}`,
      });
    });
  } catch (error) {
    console.error("Error generating otp:", error);
    res.status(500).json({
      status: "FAILED",
      message: "Internal server error" + error.message,
    });
  }
};

exports.resetPassword = async (req, res) => {
  const { newPassword, identifier } = req.body;

  try {
    if (!newPassword || isEmpty(newPassword)) {
      return res.status(400).json({
        status: "FAILED",
        message: "Password cannot be blank",
      });
    }

    if (!identifier || isEmpty(identifier)) {
      res.status(400).json({
        status: "FAILED",
        message: "Identifier cannot be blank",
      });
    }

    if (!isValidPassword(newPassword)) {
      return res.status(400).json({
        status: "FAILED",
        message:
          "Password must be at least 8 characters long, contain at least one uppercase letter, one lower case letter, and one number",
      });
    }

    const user = await userModel.findOne({ where: { email: identifier } });

    const newPasswordIsSame = await bcrypt.compare(newPassword, user.password);

    if (newPasswordIsSame) {
      return res.status(400).json({
        status: "FAILED",
        message: "New password cannot be the same as the current password",
      });
    }

    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await userModel.update(
      { password: hashedPassword, status: "active" },
      { where: { email: identifier } }
    );

    res.status(200).json({
      status: "SUCCESS",
      message: "Password reset successfully",
    });
  } catch (error) {
    console.error("Error resetting password:", error);
    res.status(500).json({
      status: "FAILED",
      message: "Internal server error" + error.message,
    });
  }
};

exports.createPin = async (req, res) => {
  try {
    const { pin } = req.body;
    const userId = req.user.id;

    const user = await usersModel.findByPk(userId, {
      where: { status: "active" },
    });

    if (!pin || isEmpty(pin)) {
      return res.status(400).json({
        status: "FAILED",
        message: "PIN cannot be blank",
      });
    }

    if (!isValidPin(pin)) {
      return res.status(400).json({
        status: "FAILED",
        message: "Invalid PIN",
      });
    }

    if (!user) {
      return res.status(404).json({
        status: "FAILED",
        message: "User not found",
      });
    }

    const salt = await bcrypt.genSalt(12);
    const hashedPin = await bcrypt.hash(pin, salt);

    await user.update({ pin: hashedPin });

    return res.status(200).json({
      status: "SUCCESS",
      message: "Pin created successfully",
    });
  } catch (error) {
    console.error("Error creating pin:", error.message);
    return res.status(500).json({
      status: "FAILED",
      message: "Internal server error",
    });
  }
};

exports.generateAccessToken = async (req, res) => {
  try {
    const anonymousUser = await AnonymousUsersModel.create();

    const token = jwt.sign(
      { id: anonymousUser.id, role: "public" },
      process.env.JWT_SECRET
    );
    res.status(200).json({
      status: "SUCCESS",
      message: "Access token generated successfully",
      accessToken: token,
    });
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({
      status: "FAILED",
      message: "Error generating access token: " + error.message,
    });
  }
};

exports.checkIfUserExists = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || isEmpty(email)) {
      return res.status(400).json({
        status: "FAILED",
        message: "Email cannot be blank",
      });
    }

    const user = await usersModel.findOne({
      where: { email, status: "active" },
    });

    if (user) {
      return res.status(400).json({
        status: "FAILED",
        message: "User already exists",
      });
    } else {
      return res.status(200).json({
        status: "SUCCESS",
        message: "User does not exist",
      });
    }
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({
      status: "FAILED",
      message: "Internal server error: " + error.message,
    });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || isEmpty(currentPassword)) {
      return res.status(400).json({
        status: "FAILED",
        message: "Current password cannot be blank",
      });
    }
    if (!newPassword || isEmpty(newPassword)) {
      return res.status(400).json({
        status: "FAILED",
        message: "New password cannot be blank",
      });
    }
    if (!isValidPassword(newPassword)) {
      return res.status(400).json({
        status: "FAILED",
        message:
          "New password must be at least 8 characters long, contain at least one uppercase letter, one lower case letter, and one number",
      });
    }
    const user = await usersModel.findByPk(userId);
    if (!user) {
      return res.status(404).json({
        status: "FAILED",
        message: "User not found",
      });
    }
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({
        status: "FAILED",
        message: "Current password is incorrect",
      });
    }

    const newPasswordIsSame = await bcrypt.compare(newPassword, user.password);
    if (newPasswordIsSame) {
      return res.status(400).json({
        status: "FAILED",
        message: "New password cannot be the same as the current password",
      });
    }

    const salt = await bcrypt.genSalt(12);
    const hashedNewPassword = await bcrypt.hash(newPassword, salt);
    await user.update({ password: hashedNewPassword });
    return res.status(200).json({
      status: "SUCCESS",
      message: "Password changed successfully",
    });
  } catch (error) {
    console.error("Error changing password:", error.message);
    return res.status(500).json({
      status: "FAILED",
      message: "Internal server error",
    });
  }
};
