// const express = require('express');
// const { authentication } = require('../../common/middlewares/authentication');
// const { mcode, resendMcode, vend, lookup, test, mcodePostpaid, vendPostpaid, mcodePostpaidTest, mcodeTest } = require('../controllers/requestsController');

// const router = express.Router()

// router.post('/prepaid/mcode', authentication, mcodeTest);
// router.post('/re-send/mcode', authentication, resendMcode);
// router.post('/prepaid/vend', authentication, test);
// //router.post('/prepaid/vend', authentication, vend);
// router.post('/prepaid/lookup', lookup);
// //.post("/vend/test", authentication, test);
// router.post("/postpaid/mcode", authentication, mcodePostpaidTest)
// router.post("/postpaid/payment", authentication, vendPostpaid)

// module.exports = router

const express = require('express');
const { authentication } = require('../../common/middlewares/authentication');
const { mcode, resendMcode, vend, lookup, dpo, mcodePostpaid, vendPostpaid, mcodePostpaidTest, mcodeTest } = require('../controllers/requestsController');

const router = express.Router()

router.post('/prepaid/mcode', authentication, mcodeTest);
router.post('/re-send/mcode', authentication, resendMcode);
router.post('/prepaid/vend', authentication, vend);
router.post('/prepaid/lookup', lookup);
router.post("/dpo/vend", authentication, dpo);
router.post("/postpaid/mcode", authentication, mcodePostpaidTest)
router.post("/postpaid/payment", authentication, vendPostpaid)

module.exports = router
