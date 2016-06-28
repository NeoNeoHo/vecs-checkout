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


var getProducts = function(product_id_list) {
	var defer = q.defer();
	mysql_pool.getConnection(function(err, connection) {
		if(err) defer.reject(err);
		connection.query('SELECT * FROM oc_product WHERE product_id in (?) AND status = 1;', [product_id_list], function(err, rows) {
			connection.release();
			if(err) defer.reject(err);
			defer.resolve(rows);
		});
	});
	return defer.promise;
};

var getProductDiscounts = function(product_id_list, customer_group_id) {
	console.log(product_id_list+' '+customer_group_id);
	var defer = q.defer();
	var today = moment().format('YYYY-MM-DD');
	mysql_pool.getConnection(function(err, connection) {
		if(err) defer.reject(err);
		connection.query('SELECT * FROM oc_product_discount WHERE product_id in (?) AND customer_group_id = ? AND date_start <= ? AND (date_end >= ? OR date_end = "0000-00-00");', [product_id_list, customer_group_id, today, today], function(err, rows) {
			connection.release();
			if(err) defer.reject(err);
			defer.resolve(rows);
		});
	});
	return defer.promise;
};

var getProductSpecials = function(product_id_list, customer_group_id) {
	var defer = q.defer();
	var today = moment().format('YYYY-MM-DD');
	mysql_pool.getConnection(function(err, connection) {
		if(err) defer.reject(err);
		connection.query('SELECT * FROM oc_product_special WHERE product_id in (?) AND customer_group_id = ? AND date_start <= ? AND date_end >= ?;', [product_id_list, customer_group_id, today, today], function(err, rows) {
			connection.release();
			if(err) defer.reject(err);
			defer.resolve(rows);
		});
	});
	return defer.promise;
};

var getProductRewards = function(product_id_list, customer_group_id) {
	var defer = q.defer();
	mysql_pool.getConnection(function(err, connection) {
		if(err) defer.reject(err);
		connection.query('SELECT * FROM oc_product_reward WHERE product_id in (?) AND customer_group_id = ?;', [product_id_list, customer_group_id], function(err, rows) {
			connection.release();
			if(err) defer.reject(err);
			defer.resolve(rows);
		});
	});
	return defer.promise;
};

var validateDiscounts = function(test_coll, answer_coll) {
	var result_coll = _.map(test_coll, function(test) {
		var lresults = _.filter(answer_coll, function(answer) {
			return (answer.product_id == test.product_id) && (answer.customer_group_id == test.customer_group_id) && (answer.quantity <= test.quantity);
		});
		if(lresults.length) {
			var lresult = _.last(_.sortBy(lresults, 'quantity'));
			return (lresult[0].price == test.price) ? {status: true, message: test.product_id + ' discount is valid;'} : {status: false, message: test.product_id + ' discount is NOT valid;'};
		}else {
			return {status: true, message: test.product_id + ' discount is valid;'};
		}
	});
	console.log(result_coll);
	var resp = {
		status: '',
		message: []
	};
	resp.message = _.pluck(_.filter(result_coll, {'status': false}), 'message');
	resp.status = (_.filter(result_coll, {'status': false}).length) ? false : true;
	return resp;
};

var validateProducts = function(test_coll, answer_coll) {
	var result_coll = _.map(test_coll, function(test) {
		var lresult = _.filter(answer_coll, function(answer) {
			return (answer.product_id == test.product_id);
		});
		if(lresults.length) {
			
			return (lresult[0].price == test.price) ? {status: true, message: test.product_id + ' discount is valid;'} : {status: false, message: test.product_id + ' discount is NOT valid;'};
		}else {
			return {status: true, message: test.product_id + ' discount is valid;'};
		}
	});
	var resp = {
		status: '',
		message: []
	};
	resp.message = _.pluck(_.filter(result_coll, {'status': false}), 'message');
	resp.status = (_.filter(result_coll, {'status': false}).length) ? false : true;
	return resp;
};

export function validate(req, res) {
	var product_coll = req.body.product_coll;
	var customer_group_id = req.body.customer_group_id;
	var product_id_list = _.pluck(product_coll, 'product_id');
	var promises = [];
	promises.push(getProducts(product_id_list));
	promises.push(getProductDiscounts(product_id_list, customer_group_id));
	promises.push(getProductSpecials(product_id_list, customer_group_id));
	promises.push(getProductRewards(product_id_list, customer_group_id));
	q.all(promises).then(function(datas) {
		var _product_coll = datas[0];
		var _discount_coll = datas[1];
		var _special_coll = datas[2];
		var _reward_coll = datas[3];
		// console.log(_product_coll);
		var resp = {};
		resp['discount'] = validateDiscounts(product_coll, _discount_coll);
		console.log(resp);
		res.status(200).json(resp);
	}, function(err) {
		res.status(400).send(err);
	});
}
