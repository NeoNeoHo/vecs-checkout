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
var Sms = require('../sms/sms.controller.js');

var REFERRAL_SUCCESS_ORDER_STATUS_IDS = [20, 29, 54, 57, 60]; // ONLY CREDIT PAY IS COUNTED
// var TOTAL_SUCCESS_ORDER_STATUS_IDS = [60, 58, 57, 55, 54, 34, 32, 29, 28, 21, 17];
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


var completeAmount = function(referer_customer_id) {
	var defer = q.defer();
	getReferralResult(referer_customer_id).then(function(result) {
		var succeed_amount = _.size(result.customer_list) || 0;
		defer.resolve(succeed_amount);
	}, function(err) {
		defer.resolve(0);
	});
	return defer.promise;
};


// 紅利回饋特殊活動，Return [reward_points, comment]
var specialCampaign = function(complete_amount, reward_points, comment) {
	switch (complete_amount) {
		case 3:
			reward_points = reward_points*1.5;
			comment += '單筆紅利加碼1.5倍。';
			break;
		case 6:
			reward_points = reward_points*2;
			comment += '單筆紅利加碼2倍送，加贈稻米保濕面膜1盒＋微笑小提袋';
			break;
		case 10:
			comment += '加贈稻米保濕面膜3盒＋嘉丹妮爾時尚購物袋';
			break;
		default:
			break;
	}
	return [reward_points, comment];
};

var addCampaignResult = function(campaign_id, referer_customer_id, description, order_id) {
	var defer = q.defer();
	var insert_dict = {
		referral_campaign_id: campaign_id,
		customer_id: referer_customer_id,
		description: description,
		date_added: new Date(),
		order_id: order_id
	};
	var insert_sql = insertDictSql('oc_referral_campaign_result', insert_dict);
	mysql_pool.getConnection(function(err, connection) {
		if (err) {
			connection.release();
			defer.reject(err);
		}
		connection.query(insert_sql, function(err, result) {
			connection.release();
			if(err) {
				defer.reject(err);
			}
			defer.resolve();
		});
	});
	return defer.promise;
}


// Return Object with two keys:
// 		registered_coll : array of referee objs [{...}, {...}, ...]
// 		customer_list : array of successful customer_id [ 1, 2, 3 ...]
var getReferralResult = function(referer_customer_id) {
	var defer = q.defer();
	var rc = ConvertBase.dec2hex(referer_customer_id);
	var res_result = {
		registered_coll: [],
		customer_list: []
	};
	mysql_pool.getConnection(function(err, connection) {
		if (err) {
			connection.release();
			defer.reject(err);
		}
		connection.query('select customer_id, email, firstname from oc_customer where referral_code = ?',[rc], function(err, result) {
			if (err) {
				connection.release();
				defer.reject(err);
			}
			res_result.registered_coll = result;
			if(result.length) {
				var customer_ids = _.pluck(result, 'customer_id');
				connection.query('select distinct(customer_id) from oc_order where customer_id in (?) and order_status_id in (?);', [customer_ids, REFERRAL_SUCCESS_ORDER_STATUS_IDS], function(err, customer_result) {
					connection.release();
					if(err) {
						defer.reject(err);
					}
					res_result.customer_list = _.pluck(customer_result, 'customer_id');
					defer.resolve(res_result);
				});
			} else {
				connection.release();
				defer.resolve(res_result);
			}
			
		});
	});
	return defer.promise;
};



// ############### 
// When Referee meets the criteria, run this function to check and to reward
// ###############
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
				var referer_customer_id = ConvertBase.hex2dec(referee.referral_code);

				// Step . 根據不同的推薦成功人次，給予不同級距的紅利
				completeAmount(referer_customer_id).then(function(complete_amount) {
					if(complete_amount <= 0) {
						defer.reject('推薦人成功次數比零小'); 
					}
					var promises = [];
					var comment = '與好友'+ referee.firstname +'(' + customer_id + ')分享的回饋紅利，第'+complete_amount+'次分享好友！！';
					var comment2 = '謝謝您加入嘉丹妮爾，這是給您的回饋紅利';
					var coupon_code = referee.referral_code + ConvertBase.dec2hex(customer_id);

					complete_amount = (complete_amount > 10) ? 10 : complete_amount;
						// 根據不同的推薦成功人次，給予不同級距的紅利
					var reward_points = api_config.REFERRAL.referer_reward_list[complete_amount-1];
					
						// 若有特殊紅利加倍活動，則於此處修改
					//[reward_points, comment] = specialCampaign(complete_amount, reward_points, comment);
					
					promises.push(Reward.createReward(referer_customer_id, order_id, reward_points, comment));
					promises.push(Reward.createReward(customer_id, order_id, api_config.REFERRAL.referee_reward, comment2));

						// 記錄特殊紅利加倍活動的結果
					// promises.push(addCampaignResult(1, referer_customer_id, comment, order_id));
					
					q.all(promises).then(function(datas) {
						setTimeout(function() {
							Mail.sendReferralSuccessMail(referer_customer_id, customer_id, coupon_code, reward_points, complete_amount);
						}, 10000);
						console.log('####### FINISH REWARDING #########');
						defer.resolve('done');
					}, function(err) { 
						console.log(err);
						defer.reject(err); 
					});
				}, function(err) {

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
	var referer_customer_id = req.user._id;
	getReferralResult(referer_customer_id).then(function(res_result) {
		res.status(200).json(res_result);
	}, function(err) {
		res.status(400).json(err);
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
			connection.release();
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
			connection.release();
			defer.reject(err);
		}
		connection.query('select * from oc_order where order_id < ? and customer_id = ? and order_status_id in (?)', [order_id, customer_id, REFERRAL_SUCCESS_ORDER_STATUS_IDS], function(err, results) {
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





// ############### 
// When Referee meets the criteria, run this function to check and to reward
// ###############
export function smsFraudCheck(req, res) {
	var customer_id = req.user._id;
	var referral_code = req.user.referral_code;
	var telephone = req.params.telephone;
	if (!referral_code) {
		res.status(200).json({status: 'pass', msg: '已驗證成功'});
	} else {
		isTelOnReferralTelCheckListAndQualified(telephone).then(function(result) {
			if (result === 'no') {
				addReferralTelCheckRecord(customer_id, telephone).then(function(create_result) {
					var sms_body = 'Vecs Gardenia Verification Code: ' + create_result.code + '';
					Sms.sendSMS(telephone, sms_body).then(function(sms_result) {
						res.status(200).json({status: 'send', msg: '已發送驗證碼'});
					}, function(err) {
						res.status(400).json(err);
					});
				}, function(err) {
					res.status(400).json(err);
				});
			} else {
				var customer = result[0] || result;
				if (customer.customer_id !== customer_id) {
					res.status(200).json({status: 'duplicate', msg: '此電話號碼已經他人認證，若有疑問，請撥打客服電話:02-23623827'});
				} else {
					res.status(200).json({status: 'pass', msg: '已驗證成功'});
				}
			}
		}, function(err) {
			res.status(400).json(err);
		});		
	}
};

export function verifyTelSms(req, res) {
	var customer_id = req.user._id;
	var code = req.body.code;
	var telephone = req.body.telephone;
	isSmsCorrect(customer_id, telephone, code).then(function(result) {
		res.status(200).json(result);
	}, function(err) {
		res.status(400).send('no tel sms verification code');
	});
};

// ############### 
// Check if the telephone number has been used and verified 
// ###############
var isTelOnReferralTelCheckListAndQualified = function(telephone) {
	var defer = q.defer();
	mysql_pool.getConnection(function(err, connection) {
		if (err) {
			connection.release();
			defer.reject(err);
		}
		connection.query('select * from oc_referral_tel_check where telephone = ? and status = 1;', [telephone], function(err, results) {
			connection.release();
			if (err) {
				defer.reject(err);
			}
			if(_.size(results) == 0) {
				defer.resolve('no');
			} else {
				defer.resolve(results);
			}
		});
	});
	return defer.promise;	
};


var addReferralTelCheckRecord = function(customer_id, telephone) {
	var defer = q.defer();
	mysql_pool.getConnection(function(err, connection) {
		if (err) {
			connection.release();
			defer.reject(err);
		}
		connection.query('select * from oc_referral_tel_check where customer_id = ? and telephone = ?',[customer_id, telephone] , function(err, results) {
			if (err) {
				connection.release();
				defer.reject(err);
			}
			var verification_code = Math.floor((Math.random() * 10000) + 1);
			var sql = '';
			// update
			if (_.size(results) > 0) {
				var update_dict = {
					verification_code: verification_code
				};
				var condiction_dict = {
					customer_id: customer_id,
					telephone: telephone
				}
				sql = updateDictSql('oc_referral_tel_check', update_dict, condiction_dict);
			} else {
				var insert_dict = {
					customer_id: customer_id,
					telephone: telephone,
					verification_code: verification_code,
					status: 0
				};
				sql = insertDictSql('oc_referral_tel_check', insert_dict);		
			}
			connection.query(sql, function(err, upsert_result) {
				connection.release();
				if(err) {
					defer.reject(err);
				} else {
					defer.resolve({tel: telephone, code: verification_code});
				}
			});
		});
	});
	return defer.promise;	
};

var isSmsCorrect = function(customer_id, telephone, code) {
	var defer = q.defer();
	mysql_pool.getConnection(function(err, connection) {
		if (err) {
			connection.release();
			defer.reject(err);
		}
		connection.query('select * from oc_referral_tel_check where customer_id = ? and telephone = ? and verification_code = ?;', [customer_id, telephone, code], function(err, results) {
			connection.release();
			if (err) {
				defer.reject(err);
			}
			if(_.size(results) == 0) {
				defer.resolve('no');
			} else {
				updateReferralTelCheckRecordSucceed(customer_id, telephone).then(function(result) {
					defer.resolve('yes');
				}, function(err) {
					defer.resolve('yes');
				});
			}
		});
	});
	return defer.promise;	
};

var updateReferralTelCheckRecordSucceed = function(customer_id, telephone) {
	var defer = q.defer();
	mysql_pool.getConnection(function(err, connection) {
		if (err) {
			connection.release();
			defer.reject(err);
		}
		var condiction_dict = {
			customer_id: customer_id,
			telephone: telephone
		};
		var update_dict = {
			status: 1
		}
		var sql = updateDictSql('oc_referral_tel_check', update_dict, condiction_dict);
		connection.query(sql, function(err, results) {
			connection.release();
			if (err) {
				defer.reject(err);
			} else {
				defer.resolve();
			}
		});
	});
	return defer.promise;	
};
