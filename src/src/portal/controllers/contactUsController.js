const contactUsModel = require('../../common/models/contactUsModel')
const { isEmpty } = require('../../common/services/isEmpty')
const { transporter } = require('../../common/services/transporter')

exports.respondToMessage = async (req, res) => {
    const { response } = req.body
    const { id } = req.params

    if(!response || isEmpty(response)){
        return res.status(400).json({
            status: 'FAILED',
            message: 'Response cannot be blank'
        })
    }

    try {
        const message = await contactUsModel.findByPk(id)

        if (!message) {
            return res.status(404).json({
                status: 'FAILED',
                message: 'Message not found'
            })
        }

        message.response = response
        await message.save()

        const mailOptions = {
            from: process.env.EMAIL,
            to: message.email,
            subject: 'Response to your message',
            text: `Hello, ${message.fullName},\n\n${response}\n\nRegards,\nAdmin`
        }

        await transporter.sendMail(mailOptions)

        res.status(201).json({
            status: 201,
            message: 'Message sent successfully',
            data: message
        })
    } catch (error) {
        res.status(500).json({
            status: 'FAILURE',
            message: 'Error sending message',
            error: error.message
        })
    }
}

exports.markAsCompleted = async (req, res) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({
      status: "FAILED",
      message: "Contact us ID cannot be blank",
    });
  }

  try {
    const message = await contactUsModel.findByPk(id);

    if (!message) {
      return res.status(404).json({
        status: "FAILED",
        message: "Message not found",
      });
    }
    if(message.response === null || message.response === ""){
      return res.status(400).json({
        status: "FAILED",
        message: "Message cannot be mark as completed without responding to it.",
      });
    }
    message.isCompleted = true;
    await message.save();

    res.status(200).json({
      status: "SUCCESS",
      message: "Message successfully marked as completed",
      data: message,
    });
  } catch (error) {
    res.status(500).json({
      status: "FAILED",
      message: "Error updating message",
      error: error.message,
    });
  }
};

exports.getMessages = async (req, res) => {
    try {
        const messages = await contactUsModel.findAll()
        res.status(200).json({
            status: 200,
            message: 'Messages retrieved successfully',
            data: messages
        })
    } catch (error) {
        res.status(500).json({
            status: 500,
            message: 'Error retrieving messages',
            error: error.message
        })
    }
}