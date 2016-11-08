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
import mandrill from 'mandrill-api/mandrill';
var Order = require('../order/order.controller.js');
var Customer = require('../customer/customer.controller.js');
var mandrill_client = new mandrill.Mandrill(api_config.MANDRILL_KEY);

var mandrill_message_template = function(message_info, to_coll, merge_vars_coll, ga_campaign="md_order_success", tags=["default"]) {
	return {
		"from_email": message_info.from_email,
    	"from_name": message_info.from_name,
    	"subject": message_info.subject,
		"to": to_coll,
		"headers": {
			"Reply-To": "customer@vecsgardenia.com"
		},
		"important": false,
		"track_opens": null,
		"track_clicks": null,
		"auto_text": null,
		"auto_html": null,
		"inline_css": null,
		"url_strip_qs": null,
		"preserve_recipients": null,
		"view_content_link": null,
		"bcc_address": "benson@vecsgardenia.com",
		"tracking_domain": null,
		"signing_domain": null,
		"return_path_domain": null,
		"merge": true,
		"merge_language": "mailchimp",
		"global_merge_vars": [{
				"name": "merge1",
				"content": "merge1 content"
			}],
		"merge_vars": merge_vars_coll,
		"tags": tags,
		"google_analytics_domains": [
			"vecsgardenia.com"
		],
		"google_analytics_campaign": ga_campaign,
		"metadata": {
			"website": "www.vecsgardenia.com"
		}
	};
};

var sendErrorLog = function(order_id, error_log) {
	var defer = q.defer();
		var firstname = 'Benson';
		var email = 'benson@vecsgardenia.com';
		var template_name = api_config.mandrill_template.error_log;
		var template_content = [{
			"name": "example name",
			"content": "example content"
		}];
		var to_coll = [{
			"email": email,
			"name": firstname,
			"type": "to"
		}];
		var merge_vars_coll = [{
			"rcpt": email,
			"vars": [
				{
					"name": "order_id",
					"content": order_id
				},
				{
					"name": "error_log",
					"content": error_log
				}
			]
		}];
		var message_info = {
			from_name: "結帳系統",
			from_email: "benson@vecsgardenia.com",
			subject: "Error Log !!!"
		};
		var message = mandrill_message_template(message_info, to_coll, merge_vars_coll, "md_order_success", ['error_log']);
		var async = false;
		mandrill_client.messages.sendTemplate({"template_name": template_name, "template_content": template_content, "message": message, "async": async}, function(result) {
		    console.log(result);
		    defer.resolve(result);
		}, function(e) {
		    // Mandrill returns the error as an object with name and message keys
		    console.log('A mandrill error occurred: ' + e.name + ' - ' + e.message);
		    defer.reject(e);
		    // A mandrill error occurred: Unknown_Subaccount - No subaccount exists with the id 'customer-123'
		});
	return defer.promise;
};

var sendOrderSuccess = function(order_id) {
	var defer = q.defer();
	Order.lgetOrder(order_id).then(function(order_info) {
		if(_.size(order_info) == 0) defer.reject('invalid order_id while processing sendOrderSuccess');
		var firstname = order_info[0].firstname;
		var email = order_info[0].email;
		var template_name = api_config.mandrill_template.order_success;
		var template_content = [{
			"name": "example name",
			"content": "example content"
		}];
		var to_coll = [{
			"email": email,
			"name": firstname,
			"type": "to"
		}];
		var merge_vars_coll = [{
			"rcpt": email,
			"vars": [
				{
					"name": "order_id",
					"content": order_id
				}
			]
		}];
		var message_info = {
			from_name: "嘉丹妮爾的出貨小組",
			from_email: "customer@vecsgardenia.com",
			subject: "您的訂單已成功"
		};
		var message = mandrill_message_template(message_info, to_coll, merge_vars_coll, "md_order_success", ['order_success']);
		var async = false;
		mandrill_client.messages.sendTemplate({"template_name": template_name, "template_content": template_content, "message": message, "async": async}, function(result) {
		    console.log(result);
		    defer.resolve(result);
		}, function(e) {
		    // Mandrill returns the error as an object with name and message keys
		    console.log('A mandrill error occurred: ' + e.name + ' - ' + e.message);
		    defer.reject(e);
		    // A mandrill error occurred: Unknown_Subaccount - No subaccount exists with the id 'customer-123'
		});
	}, function(err) {
		console.log(err);
		defer.reject('invalid order_id while processing sendOrderSuccess');
	});
	return defer.promise;
};

var sendReferralSuccessMail = function(referer_id, referee_id, coupon, reward_points, complete_amount) {
	var defer = q.defer();
	var promises = [];
	promises.push(Customer.lget(referer_id));
	promises.push(Customer.lget(referee_id));
	q.all(promises).then(function(datas) {
		var referer = datas[0][0] || datas[0];
		var referee = datas[1][0] || datas[1];
		// console.log(referer);
		// console.log(referee);
		if (!('email' in referer) || !('email' in referee)) {
			console.log('either referer or referee customer info not valid');
			defer.reject('either referer or referee customer info not valid');
		} else {
			
			// 1. PREPARATION OF REFERER MAIL
			var template_name_1 = api_config.mandrill_template.invite_friend.success_to_referer;
			var template_content = [{
				"name": "example name",
				"content": "example content"
			}];
			var to_coll_1 = [{
				"email": referer.email,
				"name": referer.firstname,
				"type": "to"
			}];
			var merge_vars_coll_1 = [{
				"rcpt": referer.email,
				"vars": [
					{
						"name": "FRIEND_NAME",
						"content": referee.firstname
					},{
						"name": "REWARD_POINTS",
						"content": reward_points
					},{
						"name": "COMPLETED_AMOUNT",
						"content": complete_amount
					}
				]
			}];
			var message_info_1 = {
				from_name: "謝謝你分享嘉丹妮爾",
				from_email: "customer@vecsgardenia.com",
				subject: "恭喜你獲得『好友回饋紅利』"
			};
			var message_1 = mandrill_message_template(message_info_1, to_coll_1, merge_vars_coll_1, "md_referral_success", ['referral_success']);
			
			// 2. PREPARATION OF REFEREE MAIL
			var template_name_2 = api_config.mandrill_template.invite_friend.success_to_referee;
			var to_coll_2 = [{
				"email": referee.email,
				"name": referee.firstname,
				"type": "to"
			}];
			var merge_vars_coll_2 = [{
				"rcpt": referee.email,
				"vars": [
					{
						"name": "REWARD_POINTS",
						"content": api_config.REFERRAL.referee_reward
					}
				]
			}];
			var message_info_2 = {
				from_name: "謝謝您喜歡嘉丹妮爾",
				from_email: "customer@vecsgardenia.com",
				subject: "恭喜您購物成功，這是" + referer.firstname + "回饋給您的紅利點數"
			};
			var message_2 = mandrill_message_template(message_info_2, to_coll_2, merge_vars_coll_2, "md_referral_success", ['referral_success']);
			

			// 3. 若有特殊紅利加倍活動，則於此處修改
			var template_name_special = api_config.mandrill_template.invite_friend.success_to_referer;
			var matched_special_flag = false;
			switch (complete_amount) {
				case 3:
					template_name_special = 3;
					matched_special_flag = true;
					break;
				case 6:
					template_name_special = 6;
					matched_special_flag = true;
					break;
				default:
					template_name_special = api_config.mandrill_template.invite_friend.success_to_referer;
					break;
			}
			var to_coll_special = [{
				"email": referer.email,
				"name": referer.firstname,
				"type": "to"
			}];
			var merge_vars_coll_special = [{
				"rcpt": referer.email,
				"vars": [
					{
						"name": "REWARD_POINTS",
						"content": reward_points
					},{
						"name": "FNAME",
						"content": referer.firstname
					}
				]
			}];
			var message_info_special = {
				from_name: "嘉丹妮爾好友分享第" + complete_amount + '位成功!!',
				from_email: "customer@vecsgardenia.com",
				subject: "恭喜你獲得『好友加碼回饋紅利』"
			};
			var message_special = mandrill_message_template(message_info_special, to_coll_special, merge_vars_coll_special, "md_referral_success", ['referral_success']);
			

			var async = false;
			var mandrill_promises = [];
			mandrill_promises.push(mandrill_client.messages.sendTemplate({"template_name": template_name_1, "template_content": template_content, "message": message_1, "async": async}));
			mandrill_promises.push(mandrill_client.messages.sendTemplate({"template_name": template_name_2, "template_content": template_content, "message": message_2, "async": async}));
			if (matched_special_flag) {
				mandrill_promises.push(mandrill_client.messages.sendTemplate({"template_name": template_name_special, "template_content": template_content, "message": message_special, "async": async}));
			}
			q.all(mandrill_promises).then(function(results) {
				console.log(results);
				defer.resolve();
			}, function(e) {
				console.log('A mandrill error occurred: ' + e.name + ' - ' + e.message);
				defer.reject(e);
			});
		}
	}, function(err) {
		defer.reject(err);
	});

	return defer.promise;
};



exports.sendOrderSuccess = sendOrderSuccess;
exports.sendReferralSuccessMail = sendReferralSuccessMail;

exports.sendOrderSuccessHttpPost = function(req, res){
	console.log('######## sendOrderSucessHttpPost');
	var order_id = req.body.order_id;
	if(!order_id) res.status(400).send('Error on sendOrderSuccess: no order_id');
	sendOrderSuccess(order_id).then(function(result) {
		res.status(200).json(result);
	}, function(err) {
		res.status(400).json(err);
	});
};

exports.sendErrorLogHttpPost = function(req, res){
	console.log('######## send Error Log Mail #######');
	var order_id = req.body.order_id;
	var error_log = req.body.error_log;
	if(!order_id) res.status(400).send('Error on sendOrderSuccess: no order_id');
	sendErrorLog(order_id, error_log).then(function(result) {
		res.status(200).json(result);
	}, function(err) {
		res.status(400).json(err);
	});
};

exports.sendInviteHttpPost = function(req, res) {
	console.log('@@@@@@@ Send Invite Friend Mail, From '+req.user.firstname+' to '+req.body.name+'/'+req.body.email+' @@@@@@@');
	var customer_name = req.user.firstname;
	var invite_name = req.body.name;
	var invite_email = req.body.email;
	var rc_url = req.body.rc_url;
	sendInviteMail(customer_name, invite_name, invite_email, rc_url).then(function(result) {
		res.status(200).json(result);
	}, function(err) {
		res.status(400).json(err);
	});
};
