'use strict';

var express = require('express');
var controller = require('./sms.controller');
var auth = require('../../auth/auth.service');

var router = express.Router();

// router.get('/referral_check/:tel', auth.isAuthenticated(), controller.referralCheck);

module.exports = router;
