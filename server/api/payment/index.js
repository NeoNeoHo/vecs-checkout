'use strict';

var express = require('express');
var controller = require('./payment.controller');
var auth = require('../../auth/auth.service');

var router = express.Router();

router.get('/cathay/rqXML/:order_id', auth.isAuthenticated(), controller.getCathayRqXML);

module.exports = router;
