'use strict';

var express = require('express');
var controller = require('./ezship.controller');
var auth = require('../../auth/auth.service');
var cors = require('cors');
var router = express.Router();
var corsOptions = {
	origin: 'http://map.ezship.com.tw/ezship_map_web_2014.jsp'
};

router.get('/history/:id', auth.isAuthenticated(), controller.getHistory);
router.post('/history/', auth.isAuthenticated(), controller.upsertHistory);

module.exports = router;
