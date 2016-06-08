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
import Customer from './customer.model';
import db_config from '../../config/db_config.js';
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

// Update
export function update(req, res) {
  var customer_id = req.params.id;
  var info = req.body;
  console.log(info);
  mysql_pool.getConnection(function(err, connection){
    if(err) handleError(res, err);
    connection.query('update '+ mysql_config.db_prefix + 'customer set ? where customer_id = ? ',[info, customer_id] , function(err, rows) {
      connection.release();
      if(err) handleError(res, err);
      res.status(200).json(rows);
    });

  });
}
