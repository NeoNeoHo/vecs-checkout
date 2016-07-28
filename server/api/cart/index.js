'use strict';

var express = require('express');
var controller = require('./cart.controller');
var auth = require('../../auth/auth.service');

var router = express.Router();

router.get('/session/:session_id', auth.isAuthenticated(), controller.getSession);


module.exports = router;
