'use strict';

var express = require('express');
var controller = require('./customer.controller');

var router = express.Router();

router.put('/:id', controller.update);

module.exports = router;
