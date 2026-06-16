const express = require('express');
const { verifyAccessToken } = require('../../common/middlewares/authentication');
const { getAdvert, getAdvertById } = require('../controllers/advertsController');
const { cacheMiddleware } = require('../../common/middlewares/cache');

const router = express.Router();

router.get('/get-adverts', verifyAccessToken,cacheMiddleware("adverts"), getAdvert);
router.get('/get-adverts/:id', verifyAccessToken, getAdvertById);

module.exports = router;
