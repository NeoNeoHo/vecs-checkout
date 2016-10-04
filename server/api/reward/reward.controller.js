/**
 * Using Rails-like standard naming convention for endpoints.
 * GET     /api/rewards              ->  index
 * POST    /api/rewards              ->  create
 * GET     /api/rewards/:id          ->  show
 * PUT     /api/rewards/:id          ->  update
 * DELETE  /api/rewards/:id          ->  destroy
 */

'use strict';

import _ from 'lodash';
import Reward from './reward.model';
import db_config from '../../config/db_config.js';
import q from 'q';
var mysql_pool = db_config.mysql_pool;
var mysql_config = db_config.mysql_config;  

function respondWithResult(res, entity, statusCode) {
	statusCode = statusCode || 200;
	if (entity || entity[0]) {
		res.status(statusCode).json(entity);
	}
}


function handleError(res, err_msg, statusCode) {
	statusCode = statusCode || 500;
	res.status(statusCode).send(err_msg);
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

export function createReward(customer_id, order_id, points, comment){
	var defer = q.defer();
	mysql_pool.getConnection(function(err, connection) {
		if(err) {
			defer.reject(err);
		}
		var insert_dict = {
			'customer_id': customer_id,
			'order_id': order_id || 0,
			'description': comment,
			'points': points,
			'date_added': new Date()
		};
		var sql = insertDictSql('oc_customer_reward', insert_dict);
		connection.query(sql, function(err, result) {
			connection.release();
			if(err) {
				defer.reject(err);
			} else {
				console.log('Create Reward: ' + points + ' for ' + customer_id);
				defer.resolve(result);
			}
		});
	});
	return defer.promise;
};

// Update
export function getCustomerReward(req, res) {
	var customer_id = req.user._id;
	var info = req.body;
	mysql_pool.getConnection(function(err, connection){
		if(err) handleError(res, err.message);
		// console.log(connection.escape(customer_id));
		connection.query('select sum(points) as points from '+ mysql_config.db_prefix + 'customer_reward where customer_id = ? ',[customer_id] , function(err, rows) {
			connection.release();
			if(err) handleError(res, err.message);
			// console.log(rows);
			res.status(200).json(rows[0]);
		});

	});
}
