/**
 * Using Rails-like standard naming convention for endpoints.
 * GET     /api/locations              ->  index
 * POST    /api/locations              ->  create
 * GET     /api/locations/:id          ->  show
 * PUT     /api/locations/:id          ->  update
 * DELETE  /api/locations/:id          ->  destroy
 */

'use strict';

import _ from 'lodash';
import db_config from '../../config/db_config.js';
import q from 'q';
import api_config from '../../config/api_config.js';

var auth = require('../../auth/auth.service');
var mysql_pool = db_config.mysql_pool;
var mysql_config = db_config.mysql_config;

var Order = require('../order/order.controller.js');
var Mail = require('../mandrill/mandrill.controller.js');
var Reward = require('../reward/reward.controller.js');
var Coupon = require('../coupon/coupon.controller.js');

var SUCCESS_ORDER_STATUS_IDS = [20, 29, 54, 57, 60]; // ONLY CREDIT PAY IS COUNTED

var ConvertBase = function (num) {
	return {
		from : function (baseFrom) {
			return {
				to : function (baseTo) {
					return parseInt(num, baseFrom).toString(baseTo);
				}
			};
		}
	};
};
ConvertBase.hex2dec = function (num) {
    return ConvertBase(num).from(16).to(10);
};
ConvertBase.dec2hex = function (num) {
	return ConvertBase(num).from(10).to(16);
};

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
};

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
};

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


export function startRewarding(customer_id, order_id) {
	var defer = q.defer();
	var date = new Date();
	console.log('####### START REWARDING #########');
	hasReferralCode(customer_id).then(function(referee) {
		if(!referee.referral_code) {
			defer.reject('FAIL');
		} else {
			isFirstTimePurchased(customer_id, order_id).then(function(data) {
				if(data === 'no') {
					defer.reject(err); 
				}
				var promises = [];
				var comment = '與好友'+ referee.firstname +'(' + customer_id + ')分享的回饋紅利';
				var coupon_code = referee.referral_code + ConvertBase.dec2hex(customer_id);
				var coupon_option = {
					name: 'ReferralCoupon_NewMember[' + customer_id + ']',
					code: coupon_code,
					type: api_config.REFERRAL.referee_coupon._type,
					discount: api_config.REFERRAL.referee_coupon.discount,
					logged: 1,
					shipping: 0,
					total: api_config.REFERRAL.referee_coupon.total,
					date_start: date,
					date_end:  '2030-01-01',
					uses_total: 1,
					uses_customer: 1,
					status: 1,
					date_added: new Date()
				};
				var referer_customer_id = ConvertBase.hex2dec(referee.referral_code);
				promises.push(Reward.createReward(referer_customer_id, order_id, api_config.REFERRAL.referer_rewards, comment));
				promises.push(Coupon.createCoupon(coupon_option));
				q.all(promises).then(function(datas) {
					setTimeout(function() {
						Mail.sendReferralSuccessMail(referer_customer_id, customer_id, coupon_code);
					}, 10000);
					console.log('####### FINISH REWARDING #########');
					defer.resolve('done');
				}, function(err) { 
					console.log(err);
					defer.reject(err); 
				});
			}, function(err) { 
				console.log(err);
				defer.reject(err); 
			});			
		}
		
	}, function(err) { 
		console.log(err);
		defer.reject(err); 
	});
	return defer.promise;
};

// To Be Done, by Johny, not sure what to do it effectively
export function isMailInvitedToday(req, res) {
	var email = req.body.email || '';
	var name = req.body.name || '';
	var customer_id = req.user._id;
	var date = new Date();
	date.setDate(date.getDate() - 1);  // get yesterday
	var sql = 'select * from oc_referral_list where date_sent > ? and email = ?;';
	mysql_pool.getConnection(function(err, connection) {
		if(err) {
			connection.release();
			res.status(400).json(err);
		}
		connection.query(sql,[date, email], function(err, result) {
			if(err) {
				connection.release();
				console.log(err);
				res.status(400).json(err);
			}
			// The address has been sent today
			if(result[0]) {
				connection.release();
				res.status(400).send('already_sent');
			} else {
				var insert_dict = {
					customer_id: customer_id,
					email: email,
					name: name,
					date_sent: new Date()
				};
				// IF the address not be sent today, then add it to the table
				var sql = insertDictSql('oc_referral_list', insert_dict);
				connection.query(sql, function(err, result) {
					connection.release();
					if(err) {
						console.log(err);
						res.status(400).json(err);						
					} else {
						res.status(200).send('available_today');
					}
				});
			}
			
		});
	});	
};


export function getRC(req, res) {
	var customer_id = req.user._id;
	// var customer_id = '1';
	var rc = ConvertBase.dec2hex(customer_id);
	// var cr = ConvertBase.hex2dec(rc);
	console.log(rc);
	// console.log(cr);
	res.status(200).send(rc);
};

export function getReferralResult(req, res) {
	var customer_id = req.user._id;
	var rc = ConvertBase.dec2hex(customer_id);
	var res_result = {
		registered_coll: [],
		customer_list: []
	};
	mysql_pool.getConnection(function(err, connection) {
		if (err) {
			connection.release();
			res.status(400).json(err);
		}
		connection.query('select customer_id, email, firstname from oc_customer where referral_code = ?',[rc], function(err, result) {
			if (err) {
				connection.release();
				res.status(400).json(err);
			}
			res_result.registered_coll = result;
			if(result.length) {
				var customer_ids = _.pluck(result, 'customer_id');
				connection.query('select distinct(customer_id) from oc_order where customer_id in (?) and order_status_id in (?);', [customer_ids, SUCCESS_ORDER_STATUS_IDS], function(err, customer_result) {
					connection.release();
					if(err) {
						res.status(400).json(err);
					}
					res_result.customer_list = _.pluck(customer_result, 'customer_id');
					res.status(200).json(res_result);
				});
			} else {
				connection.release();
				res.status(200).json(res_result);
			}
			
		});
	});
};

export function hasReferralCodeHttp(req, res) {
	var customer_id = req.user._id;
	hasReferralCode(customer_id).then(function(result) {
		res.status(200).json(result);
	}, function(err) {
		res.status(400).send('no referral code');
	});
};

export function isFirstTimePurchasedHttp(req, res) {
	var customer_id = req.user._id;
	var order_id = 9999999999;
	isFirstTimePurchased(customer_id, order_id).then(function(result) {
		res.status(200).json(result);
	}, function(err) {
		res.status(400).send('no referral code');
	});
};

var hasReferralCode = function(customer_id) {
	var defer = q.defer();
	mysql_pool.getConnection(function(err, connection) {
		if (err) {
			defer.reject(err);
		}
		connection.query('select referral_code, firstname from oc_customer where customer_id = ?', [customer_id], function(err, results) {
			connection.release();
			if (err) {
				defer.reject(err);
			}
			var result = results[0] || results;
			if('referral_code' in result) {
				defer.resolve(result);
			} else {
				defer.reject('no referral code');
			}
		});
	});
	return defer.promise;
};

var isFirstTimePurchased = function(customer_id, order_id) {
	var defer = q.defer();
	mysql_pool.getConnection(function(err, connection) {
		if (err) {
			defer.reject(err);
		}
		connection.query('select * from oc_order where order_id < ? and customer_id = ? and order_status_id in (?)', [order_id, customer_id, SUCCESS_ORDER_STATUS_IDS], function(err, results) {
			connection.release();
			if (err) {
				defer.reject(err);
			}
			if(_.size(results) == 0) {
				defer.resolve('yes');
			} else {
				defer.resolve('no');
			}
		});
	});
	return defer.promise;	
};