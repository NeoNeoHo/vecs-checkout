'use strict';

var express = require('express');
var controller = require('./order.controller');
var auth = require('../../auth/auth.service');

var router = express.Router();

router.get('/order/:order_id', auth.isAuthenticated(), controller.getOrder);
router.post('/order/', auth.isAuthenticated(), controller.create);
router.post('/orderHistory/', auth.isAuthenticated(), controller.insertOrderHistory);
router.put('/order/:order_id', auth.isAuthenticated(), controller.updateOrder);

module.exports = router;
