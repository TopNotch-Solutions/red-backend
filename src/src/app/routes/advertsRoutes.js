const express = require('express');
const { verifyAccessToken } = require('../../common/middlewares/authentication');
const { getAdvert, getAdvertById } = require('../controllers/advertsController');

const router = express.Router();

router.get('/get-adverts', verifyAccessToken, getAdvert);
router.get('/get-adverts/:id', verifyAccessToken, getAdvertById);

module.exports = router;