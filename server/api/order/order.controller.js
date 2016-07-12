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

var updateBulkSql = function(table, update_coll, condition_coll) {
	var sqls = '';
	for(var i = 0; i < _.size(update_coll); i++) {
		var sub_sql = updateDictSql(table, update_coll[i], condition_coll[i]);
		if(sqls.length == 0) {
			sqls = sub_sql;
		} else {
			sqls = sqls + '; ' + sub_sql;
		}
	}
	return sqls;
};

var insertBulkSql = function(table, insert_coll) {
	var sqls = '';
	_.forEach(insert_coll, function(insert_dict) {
		var sub_sql = insertDictSql(table, insert_dict);
		if(sqls.length == 0) {
			sqls = sub_sql;
		} else {
			sqls = sqls + '; ' + sub_sql;
		}
	});
	return sqls;
};


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
		'shipping_country': shipping_info.country_d ? shipping_info.country_d.name : '台灣',
		'shipping_country_id': shipping_info.country_id,
		'shipping_zone': shipping_info.city_d.name,
		'shipping_zone_id': shipping_info.city_d.zone_id,
		'shipping_district': shipping_info.district_d ? shipping_info.district_d.name : '',
		'shipping_district_id': shipping_info.district_d ? shipping_info.district_d.district_id : '',
		'shipping_postcode': shipping_info.district_d ? shipping_info.district_d.postcode : '',
		'shipping_method': shipping_info.shipping_method,
		'shipping_address_format': '', 'shipping_custom_field': '', 'shipping_code': '',

		'payment_firstname': shipping_info.shipping_firstname,
		'payment_lastname': shipping_info.shipping_lastname,
		'payment_company': shipping_info.company_id ? shipping_info.company_id : '',
		'payment_address_1': shipping_info.address,
		'payment_address_2': '',
		'payment_city': shipping_info.city_d.name,
		'payment_country': shipping_info.country_d ? shipping_info.country_d.name : '台灣',
		'payment_country_id': shipping_info.country_id,
		'payment_zone': shipping_info.city_d.name,
		'payment_zone_id': shipping_info.city_d.zone_id,
		'payment_district': shipping_info.district_d ? shipping_info.district_d.name : '',
		'payment_district_id': shipping_info.district_d ? shipping_info.district_d.district_id : '',
		'payment_postcode': shipping_info.district_d ? shipping_info.district_d.postcode : '',
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
	mysql_pool.getConnection(function(err, connection) {
		if(err) defer.reject(err);
		connection.query('INSERT INTO oc_order SET ?;', order_dict, function(err, rows) {
			connection.release();
			if(err) {
				defer.reject(err);
			}
			defer.resolve(rows);
		});
	});
	return defer.promise;
};

var createOrderHistory = function(order_id = 0, order_status_id = 0, notify = 0, comment = '') {
	var defer = q.defer();
	var insert_dict = {
		order_id: order_id,
		order_status_id: order_status_id,
		notify: notify,
		comment: comment,
		date_added: new Date()
	};
	mysql_pool.getConnection(function(err, connection) {
		if(err) defer.reject(err);
		connection.query('INSERT INTO oc_order_history SET ?;', insert_dict, function(err, rows) {
			connection.release();
			if(err) {
				defer.reject(err);
			}
			defer.resolve(rows);
		});
	});
	return defer.promise;
};

var createOrderProduct = function(order_id, cart) {
	var products = cart.products;
	var defer = q.defer();
	var insert_coll = [];
	insert_coll = _.map(products, function(product) {
		return {
			order_id: order_id,
			product_id: product.product_id,
			name: product.name,
			model: product.model,
			quantity: product.quantity,
			price: product.spot_price + product.option_price,
			total: (product.spot_price + product.option_price) * product.quantity,
			reward: product.reward * product.quantity
		};
	});
	var sql = insertBulkSql('oc_order_product', insert_coll);
	mysql_pool.getConnection(function(err, connection) {
		if(err) defer.reject(err);
		connection.query(sql, function(err, rows) {
			connection.release();
			if(err) {
				defer.reject(err);
			}
			defer.resolve(rows);
		});
	});
	return defer.promise;
};

var createOrderOption = function(order_id, order_product_id, options) {
	var defer = q.defer();
	var insert_coll = [];
	insert_coll = _.map(options, function(option) {
		return {
			order_id: order_id,
			order_product_id: order_product_id,
			product_option_id: option.product_option_id,
			product_option_value_id: option.product_option_value_id,
			name: option.name,
			value: option.value,
			type: option.type
		};
	});
	var sql = insertBulkSql('oc_order_option', insert_coll);
	mysql_pool.getConnection(function(err, connection) {
		if(err) defer.reject(err);
		connection.query(sql, function(err, rows) {
			connection.release();
			if(err) {
				defer.reject(err);
			}
			defer.resolve(rows);
		});
	});
	return defer.promise;
};

var getOrderTotalDict = function(order_id, code, title, value, sort_order) {
	return {
		order_id: order_id,
		code: code,
		title: title,
		value: value,
		sort_order: sort_order
	};
};

// 注意，這裡有預先處理“禮品券”
var createOrderTotal = function(order_id = 0, shipping_info, cart) {
	var defer = q.defer();
	var insert_coll = [];
	insert_coll.push(getOrderTotalDict(order_id, 'sub_total', '商品總計', cart.product_total_price, 1));
	if(cart.discount.coupon > 0) insert_coll.push(getOrderTotalDict(order_id, 'coupon', '優惠券 - '+cart.discount.coupon_name, -cart.discount.coupon, 2));
	if(cart.discount.reward > 0) insert_coll.push(getOrderTotalDict(order_id, 'reward', '紅利點數 - '+cart.discount.reward, -cart.discount.reward, 3));
	insert_coll.push(getOrderTotalDict(order_id, 'shipping', '運費 - '+shipping_info.shipment_sel_str, shipping_info.shipment_fee, 4));
	if(cart.discount.voucher > 0) insert_coll.push(getOrderTotalDict(order_id, 'voucher', '禮券 - '+cart.discount.voucher_name, -cart.discount.voucher, 5));
	insert_coll.push(getOrderTotalDict(order_id, 'total', '訂單總計', shipping_info.total, 6));
	
	var sql = insertBulkSql('oc_order_total', insert_coll);
	mysql_pool.getConnection(function(err, connection) {
		if(err) defer.reject(err);
		connection.query(sql, function(err, rows) {
			connection.release();
			if(err) {
				defer.reject(err);
			}
			defer.resolve(rows);
		});
	});
	return defer.promise;
};


var createCutomerReward = function(order_id = 0, customer_id = 0, description = '', points = 0) {
	var defer = q.defer();
	var insert_dict = {
		order_id: order_id,
		customer_id: customer_id,
		description: description,
		points: points,
		date_added: new Date()
	};
	mysql_pool.getConnection(function(err, connection) {
		if(err) defer.reject(err);
		connection.query('INSERT INTO oc_customer_reward SET ?;', insert_dict, function(err, rows) {
			connection.release();
			if(err) {
				defer.reject(err);
			}
			defer.resolve(rows);
		});
	});
	return defer.promise;
};

var createCouponHistory = function(order_id = 0, customer_id = 0, coupon_id = 0,  amount = 0) {
	var defer = q.defer();
	var insert_dict = {
		order_id: order_id,
		customer_id: customer_id,
		coupon_id: coupon_id,
		amount: amount,
		date_added: new Date()
	};
	mysql_pool.getConnection(function(err, connection) {
		if(err) defer.reject(err);
		connection.query('INSERT INTO oc_coupon_history SET ?;', insert_dict, function(err, rows) {
			connection.release();
			if(err) {
				defer.reject(err);
			}
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
	
	// Step 1. Create "Order"
	createOrder(shipping_info, customer_id, customer_group_id, email, customer_ip).then(function(data) {
		var order_id = data.insertId;
		var promises = [];

		// Step 2. Create "Order History" and "Order Product" and "Order Total"
		promises.push(createOrderHistory(order_id, shipping_info.order_status_id));
		promises.push(createOrderProduct(order_id, cart));
		promises.push(createOrderTotal(order_id, shipping_info, cart));

		// Step 3. Create "Customer Reward" and "Coupon History" if Used
		if(cart.discount.reward > 0) promises.push(createCutomerReward(order_id, customer_id, '使用於訂單 #'+order_id, -cart.discount.reward));
		if(cart.discount.coupon > 0) promises.push(createCouponHistory(order_id, customer_id, cart.discount.coupon_id, -cart.discount.coupon));
		
		q.all(promises).then(function(datas) {
			var order_product_query_responses = datas[1];
			var lpromises = [];
			for(var i = 0; i < cart.products.length; i++) {
				if(cart.products[i].option.length > 0) {
					// Step 4. Create "Order Option"
					lpromises.push(createOrderOption(order_id, order_product_query_responses[i].insertId, cart.products[i].option));
				}
			}
			if(lpromises.length > 0) {
				q.all(lpromises).then(function(data) {
					res.status(200).json({order_id: order_id});
				}, function(err) {
					res.status(400).send(err);
				});
			} else {
				res.status(200).json({order_id: order_id});
			}
		}, function(err) {
			console.log(err);
			res.status(400).send(err);
		});
	}, function(err) {
		console.log(err);
		res.status(400).send(err);
	});
};

export function updateOrder(req, res) {
	var customer_id = req.user._id;
	var order_id = req.params.order_id;
	var update_dict = req.body.update_dict;

	update_dict.date_modified = new Date();
	var sql = updateDictSql('oc_order', update_dict, {order_id: order_id, customer_id: customer_id});
	console.log(sql);
	mysql_pool.getConnection(function(err, connection) {
		if(err) {
			console.log(err);
			res.status(400).send(err);
		}
		connection.query(sql, function(err, rows) {
			connection.release();
			if(err) {
				console.log(err);
				res.status(400).send(err);
			}
			res.status(200).json(rows);
		});
	});
};

export function insertOrderHistory(req, res) {
	var customer_id = req.user._id;
	var order_id = req.body.order_id;
	var insert_dict = req.body.insert_dict;

	mysql_pool.getConnection(function(err, connection) {
		if(err) res.status(400).send(err);
		connection.query('SELECT * FROM oc_order WHERE order_id = ? AND customer_id = ?', [order_id, customer_id], function(err, rows) {
			connection.release();
			if(err) res.status(400).send(err);
			if(rows.length == 0) res.status(400).send('You Don\'t Have the Permission For This Order.');
			if(rows.length > 0) {
				createOrderHistory(order_id, insert_dict.order_status_id, 0, insert_dict.comment).then(function(data) {
					res.status(200).json(data);
				}, function(err) {
					res.status(400).send(err);
				});
			}
		});
	});
};