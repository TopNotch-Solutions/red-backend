const multer = require('multer')
const path = require('path')

const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true)
    } else {
        cb(new Error('Only image files are allowed!'), false)
    }
}

const profileStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/electricianProfilePictures')
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`);
    }
})

exports.upload = multer({
    storage: profileStorage,
    fileFilter
})