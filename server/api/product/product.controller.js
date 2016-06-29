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
		connection.query('SELECT * FROM oc_product WHERE product_id in (?) AND status = 1 AND quantity > 0;', [product_id_list], function(err, rows) {
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


var validate_price_discount_special_reward = function(product_to_validate, db_product, db_discount, db_special, db_reward, customer_group_id) {
	var is_valid = true;
	if(db_product.maximum > 0) {
		is_valid = (product_to_validate.quantity <= db_product.maximum) ? true : false;
	}

	var reasonable_price = _.min([db_product.price, db_discount.price, db_special.price]);

	is_valid = (is_valid && product_to_validate.price == reasonable_price) ? true : false;

	is_valid = (is_valid && product_to_validate.reward == db_reward.points) ? true : false;
	
	return {product__id: product_to_validate.product_id, valid: is_valid};
};


// ################ Check Cart validation of 'price', 'maximun amount', 'discount', 'special', 'reward point' ###########
// ####
// ####
// ######################################################################################################################
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
		var db_product_coll = datas[0];
		var db_discount_coll = datas[1];
		var db_special_coll = datas[2];
		var db_reward_coll = datas[3];

		var resp = _.map(product_id_list, function(product_id) {
			var product_to_validate = _.find(product_coll, {product_id: product_id});
			var db_product = _.find(db_product_coll, {product_id: product_id}) ? _.find(db_product_coll, {product_id: product_id}) : res.status(400).send('查無'+ product_to_validate.name);
			var db_discount_many_condition = _.filter(db_discount_coll, function(discount) { 
				return (discount.product_id == product_to_validate.product_id) && (discount.customer_group_id == customer_group_id) && (discount.quantity <= product_to_validate.quantity);
			});
			var db_discount = db_discount_many_condition.length ? _.last(_.sortBy(db_discount_many_condition, 'quantity')) : {price: db_product.price};
			var db_special = _.find(db_special_coll, {product_id: product_id}) ? _.find(db_special_coll, {product_id: product_id}) : {price: db_product.price};
			var db_reward = _.find(db_reward_coll, {product_id: product_id}) ? _.find(db_reward_coll, {product_id: product_id}) : {points: 0};
			return validate_price_discount_special_reward(product_to_validate, db_product, db_discount, db_special, db_reward);
		});
		if(_.filter(resp, {valid: false}).length > 0) res.status(400).json(resp);
		else res.status(200).json(resp);
	}, function(err) {
		res.status(400).send(err);
	});
}
