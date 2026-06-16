const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/UserModel");
const CapitalizeFirstLetter = require("../../common/services/capitalization");
const generateRandomString = require("../../common/services/generateRandomString");
const numberValidator = require("../../common/services/numberValidator");
const { transporter } = require("../../common/services/transporter");
const {
  isEmpty,
  isValidCellphoneNumber,
  isValidPortalEmail,
} = require("../../common/services/utils");
const OtpModel = require("../../common/models/otpModel");
const crypto = require("crypto");
const PortalLoginAttemptsModel = require("../models/portalLoginAttemptsModel");
const RefreshTokenModel = require("../../common/models/refreshTokenModel");
const { Op, Sequelize } = require("sequelize");
const ElectricianModel = require("../../electrician/models/ElectricianModel");
const usersModel = require("../../common/models/usersModel");

require("dotenv").config();

exports.userRegistration = async (req, res) => {
  let {
    cellphoneNumber,
    department,
    email,
    firstName,
    lastName,
    position,
    role,
  } = req.body;

  if (!cellphoneNumber || isEmpty(cellphoneNumber)) {
    return res.status(400).json({
      status: "FAILED",
      message: "Cellphone number cannot be blank",
    });
  }

  if (!isValidCellphoneNumber(cellphoneNumber)) {
    return res.status(400).json({
      status: "FAILED",
      message:
        "Invalid cellphone number. Cellphone number must start with 264, and be 12 digits long",
    });
  }

  if (!department || isEmpty(department)) {
    return res.status(400).json({
      status: "FAILED",
      message: "Department cannot be blank",
    });
  }

  if (!email || isEmpty(email)) {
    return res.status(400).json({
      status: "FAILED",
      message: "Email cannot be blank",
    });
  }

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

  if (!position) {
    return res.status(400).json({
      status: "FAILED",
      message: "Position cannot be blank",
    });
  }

  if (!role) {
    return res.status(400).json({
      status: "FAILED",
      message: "Role cannot be blank",
    });
  }

  const password = generateRandomString();
  department = CapitalizeFirstLetter(department);
  firstName = CapitalizeFirstLetter(firstName);
  lastName = CapitalizeFirstLetter(lastName);
  position = CapitalizeFirstLetter(position);

  try {
    const existingUser = await User.findOne({ where: { email } });

    if (existingUser) {
      return res.status(400).json({
        status: "FAILED",
        message: "User already exists",
      });
    }
    const portalElectrian = await usersModel.findOne({
      where: { email, userType: "Electrician" },
    });
    if (portalElectrian) {
      return res.status(400).json({
        status: "FAILED",
        message: "User already an electrician",
      });
    }

    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);

    await User.create({
      cellphoneNumber,
      department,
      email,
      firstName,
      lastName,
      password: hashedPassword,
      position,
      role,
      userType: "PortalUser",
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Welcome to ErongoRed Admin Portal - Your Account Credentials",
      html: `
                      <div style="font-family: Arial, sans-serif; max-width: 600px;">
                          <h2 style="color: #e74c3c;">Welcome to ErongoRed Admin Portal!</h2>
                          
                          <p>Dear ${firstName},</p>
                          
                          <p>Your account has been successfully created.</p>
                          <div style="text-align: center; margin: 30px 0;">
                <a href="https://portal.erongored.com.na" style="background-color: #e74c3c; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">Log In to Portal</a>
            </div>
                          
                          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
                              <p style="margin: 0;"><strong>Your password:</strong> <span style="color: #e74c3c; font-family: monospace;">${password}</span></p>
                          </div>
                          
                          <p><strong>Important Security Notes:</strong></p>
                          <ul>
                              <li>Please change this password upon your first login</li>
                              <li>Never share your password with anyone</li>
                              <li>ErongoRed staff will never ask for your password</li>
                          </ul>
                          
                          <p>If you didn't request this account, please contact our support team immediately.</p>
                          
                          <p style="margin-top: 30px;">Best regards,<br>The ErongoRed Team</p>
                          
                          <div style="border-top: 1px solid #ddd; margin-top: 20px; padding-top: 20px; font-size: 12px; color: #666;">
                              <p>This is an automated message, please do not reply to this email.</p>
                          </div>
                      </div>
                  `,
    };

    transporter.sendMail(mailOptions, async (error, info) => {
      if (error) {
        console.error("Email error:", error);
        await User.destroy({ where: { email } });
        return res.status(500).json({
          status: "FAILED",
          message: "Internal server error: " + error.message,
        });
      }
      res.status(201).json({
        status: "SUCCESS",
        message: "User registered successfully",
      });
    });
  } catch (err) {
    console.error("Error during signup: ", error);
    res.status(500).json({
      status: "FAILED",
      message: "Internal server error" + error.message,
    });
  }
};

exports.login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || isEmpty(email)) {
    return res.status(400).json({
      status: "FAILED",
      message: "Email cannot be blank",
    });
  }

  if (!isValidPortalEmail(email)) {
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
    const user = await User.findOne({ where: { email } });

    if (!user) {
      console.log(`[PORTAL LOGIN ATTEMPT] User not found for email: ${email}`);
      return res.status(404).json({
        status: "FAILED",
        message: "Invalid email or password",
      });
    }

    let loginAttempt = await PortalLoginAttemptsModel.findOne({
      where: { userId: user.id },
    });

    if (!loginAttempt) {
      loginAttempt = await PortalLoginAttemptsModel.create({
        userId: user.id,
        attempts: 0,
      });
      console.log(
        `[PORTAL LOGIN ATTEMPT CREATED] For userId: ${user.id}, attempts: ${loginAttempt.attempts}`
      );
    } else {
      console.log(
        `[PORTAL LOGIN ATTEMPT FOUND] For userId: ${user.id}, attempts: ${loginAttempt.attempts}, lastAttempt: ${loginAttempt.lastAttempt}`
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
          `[PORTAL LOCKOUT] User ${user.email} is locked. Attempts: ${loginAttempt.attempts}. Needs to wait ${waitTime} more min(s). Current lockout duration: ${currentLockoutDuration} min.`
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
        `[PORTAL LOGIN FAIL] User: ${user.email}, Attempts updated to: ${failedAttemptsCount}`
      );

      let message = "Invalid email or password";

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
      `[PORTAL LOGIN SUCCESS] User: ${user.email}. Current attempts before reset: ${loginAttempt.attempts}`
    );

    if (loginAttempt.attempts > 0 || loginAttempt.lastAttempt !== null) {
      const [numberOfAffectedRows] = await PortalLoginAttemptsModel.update(
        { attempts: 0, lastAttempt: null },
        { where: { userId: user.id } }
      );

      if (numberOfAffectedRows > 0) {
        console.log(
          `[PORTAL LOGIN SUCCESS] Login attempts reset successfully for userId: ${user.id}. Rows affected: ${numberOfAffectedRows}`
        );
      } else {
        console.warn(
          `[PORTAL LOGIN SUCCESS] FAILED TO RESET login attempts for userId: ${user.id}. No rows were updated. This is unexpected. Current attempts: ${loginAttempt.attempts}`
        );
      }
    } else {
      console.log(
        `[PORTAL LOGIN SUCCESS] No reset needed for userId: ${user.id} as attempts were already 0 and lastAttempt was null.`
      );
    }

    const updatedLoginAttempt = await PortalLoginAttemptsModel.findOne({
      where: { userId: user.id },
    });
    if (updatedLoginAttempt) {
      console.log(
        `[PORTAL LOGIN SUCCESS] LoginAttempt state AFTER successful login for userId: ${user.id}, attempts: ${updatedLoginAttempt.attempts}, lastAttempt: ${updatedLoginAttempt.lastAttempt}`
      );
      loginAttempt = updatedLoginAttempt;
    } else {
      console.warn(
        `[PORTAL LOGIN SUCCESS] LoginAttempt record NOT FOUND for userId: ${user.id} after successful login. Creating one.`
      );
      loginAttempt = await PortalLoginAttemptsModel.create({
        userId: user.id,
        attempts: 0,
      });
    }

    const accessToken = jwt.sign(
      {
        id: user.id,
        userType: user.userType,
        role: user.role,
        type: "access",
      },
      process.env.JWT_SECRET,
      { expiresIn: "10m" }
    );

    const refreshToken = jwt.sign(
      {
        id: user.id,
        userType: user.userType,
        role: user.role,
        type: "refresh",
      },
      process.env.JWT_SECRET,
      { expiresIn: "30m" }
    );
    await RefreshTokenModel.destroy({
  where: {
    expiresAt: {
      [Sequelize.Op.lt]: new Date()
    }
  }
});
    await RefreshTokenModel.create({
      userId: user.id,
      token: refreshToken,
       expiresAt: new Date(Date.now() + 30 * 60 * 1000),
    });

    res.status(200).json({
      status: "SUCCESS",
      message: "Login successful",
      accessToken,
      refreshToken,
      expiresIn: 120 + "seconds",
      user: {
        id: user.id,
        email: user.email,
        userType: user.userType,
        role: user.role
      },
    });
  } catch (error) {
    console.error("[PORTAL LOGIN ERROR] An unexpected error occurred:", error);
    res.status(500).json({
      status: "FAILED",
      message: "Internal server error. Please try again later.",
    });
  }
};

exports.refreshToken = async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({
      status: "FAILED",
      message: "Refresh token is required",
    });
  }

  try {
    const decoded = jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET
    );

    if (decoded.type !== "refresh") {
      return res.status(401).json({
        status: "FAILED",
        message: "Invalid token type",
      });
    }

    const storedToken = await RefreshTokenModel.findOne({
      where: {
        userId: decoded.id,
        token: refreshToken,
        expiresAt: {
          [Op.gt]: new Date(),
        },
      },
    });

    if (!storedToken) {
      return res.status(401).json({
        status: "FAILED",
        message: "Invalid or expired refresh token",
      });
    }

    const user = await User.findByPk(decoded.id);
    if (!user) {
      return res.status(404).json({
        status: "FAILED",
        message: "User not found",
      });
    }

    const newAccessToken = jwt.sign(
      {
        id: user.id,
        userType: user.userType,
        role: user.role,
        type: "access",
      },
      process.env.JWT_SECRET,
      { expiresIn: "15m" }
    );

    const newRefreshToken = jwt.sign(
      {
        id: user.id,
        userType: user.userType,
        role: user.role,
        type: "refresh",
      },
      process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    await RefreshTokenModel.update(
      {
        token: newRefreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
      { where: { token: refreshToken } }
    );

    console.log(
      `[TOKEN REFRESH SUCCESS] User: ${user.email}, New access and refresh tokens generated`
    );

    res.status(200).json({
      status: "SUCCESS",
      message: "Token refreshed successfully",
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      expiresIn: 900,
      user: {
        id: user.id,
        email: user.email,
        userType: user.userType,
      },
    });
  } catch (error) {
    console.error("[TOKEN REFRESH ERROR]:", error);

    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        status: "FAILED",
        message: "Invalid refresh token",
      });
    }

    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        status: "FAILED",
        message: "Refresh token has expired",
      });
    }

    res.status(500).json({
      status: "FAILED",
      message: "Internal server error",
    });
  }
};

exports.logout = async (req, res) => {
  const { refreshToken } = req.body;
  const userId = req.user?.id;

  try {
    if (refreshToken) {
      await RefreshTokenModel.destroy({
        where: {
          userId: userId || { [Op.ne]: null },
          token: refreshToken,
        },
      });
    } else if (userId) {
      await RefreshTokenModel.destroy({
        where: { userId },
      });
    }

    console.log(`[LOGOUT SUCCESS] Refresh tokens revoked for user: ${userId}`);

    res.status(200).json({
      status: "SUCCESS",
      message: "Logged out successfully",
    });
  } catch (error) {
    console.error("[LOGOUT ERROR]:", error);
    res.status(500).json({
      status: "FAILED",
      message: "Internal server error",
    });
  }
};

exports.forgotPassword = async (req, res) => {
  const { email, newPassword, confirmPassword } = req.body;

  if (!email || isEmpty(email)) {
    return res.status(400).json({
      status: "FAILED",
      message: "Email cannot be blank",
    });
  }

  if (!newPassword || isEmpty(newPassword)) {
    return res.status(400).json({
      status: "FAILED",
      message: "New password cannot be blank",
    });
  }

  if (!confirmPassword || isEmpty(confirmPassword)) {
    return res.status(400).json({
      status: "FAILED",
      message: "Confirm password cannot be blank",
    });
  }

  if (confirmPassword !== newPassword) {
    return res.status(400).json({
      status: "FAILED",
      message: "Passwords do not match",
    });
  }

  try {
    const user = await User.findOne({
      where: { email },
    });

    if (!user) {
      return res.status(404).json({
        status: "FAILED",
        message: "User not found",
      });
    }

    const isPasswordCurrent = await bcrypt.compare(newPassword, user.password);
    if (isPasswordCurrent) {
      return res.status(400).json({
        status: "FAILED",
        message:
          "New password cannot be the same as current password. Please enter a different password.",
      });
    }

    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await user.update({ password: hashedPassword }, { where: { email } });

    res.status(200).json({
      status: "SUCCESS",
      message: "Password reset successfully",
    });
  } catch (error) {
    console.error("Error", error);
    return res.status(500).json({
      status: "FAILED",
      message: "Internal server error" + error.message,
    });
  }
};

exports.otpGeneration = async (req, res) => {
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

    const user = await User.findOne({ where: { email: identifier } });

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
exports.getLoan = async (req, res) => {
  try {
    const { meter_number } = req.query;

    if (!meter_number) {
      return res.status(400).json({ message: 'Meter number is required' });
    }

    const apiUrl = `http://127.0.0.1:3000/calculate_loan?meter_number=${meter_number}`;

    const response = await fetch(apiUrl);

    const data = await response.json(); // only once

    if (!response.ok) {
      return res.status(response.status).json({ 
        message: 'Failed to fetch loan data', 
        details: data 
      });
    }

    return res.json(data);

  } catch (error) {
    console.error('Error fetching loan data:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};
