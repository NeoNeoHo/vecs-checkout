'use strict';

var express = require('express');
var controller = require('./dbModule.controller');
var auth = require('../../auth/auth.service');

var router = express.Router();

router.get('/getModule/:server/:code', controller.getModule);

module.exports = router;
