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
import api_config from '../../config/api_config.js';
import q from 'q';
import moment from 'moment';
import redis from 'redis';
import unserialize from 'locutus/php/var/unserialize';
import serialize from 'locutus/php/var/serialize';
import PHPUnserialize from 'php-unserialize';
var client = redis.createClient();

var mysql_pool = db_config.mysql_pool;
var mysql_config = db_config.mysql_config;  


// ################ Create "order", "order_totl", "order_product", "order_option", "coupon_history", "customer_reward" ###########
// ####
// ####
// ###############################################################################################################################

var cartCollToSerialize = function(cart_coll) {
	var result = _.reduce(cart_coll, function(result, product) {
		var temp_obj = product.option ? {"product_id": product.product_id, "option": product.option} : {"product_id": product.product_id};
		result[new Buffer(serialize(temp_obj), 'ascii').toString('base64')] = product.quantity;
		return result;
	}, {});
	var serialize_result = serialize(result);
	return serialize_result;
};

var UnserializeToCartColl = function(cart_obj) {
	var cart_coll = _.map(_.keys(cart_obj), function(lkey){
		var obj = unserialize(new Buffer(lkey, 'base64'), 'ascii');
		obj.quantity = cart_obj[lkey];
		return obj;
	});
	return cart_coll;
}

var jsonToPHPSerializeSession = function(obj) {
	var result = _.reduce(_.keys(obj), function(result, lkey){
		result += lkey + '|' + serialize(obj[lkey]);
		return result;
	}, '');
	return result;
};

var getSession = function(session_id) {
	var defer = q.defer();
	var sess_obj = '';
	try {
		client.get(session_id, function(err, reply) {
			if(err) defer.reject(err);
			// 1. Unserialize PHP Session To readable JSON format
			if(reply){
				sess_obj = PHPUnserialize.unserializeSession(reply);
				defer.resolve(sess_obj);
			} else {
				defer.reject('no session');
			}
		});
	}
	catch (e) {
		console.log(e);
		defer.reject('no session');
	}
	return defer.promise;
};

export function getSession(req, res) {
	var session_id = api_config.SESSION_ID + ':' +req.user.session_id;
	var sess_obj = '';
	try {
		client.get(session_id, function(err, reply) {
			// 1. Unserialize PHP Session To readable JSON format
			if(reply){
				sess_obj = PHPUnserialize.unserializeSession(reply);
				res.status(200).json(sess_obj);
			} else {
				res.status(400).send('no session');
			}
			// 2. Unserialize cart string to cart JSON
			// var cart_coll = UnserializeToCartColl(sess_obj.cart);
			// 3. Assign cart JSON back to sess_obj
			// sess_obj.cart = cart_coll;
			// 4. Return JSON
		});	
	}
	catch (e) {
		console.log(e);
		res.status(400).send('no session');
	}
};

export function updateProducts(req, res) {
	var session_id = api_config.SESSION_ID + ':' + req.user.session_id;
	var update_products = req.body.update_products; //[{product_key:'fda', quantity: 1}]
	getSession(session_id).then(function(sess_obj) {
		if(sess_obj.cart){
			sess_obj.cart = {};
			_.forEach(update_products, function(product) {
				if(product.product_key){
					sess_obj.cart[product.product_key] = product.quantity;
				}
			});
			client.set(session_id, jsonToPHPSerializeSession(sess_obj));
			res.status(200).json('ok');
		} else {
			res.status(200).json('ok');
		}
	}, function(err) {
		console.log(err);
		res.status(400).json(err);
	});
};

export function deleteCart(req, res) {
	var session_id = api_config.SESSION_ID + ':' + req.user.session_id;
	getSession(session_id).then(function(sess_obj) {
		if(sess_obj.cart){
			delete sess_obj.cart;
			client.set(session_id, jsonToPHPSerializeSession(sess_obj));
			res.status(200).json('ok');
		} else {
			res.status(200).json('ok');
		}
	}, function(err) {
		console.log(err);
		res.status(400).json(err);
	});
};