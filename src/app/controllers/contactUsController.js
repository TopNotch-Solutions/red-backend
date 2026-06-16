const ContactUsModel = require('../../common/models/contactUsModel')
const { isEmpty, isNumber } = require('../../common/services/utils')
const { transporter } = require('../../common/services/transporter')

exports.sendMessage = async (req, res) => {
    const { fullName, email, message, contact, category } = req.body
    let {accountNo} = req.body

    if (!fullName || isEmpty(fullName)) {
        return res.status(400).json({
            status: 'FAILED',
            message: 'Fullname cannot be blank'
        })
    }

    if (!email || isEmpty(email)) {
        return res.status(400).json({
            status: 'FAILED',
            message: 'Email cannot be blank'
        })
    }

    if (!message || isEmpty(message)) {
        return res.status(400).json({
            status: 'FAILED',
            message: 'Message cannot be blank'
        })
    }

    if (!contact || isEmpty(contact)) {
        return res.status(400).json({
            status: 'FAILED',
            message: 'Contact be blank'
        })
    }

    if (!accountNo || isEmpty(accountNo)) {
        accountNo = null;
    }

    try {
        // const mailOptions = {
        //     from: `"${fullName} <${email}>"`,
        //     replyTo: email,
        //     to: process.env.EMAIL_USER,
        //     subject: "New Contact Form Submission",
        //     html: `
        //         <h3>New Message Received</h3>
        //         <p><strong>Full Name:</strong> ${fullName}</p>
        //         <p><strong>Email:</strong> ${email}</p>
        //         <p><strong>Contact:</strong> ${contact}</p>
        //         <p><strong>Account No:</strong> ${accountNo || "N/A"}</p>
        //         <p><strong>Message:</strong></p>
        //         <p>${message}</p>
        //     `
        // }

        // await transporter.sendMail(mailOptions)

        const newMessage = await ContactUsModel.create({
            fullName,
            email,
            message,
            contact,
            category,
            accountNo
        })

        res.status(201).json({
            status: 'SUCCESS',
            message: 'Message sent successfully',
            data: newMessage
        })
    } catch (error) {
        res.status(500).json({
            status: 'FAILURE',
            message: 'Error sending message',
            error: error.message
        })
    }
}

exports.getMessages = async (req, res) => {
    try {
        const messages = await ContactUsModel.findAll()

        res.status(200).json({
            status: 'SUCCESS',
            message: 'Messages retrieved successfully',
            data: messages
        })
    } catch (error) {
        res.status(500).json({
            status: 'FAILURE',
            message: 'Error retrieving messages',
            error: error.message
        })
    }
}

exports.respondToMessage = async (req, res) => {
    const { response } = req.body
    const { id } = req.params

    try {
        const message = await ContactUsModel.findByPk(id)

        if (!message) {
            return res.status(404).json({
                status: 'FAILURE',
                message: 'Message not found'
            })
        }

        message.response = response
        await message.save()

        res.status(200).json({
            status: 'SUCCESS',
            message: 'Message responded to successfully',
            data: message
        })
    } catch (error) {
        res.status(500).json({
            status: 'FAILURE',
            message: 'Error responding to message',
            error: error.message
        })
    }
}