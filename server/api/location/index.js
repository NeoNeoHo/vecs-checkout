'use strict';

var express = require('express');
var controller = require('./location.controller');

var router = express.Router();

router.get('/countries', controller.countries);
router.get('/cities/:country_id', controller.cities);
router.get('/districts/:city_id', controller.districts);
router.get('/customer/:customer_id/:address_id', controller.getAddress);
router.put('/address', controller.updateAddress);


module.exports = router;
