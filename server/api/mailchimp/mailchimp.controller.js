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
import request from 'request';

var mailchimp_url = 'https://us10.api.mailchimp.com';

exports.addMCListSubscribers = function(list_id, subscribers) {
	var defer = q.defer();
	var url = mailchimp_url+'/3.0/batches';
	var batch_request = {
		'operations': []
	};
	_.forEach(subscribers, function(lsub) {
		batch_request.operations.push({
			'method': 'POST',
			'path': '/lists/'+ list_id + '/members',
			// 'operation_id': lsub.email,
			'body': JSON.stringify({
				'email_address' : lsub.email,
				'status': 'subscribed',
				'merge_fields': {
						'FNAME': lsub.name
					}
				})
		});
	});
	// console.log(batch_request);
	request({
		url: url,
		method: 'POST', 
		json: batch_request
	}, function(err, response, body) {
		if(err) { defer.reject(err); }
		defer.resolve(response);
	}).auth(api_config.mailChimp_user_pw.user, api_config.mailChimp_user_pw.pw, true);
	return defer.promise;
};

exports.addMCListSubscribersHttp = function(req, res) {
	var list_id = req.params.list_id;
	var email = req.user.email;
	var firstname = req.user.firstname;
	var telephone = req.user.telephone;
	
	var subscribers = [];
	subscribers.push({
		email: email,
		name: firstname,
		telephone: telephone
	});

	if(list_id ==='purchased_list') {
		list_id = api_config.mailChimp_lists_ids['purchased_list'];
	} else {
		res.status(200).send();
	}
	var url = mailchimp_url+'/3.0/batches';
	var batch_request = {
		'operations': []
	};
	_.forEach(subscribers, function(lsub) {
		batch_request.operations.push({
			'method': 'POST',
			'path': '/lists/'+ list_id + '/members',
			// 'operation_id': lsub.email,
			'body': JSON.stringify({
				'email_address' : lsub.email,
				'status': 'subscribed',
				'merge_fields': {
						'FNAME': lsub.name
					}
				})
		});
	});
	// console.log(batch_request);
	request({
		url: url,
		method: 'POST', 
		json: batch_request
	}, function(err, response, body) {
		if(err) { res.status(400).send(); }
		console.log('Successful add user in mailchimp list');
		res.status(200).send();
	}).auth(api_config.mailChimp_user_pw.user, api_config.mailChimp_user_pw.pw, true);
};