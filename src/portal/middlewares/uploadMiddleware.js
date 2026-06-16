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

const NOTIFICATION_IMAGE_DIR = 'uploads/notificationImages'

const notificationImageStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        ensureNotificationImageDir()
        cb(null, NOTIFICATION_IMAGE_DIR)
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname)
    }
})

const ensureNotificationImageDir = () => {
    if (!fs.existsSync(NOTIFICATION_IMAGE_DIR)) {
        fs.mkdirSync(NOTIFICATION_IMAGE_DIR, { recursive: true })
    }
}

/**
 * Validates image path from POST /upload-image (uploadNotificationImage multer).
 * Socket sendNotification / sendNotificationToMultipleUsers must pass this path as `image`.
 */
exports.resolveNotificationImagePath = (imagePath) => {
    if (!imagePath || typeof imagePath !== 'string') {
        return null
    }

    const normalized = imagePath.trim().replace(/\\/g, '/')

    if (!normalized.startsWith(`${NOTIFICATION_IMAGE_DIR}/`)) {
        throw new Error(
            'Invalid image path. Upload the image first via POST /notifications/upload-image.',
        )
    }

    if (!fs.existsSync(normalized)) {
        throw new Error('Notification image not found. Please upload the image again.')
    }

    return normalized
}

exports.resolveNotificationImageFromSocket = (data) => {
    if (!data?.image) {
        return null
    }
    return exports.resolveNotificationImagePath(data.image)
}

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
