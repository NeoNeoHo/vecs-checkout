'use strict';

var express = require('express');
var controller = require('./order.controller');
var auth = require('../../auth/auth.service');

var router = express.Router();

router.post('/order/', auth.isAuthenticated(), controller.create);

module.exports = router;
