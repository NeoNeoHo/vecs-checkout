/**
 * Using Rails-like standard naming convention for endpoints.
 * GET     /api/customers              ->  index
 * POST    /api/customers              ->  create
 * GET     /api/customers/:id          ->  show
 * PUT     /api/customers/:id          ->  update
 * DELETE  /api/customers/:id          ->  destroy
 */

'use strict';

import _ from 'lodash';
import db_config from '../../config/db_config.js';
import q from 'q';
import moment from 'moment';
import api_config from '../../config/api_config.js';
import md5 from 'md5';

var Order = require('../order/order.controller.js');
var mysql_pool = db_config.mysql_pool;
var mysql_config = db_config.mysql_config;  

function respondWithResult(res, entity, statusCode) {
	statusCode = statusCode || 200;
	if (entity || entity[0]) {
		res.status(statusCode).json(entity);
	}
}

function handleEntityNotFound(res, entity) {
	if (!entity[0]) {
		res.status(404).end();
	}
}

function handleError(res, err, statusCode) {
	statusCode = statusCode || 500;
	res.status(statusCode).send(err);
}

export function getCathayRqXML(req, res) {
	var order_id = req.params.order_id;
	var customer_id = req.user._id;
	Order.lgetOrder(order_id).then(function(orders) {
		var order = orders[0];
		if(order.customer_id != customer_id) res.status(400).send('Error: This order is not yours.');
		var CAVALUE = md5(api_config.CATHAY.STOREID + order_id + order.total + api_config.CATHAY.CUBKEY);
		var rqXML = "<?xml version='1.0' encoding='UTF-8'?>";
		rqXML += "<MERCHANTXML><CAVALUE>" + CAVALUE + "</CAVALUE>";
		rqXML += "<ORDERINFO><STOREID>" + api_config.CATHAY.STOREID + "</STOREID>";
		rqXML += "<ORDERNUMBER>" + order_id + "</ORDERNUMBER>";
		rqXML += "<AMOUNT>" + order.total + "</AMOUNT></ORDERINFO></MERCHANTXML>";
		res.status(200).send({rqXML: rqXML});
	}, function(err) {
		console.log(err);
		res.status(400).json(err);
	});
};