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

var createOrder = function(shipping_info, customer_id, customer_group_id, email, customer_ip) {
	var order_dict = {
		'store_name': 'Vecs Gardenia 嘉丹妮爾',
		'store_url': 'https://vecsgardenia.com',
		'invoice_prefix': '', 'invoice_filename': '', 'fax': '', 'custom_field': '',
		'customer_id': customer_id,
		'customer_group_id': customer_group_id,
		'firstname': shipping_info.firstname,
		'lastname': ' ',
		'email': email,
		'telephone': shipping_info.telephone,
		
		'shipping_firstname': shipping_info.shipping_firstname,
		'shipping_lastname': shipping_info.shipping_lastname,
		'shipping_company': shipping_info.company_id ? shipping_info.company_id : '',
		'shipping_address_1': shipping_info.address,
		'shipping_address_2': '',
		'shipping_city': shipping_info.city_d.name,
		'shipping_postcode': '',
		'shipping_country': shipping_info.country_d ? shipping_info.country_d.name : '台灣',
		'shipping_country_id': shipping_info.country_id,
		'shipping_zone': shipping_info.city_d.name,
		'shipping_zone_id': shipping_info.city_d.zone_id,
		'shipping_district': shipping_info.district_d ? shipping_info.district_d.name : '',
		'shipping_district_id': shipping_info.district_d ? shipping_info.district_d.district_id : '',
		'shipping_method': shipping_info.shipping_method,
		'shipping_address_format': '', 'shipping_custom_field': '', 'shipping_code': '',

		'payment_firstname': shipping_info.shipping_firstname,
		'payment_lastname': shipping_info.shipping_lastname,
		'payment_company': shipping_info.company_id ? shipping_info.company_id : '',
		'payment_address_1': shipping_info.address,
		'payment_address_2': '',
		'payment_city': shipping_info.city_d.name,
		'payment_postcode': '',
		'payment_country': shipping_info.country_d ? shipping_info.country_d.name : '台灣',
		'payment_country_id': shipping_info.country_id,
		'payment_zone': shipping_info.city_d.name,
		'payment_zone_id': shipping_info.city_d.zone_id,
		'payment_district': shipping_info.district_d ? shipping_info.district_d.name : '',
		'payment_district_id': shipping_info.district_d ? shipping_info.district_d.district_id : '',
		'payment_method': '', 'payment_address_format': '', 'payment_custom_field': '', 'payment_code': '',
		
		'affiliate_id': 0, 'commission': 0, 'marketing_id': 0, 'tracking': '', 'language_id': 2, 'currency_id': 4, 
		'forwarded_ip': '', 'user_agent': '', 'accept_language': '', 'balanced_document': '', 'date_invoice': 0,
		'comment': shipping_info.comment ? shipping_info.comment : '',
		'total': shipping_info.total,
		'order_status_id': shipping_info.order_status_id,
		'currency_code': 'TWD',
		'currency_value': 1,
		'ip': customer_ip,
		'date_added': new Date(),
		'date_modified': new Date()
	};
	var defer = q.defer();
	console.log(order_dict);
	mysql_pool.getConnection(function(err, connection) {
		if(err) defer.reject(err);
		connection.query('INSERT INTO oc_order SET ?;', order_dict, function(err, rows) {
			connection.release();
			if(err) {
				console.log('#########@@@@@@@@@#########');
				console.log(err);
				defer.reject(err);
			}
			console.log('@@@@@@@@@@@@@@@@@@@: ' + rows.insertId);
			defer.resolve(rows);
		});
	});
	return defer.promise;
};


// ################ Check Cart validation of 'price', 'maximun amount', 'discount', 'special', 'reward point' ###########
// ####
// ####
// ######################################################################################################################
export function create(req, res) {
	var customer_id = req.user._id;
	var customer_group_id = req.user.customer_group_id;
	var customer_ip = req.ip;
	var email = req.user.email;
	var cart = req.body.cart;
	var shipping_info = req.body.shipping_info;

	shipping_info.total = cart.product_total_price + cart.shipment_fee - cart.discount.coupon - cart.discount.reward - cart.discount.voucher;
	createOrder(shipping_info, customer_id, customer_group_id, email, customer_ip).then(function(data) {
		res.status(200).json(data);
	}, function(err) {
		res.status(400).send(err);
	});
};

