'use strict';

var express = require('express');
var controller = require('./reward.controller');

var router = express.Router();

router.get('/:customer_id', controller.getCustomerReward);

module.exports = router;
