'use strict';

var express = require('express');
var controller = require('./mandrill.controller');
var auth = require('../../auth/auth.service');

var router = express.Router();

router.get('/', controller.runTest);
router.post('/order/success/', auth.isAuthenticated(), controller.sendOrderSuccessHttpPost);

module.exports = router;
