'use strict';

var express = require('express');
var controller = require('./product.controller');

var router = express.Router();

router.post('/validate/', controller.validate);

module.exports = router;
