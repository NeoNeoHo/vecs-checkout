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


export function getSession(req, res) {
	var session_id = api_config.SESSION_ID + ':' +req.user.session_id;
	client.get(session_id, function(err, reply) {

		var sess_obj = PHPUnserialize.unserializeSession(reply);
		var cart_coll = _.map(_.keys(sess_obj.cart), function(lkey){
			var obj = unserialize(new Buffer(lkey, 'base64'), 'ascii');
			obj.quantity = sess_obj.cart[lkey];
			return obj;
		});
		console.log(cart_coll);
	});
	res.status(200).send();
};