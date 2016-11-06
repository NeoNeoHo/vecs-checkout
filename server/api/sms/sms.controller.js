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
import request from 'request';
import q from 'q';
import https from 'https';


var Customer = require('../customer/customer.controller.js');


exports.sendSMS = function(tel, sms_body) {
	var defer = q.defer();
	console.log(tel);
	var url = createSMSRequestUrl(tel, sms_body);
	console.log(url);
	request(url, function(err, response, body) {
		if(err) {
			console.log(err);
			defer.reject(err);
		}
		console.log(body);
		defer.resolve(body);
	});
	return defer.promise;
};


var createSMSRequestUrl = function(tel, sms_body) {
	var url = api_config.sms.url + '?';
	var sms_default_setting = {
		username: api_config.sms.user,
		password: api_config.sms.pw,
		dlvtime: 0,
		dstaddr: tel,
		smbody: sms_body
	}
	console.log(sms_default_setting);
	for(var key in sms_default_setting) {
		url = url + '&' + key + '=' + sms_default_setting[key];
	}
	return encodeURI(url);
};

