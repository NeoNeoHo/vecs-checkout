'use strict';

var express = require('express');
var controller = require('./mailchimp.controller');
var auth = require('../../auth/auth.service');

var router = express.Router();

// router.get('/', controller.runTest);
router.get('/addlist/:list_id', auth.isAuthenticated(), controller.addMCListSubscribersHttp);

module.exports = router;
