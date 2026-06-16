const userModel = require('../models/usersModel')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
require('dotenv').config()

exports.login = async (req, res) => {
    
    const { email, password } = req.body

    try {
        const user = await userModel.findOne({ where: { email } })

        if (!user) {
            return res.status(400).json({
                status: 400,
                message: 'User not found'
            })
        }

        const isMatch = await bcrypt.compare(password, user.password)

        if (!isMatch) {
            return res.status(400).json({
                status: 400,
                message: 'Invalid email or password'
            })
        }

        const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET)

        res.status(200).json({
            status: 200,
            message: 'Login successful',
            token: token,
            userType: user.userType
        })
    } catch (error) {
        console.error('Error during login:', error)
        res.status(500).json({
            status: 500,
            message: 'Internal server error'
        })
    }
}