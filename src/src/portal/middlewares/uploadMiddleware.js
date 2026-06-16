const multer = require('multer')
const path = require('path')
const fs = require('fs')

const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true)
    } else {
        cb(new Error('Only image files are allowed!'), false)
    }
}

const portalProfileStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/portalProfilePictures')
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`);
    }
})

const quizQuestionImageStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/quizzes')
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`)
    }
})

const newsImageStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/news')
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`)
    }
})

const advertsImageStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/adverts')
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`)
    }
})

const tipsImageStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/tips')
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`)
    }
})

const formsStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/forms')
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname)
    }
})

const notificationImageStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/notificationImages')
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname)
    }
})

exports.upload = multer({
    storage: portalProfileStorage,
    fileFilter
})

exports.uploadQuizImage = multer({
    storage: quizQuestionImageStorage,
    fileFilter
}).any()

exports.uploadNewsImage = multer({
    storage: newsImageStorage,
    fileFilter
})

exports.uploadAdvertsImage = multer({
    storage: advertsImageStorage,
    fileFilter
})

exports.uploadTipsImage = multer({
    storage: tipsImageStorage,
    fileFilter
})

exports.uploadForm = multer({
    storage: formsStorage
})

exports.uploadNotificationImage = multer({
    storage: notificationImageStorage,
    fileFilter
})