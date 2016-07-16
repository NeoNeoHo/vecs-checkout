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
var parseString = require('xml2js').parseString;

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
		order.total = 1;
		if(order.customer_id != customer_id) res.status(400).send('Error: This order is not yours.');
		var CAVALUE = md5(api_config.CATHAY.STOREID + order_id + order.total + api_config.CATHAY.CUBKEY);
		var rqXML = "<?xml version='1.0' encoding='UTF-8'?>";
		rqXML += "<MERCHANTXML><CAVALUE>" + CAVALUE + "</CAVALUE>";
		rqXML += "<ORDERINFO><STOREID>" + api_config.CATHAY.STOREID + "</STOREID>";
		rqXML += "<ORDERNUMBER>" + order_id + "</ORDERNUMBER>";
		rqXML += "<AMOUNT>" + order.total + "</AMOUNT></ORDERINFO></MERCHANTXML>";
		res.status(200).json({rqXML: rqXML});
	}, function(err) {
		console.log(err);
		res.status(400).json(err);
	});
};

export function getCathayCallback(req, res) {
	var strRsXML = req.body.strRsXML;
	var xml = "<?xml version='1.0' encoding='UTF-8'?> <CUBXML><CAVALUE>驗證值</CAVALUE> <ORDERINFO><STOREID>特店代號</STOREID> <ORDERNUMBER>訂單編號</ORDERNUMBER> <AMOUNT>金額</AMOUNT></ORDERINFO> <AUTHINFO><AUTHSTATUS>授權狀態</AUTHSTATUS> <AUTHCODE>授權碼</AUTHCODE> <AUTHTIME>授權時間</AUTHTIME>< AUTHMSG>授權訊息</AUTHMSG></AUTHINFO> </CUBXML>";
	parseString(strRsXML, function (err, result) {
		if(err) res.status(400).json(err);
		console.log(strRsXML);
		// var content = result.CUBXML;
		// var ca_value = content.CAVALUE[0];
		// var store_id = content.ORDERINFO[0].STOREID[0];
		// var order_number = content.ORDERINFO[0].ORDERNUMBER[0];
		// var amount = content.ORDERINFO[0].AMOUNT[0];
		// var auth_status = content.AUTHINFO[0].AUTHSTATUS[0];
		// var auth_code = content.AUTHINFO[0].AUTHCODE[0];
		// var auth_time = content.AUTHINFO[0].AUTHTIME[0];
		// var auth_msg = content.AUTHINFO[0].AUTHMSG[0];
		// Order.lgetOrder(order_number).then(function(orders) {
		// 	var order = orders[0];
		// 	var server_ca_value = md5(api_config.CATHAY.STOREID + order.order_id + order.total + auth_status + auth_code + api_config.CATHAY.CUBKEY);
		// 	if(server_ca_value !== ca_value) res.status(400).send('銀行授權碼不符，請檢查CAVALUE');
			
		// }, function(err) {
		// 	res.status(400).json(err);
		// });
		
	 //    console.log(content.AUTHINFO[0]);
	});
}