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
import api_config from '../../config/api_config.js';
import md5 from 'md5';

var parseString = require('xml2js').parseString;

var Order = require('../order/order.controller.js');
var mysql_pool = db_config.mysql_pool;
var mysql_config = db_config.mysql_config;  

var updateDictSql = function(table, update_dict, condition_dict) {
	var set_string = '';
	var where_string = '';
	_.forEach(_.pairs(update_dict), function(pair) {
		if(set_string.length == 0) {
			set_string = pair[0] + ' = ' + mysql_pool.escape(pair[1]);
		}
		else {
			set_string = set_string + ', ' + pair[0] + ' = ' + mysql_pool.escape(pair[1]);
		}
	});
	_.forEach(_.pairs(condition_dict), function(pair) {
		if(where_string.length == 0) {
			where_string = pair[0] + ' = ' + pair[1];
		}
		else {
			where_string = where_string + ' and ' + pair[0] + ' = ' + pair[1];
		}

	});
	var sql_string = 'update ' + table + ' set ' + set_string + ' where ' + where_string;
	return sql_string;
}

var insertDictSql = function(table, insert_dict) {
	var set_string = '';
	_.forEach(_.pairs(insert_dict), function(pair) {
		if(set_string.length == 0) {
			set_string = pair[0] + ' = ' + mysql_pool.escape(pair[1]);
		}
		else {
			set_string = set_string + ', ' + pair[0] + ' = ' + mysql_pool.escape(pair[1]);
		}
	});
	var sql_string = 'insert into ' + table + ' set ' + set_string;
	return sql_string;
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

	parseString(strRsXML, function(err, result) {	
		var returl = 'checkout.vecsgardenia.com.tw';
		var CAVALUE = md5(returl+api_config.CATHAY.CUBKEY);
		var respXML = "<?xml version='1.0' encoding='UTF-8'?>";
		respXML += "<MERCHANTXML>";
		respXML += "<CAVALUE>" + CAVALUE + "</CAVALUE>";
		
		if(err) {
			respXML += "<RETURL>http://" + returl + "/api/payment/cathay/failure/redirect</RETURL></MERCHANTXML>";
			res.set('Content-Type', 'text/xml').send(respXML);
		} else {
			var content = result.CUBXML;
			var ca_value = content.CAVALUE[0];
			var store_id = content.ORDERINFO[0].STOREID[0];
			var order_number = content.ORDERINFO[0].ORDERNUMBER[0];
			var amount = content.ORDERINFO[0].AMOUNT[0];
			var auth_status = content.AUTHINFO[0].AUTHSTATUS[0];
			var auth_code = content.AUTHINFO[0].AUTHCODE[0];
			var auth_time = content.AUTHINFO[0].AUTHTIME[0];
			var auth_msg = content.AUTHINFO[0].AUTHMSG[0];
			

			if(auth_status !== '0000') {
				respXML += "<RETURL>http://" + returl + "/api/payment/cathay/failure/redirect</RETURL></MERCHANTXML>";
				res.set('Content-Type', 'text/xml').send(respXML);
			} else {
				Order.lgetOrder(order_number).then(function(orders) {
					var order = orders[0];
					var order_status_id = order.order_status_id;
					order.total = 1;
					var server_ca_value = md5(api_config.CATHAY.STOREID + order.order_id + order.total + auth_status + auth_code + api_config.CATHAY.CUBKEY);
					if(server_ca_value === ca_value) {
						respXML += "<RETURL>http://" + returl + "/api/payment/cathay/success/redirect</RETURL></MERCHANTXML>";	
						var order_update_dict = {
							payment_custom_field: "授權時間:" + auth_time + ",授權狀態:" + auth_status + ",授權碼:" + auth_code + ",授權訊息:" + auth_msg + ",授權金額:" + amount,
							order_status_id: api_config.CathayPaymentNextOrderStatusId(order_status_id)
						};
						var order_condition_dict = {
							order_id: order_number
						};

						var order_history_insert_dict = {
							order_id: order_number,
							order_status_id: api_config.CathayPaymentNextOrderStatusId(order_status_id),
							notify: 0,
							comment: "授權時間:" + auth_time + ",授權狀態:" + auth_status + ",授權碼:" + auth_code + ",授權訊息:" + auth_msg + ",授權金額:" + amount,
							date_added: new Date()
						};
						var sql = updateDictSql('oc_order', order_update_dict, order_condition_dict);
						sql += ';';
						sql += insertDictSql('oc_order_history', order_history_insert_dict);
						mysql_pool.getConnection(function(err, connection) {
							if(err) {
								console.log(err);
								res.set('Content-Type', 'text/xml').send(respXML);
							} else {
								connection.query(sql, function(err, result) {
									if(err) console.log(err);
									res.set('Content-Type', 'text/xml').send(respXML);
								});								
							}
						});
					} else {
						respXML += "<RETURL>http://" + returl + "/api/payment/cathay/failure/redirect</RETURL></MERCHANTXML>";
						res.set('Content-Type', 'text/xml').send(respXML);
					}
				}, function(err) {
					respXML += "<RETURL>http://" + returl + "/api/payment/cathay/failure/redirect</RETURL></MERCHANTXML>";
					res.set('Content-Type', 'text/xml').send(respXML);
				});
			}
		}
	});
};

export function redirectSuccess(req, res) {
	var xml = req.body.strOrderInfo;
	// xml = "<?xml version='1.0' encoding='UTF-8'?><CUBXML><CAVALUE>d83161127a66cc9615a8691bda034f18</CAVALUE><ORDERINFO><STOREID>010990046</STOREID><ORDERNUMBER>35010</ORDERNUMBER></ORDERINFO></CUBXML>"
	parseString(xml, function(err, result) {
		var content = result.CUBXML;
		var order_id = content.ORDERINFO[0].ORDERNUMBER[0];
		res.redirect('/success?order_id='+order_id);
	});
};

export function redirectFailure(req, res) {
	var xml = req.body.strOrderInfo;
	// xml = "<?xml version='1.0' encoding='UTF-8'?><CUBXML><CAVALUE>d83161127a66cc9615a8691bda034f18</CAVALUE><ORDERINFO><STOREID>010990046</STOREID><ORDERNUMBER>35010</ORDERNUMBER></ORDERINFO></CUBXML>"
	parseString(xml, function(err, result) {
		var content = result.CUBXML;
		var order_id = content.ORDERINFO[0].ORDERNUMBER[0];
		res.redirect('/failure?order_id='+order_id);
	});
};

