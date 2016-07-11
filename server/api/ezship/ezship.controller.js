/**
 * Using Rails-like standard naming convention for endpoints.
 * GET     /api/ezships              ->  index
 * POST    /api/ezships              ->  create
 * GET     /api/ezships/:id          ->  show
 * PUT     /api/ezships/:id          ->  update
 * DELETE  /api/ezships/:id          ->  destroy
 */

'use strict';

import _ from 'lodash';
import Ezship from './ezship.model';
import db_config from '../../config/db_config.js';
var mysql_pool = db_config.mysql_pool;
var mysql_config = db_config.mysql_config;  

function respondWithResult(res, entity, statusCode) {
	statusCode = statusCode || 200;
	if (entity[0]) {
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

export function upsertHistory(req, res) {
	var customer_id = req.user._id;
	var content = req.body;
	if(!content) handleError(res, 'Err No content to update ezship order');
	var obj = {
		customer_id : customer_id,
		stCate : content.stCate,
		stCode : content.stCode,
		stName : content.stName,
		stAddr : content.stAddr,
		stTel : content.stTel
	};
	mysql_pool.getConnection(function(err, connection){
		if(err) handleError(res, err);
		connection.query('insert into oc_customer_ezship_history set ?',obj, function(err, rows) {
			if(err) {
				// connection.query('update oc_customer_ezship_history set ? where customer_id = ?',[obj, customer_id] , function(err, rows) {
					connection.release();
					// if(err) handleError(res, err);
					res.redirect('/?showCheckout=true');
				// });
			}
			else {
				connection.release();
				res.redirect('/?showCheckout=true');
			}
		});
	});
}

export function getHistory(req, res) {
	var customer_id = req.user._id;
	var order_id = req.params.id;
	if(!order_id) handleError(res, 'You should keyin an order_id !!');
	mysql_pool.getConnection(function(err, connection){
		if(err) { handleError(res, err); }
		connection.query('select * from oc_customer_ezship_history where customer_id = ? order by ezship_history_id desc limit 1;',[customer_id] , function(err, result_coll) {
			connection.release();
			// Handle Query Process Error.
			if(err) handleError(res, err);
			// Handle Empty Query Result.
			if(_.size(result_coll) == 0) res.status(404).end();
			// Query Successfully.
			else { 
				res.status(200).json(result_coll);
			}
		});
	});
}
