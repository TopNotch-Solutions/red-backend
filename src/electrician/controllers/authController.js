const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const OtpModel = require('../../common/models/otpModel')
const crypto = require('crypto')
const nodemailer = require('nodemailer')
const usersModel = require('../../common/models/usersModel')
const { transporter } = require('../../common/services/transporter')
const { isValidPassword } = require('../../common/services/utils')
require('dotenv').config()

exports.login = async (req, res) => {
    const { email, password } = req.body
    try {
        if (!email) {
            return res.status(400).json({
                status: 'FAILED',
                message: 'Email is required'
            })
        }

        if (!password) {
            return res.status(400).json({
                status: 'FAILED',
                message: 'Password is required'
            })
        }

        const electrician = await usersModel.findOne({ where: { email, userType: 'Electrician' } })

        if (!electrician) {
            return res.status(404).json({
                status: 'FAILED',
                message: 'Electrician not found'
            })
        }

        const isMatch = await bcrypt.compare(password, electrician.password)

        if (!isMatch) {
            return res.status(401).json({
                status: 'FAILED',
                message: 'Invalid credentials'
            })
        }

        const token = jwt.sign({ id: electrician.id }, process.env.JWT_SECRET)

        res.status(200).json({
            status: 'SUCCESS',
            message: 'Login successful',
            token
        })
    } catch (error) {
        return res.status(500).json({
            status: 'FAILED',
            message: 'Internal server error' + error.message
        })
    }
}

exports.resetPasswordOtp = async (req, res) => {
    const { identifier } = req.body

    try {
        if (!identifier) {
            return res.status(400).json({
                status: 'FAILED',
                message: 'Email is required'
            })
        }

        const existingOtp = await OtpModel.findOne({ where: { identifier } })

        if (existingOtp) {
            await OtpModel.destroy({ where: { identifier } })
        }

        const electrician = await usersModel.findOne({ where: { email: identifier, userType: 'Electrician' } })

        if (!electrician) {
            return res.status(404).json({
                status: 'FAILED',
                message: 'Electrician not found'
            })
        }

        const otpCode = Math.floor(1000 + Math.random() * 9000).toString()
        const hashedOtp = crypto.createHash('sha256').update(otpCode).digest('hex')
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000)

        await OtpModel.create({
            identifier,
            otp: hashedOtp,
            expiresAt
        })

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


        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.log('Error sending email:', error)
                return res.status(500).json({
                    status: 'FAILED',
                    message: 'Something went wrong'
                })
            }
            res.status(200).json({
                status: 'SUCCESS',
                message: `OTP successfully generated and sent successfully to ${identifier}`
            })
        })
    } catch (error) {
        console.error('Error generating OTP:', error)
        res.status(500).json({
            status: 'FAILED',
            message: 'Internal server error' + error.message
        })
    }
}

exports.resetPassword = async (req, res) => {
    const { newPassword, identifier } = req.body

    try {
        if (!newPassword) {
            res.status(400).json({
                status: 'FAILED',
                message: 'Password cannot be blank'
            })
        }

        if (!identifier) {
            res.status(400).json({
                status: 'FAILED',
                message: 'Identifier cannot be blank'
            })
        }

        if (!isValidPassword(newPassword)) {
            return res.status(400).json({
                status: 'FAILED',
                message: 'New password must be at least 8 characters long, contain at least one uppercase letter, one lower case letter, and one number'
            })
        }

        const user = await usersModel.findOne({ where: { email: identifier } })

        const newPasswordIsSame = await bcrypt.compare(newPassword, user.password)

        if (newPasswordIsSame) {
            return res.status(400).json({
                status: 'FAILED',
                message: 'New password cannot be the same as the current password'
            })
        }

        const salt = await bcrypt.genSalt(12)
        const hashedPassword = await bcrypt.hash(newPassword, salt)

        await usersModel.update({ password: hashedPassword }, {
            where: {
                email: identifier,
                userType: 'Electrician'
            }
        })

        res.status(200).json({
            status: 'SUCCESS',
            message: 'Password reset successfully'
        })
    } catch (error) {
        console.error('Error resetting password:', error)
        res.status(500).json({
            status: 'FAILED',
            message: 'Internal server error' + error.message
        })
    }
}

exports.validateOtp = async (req, res) => {
    const { identifier, otp } = req.body

    try {
        if (!identifier) {
            return res.status(400).json({
                status: 'FAILED',
                message: 'Identifier is required'
            })
        }

        if (!otp) {
            return res.status(400).json({
                status: 'FAILED',
                message: 'OTP is required'
            })
        }

        const otpRecord = await OtpModel.findOne({
            where: { identifier }
        })

        if (!otpRecord) {
            return res.status(400).json({
                status: 'FAILED',
                message: 'Invalid OTP'
            })
        }

        const hashedOtp = crypto.createHash('sha256').update(otp).digest('hex')

        if (otpRecord.otp !== hashedOtp) {
            return res.status(400).json({
                status: 'FAILED',
                message: 'Invalid OTP'
            })
        }

        if (new Date() > new Date(otpRecord.expiresAt)) {
            return req.status(400).json({
                status: 'FAILED',
                message: 'OTP expired'
            })
        }

        await otpRecord.destroy({ where: { identifier } })

        res.status(200).json({
            status: 'SUCCESS',
            message: 'OTP verified successfully'
        })
    } catch (error) {
        console.error('Error validating otp:', error)
        res.status(500).json({
            status: 'FAILED',
            message: 'Internal server error' + error.message
        })
    }
}