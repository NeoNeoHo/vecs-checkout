'use strict';

var express = require('express');
var controller = require('./referral.controller');
var auth = require('../../auth/auth.service');

var router = express.Router();

router.get('/rc', auth.isAuthenticated(), controller.getRC);
router.get('/result', auth.isAuthenticated(), controller.getReferralResult);
router.get('/hasRC', auth.isAuthenticated(), controller.hasReferralCodeHttp);

router.get('/smsFraudCheck/:telephone', auth.isAuthenticated(), controller.smsFraudCheck);
router.post('/verifyTelSms/', auth.isAuthenticated(), controller.verifyTelSms);

router.get('/isFirstCreditPurchase', auth.isAuthenticated(), controller.isFirstTimePurchasedHttp);
router.post('/referral_list/', auth.isAuthenticated(), controller.isMailInvitedToday);

// router.put('/address', auth.isAuthenticated(), controller.updateAddress);


module.exports = router;
