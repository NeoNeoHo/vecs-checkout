'use strict';

angular.module('webApp')
	.factory('Payment', function ($http, $q, $filter, $cookies, Location, Order) {
		// Service logic
		// ...
		var PAY_ON_DELIVER_METHOD = '貨到付款';
		var PAY_ON_DELIVER_SUCCESS_ORDER_STATUS_ID = 55;

		var PAY_ON_STORE_METHOD = '超商付現';
		var PAY_ON_STORE_SUCCESS_ORDER_STATUS_ID = 58;

		var PAY_BY_CREDIT_CARD_METHOD = '信用卡';
		var PAY_BY_CREDIT_CARD_CONFIRM_ORDER_STATUS_IDS = [53, 56, 59];
		var PAY_BY_CREDIT_CARD_SUCCESS_ORDER_STATUA_IDS = [54, 57, 60];
		

		var checkoutToken = $cookies.get('vecs_token');

		var getCathayStrRqXML = function(order_id) {
			var defer = $q.defer();
			$http.get('/api/payments/cathay/rqXML/'+order_id, function(resp) {
				defer.resolve(resp.data);
			}, function(err) {
				defer.reject(err);
			});
			return defer.promise;
		};

		var setPayOnDeliver = function(order_id) {
			var defer = $q.defer();
			var promises = [];

			// Pay On Deliver Parameters Setting
			var update_order_dict = {
				payment_method: PAY_ON_DELIVER_METHOD,
				order_status_id: PAY_ON_DELIVER_SUCCESS_ORDER_STATUS_ID
			};
			var insert_order_history_dict = {
				order_status_id: PAY_ON_DELIVER_SUCCESS_ORDER_STATUS_ID,
				comment: '系統變更訂單狀態'
			};
			
			// Two Steps: 1.Update Order Payment Information.  2.Insert Order History Record
			promises.push(Order.updateOrder(order_id, update_order_dict));
			promises.push(Order.insertOrderHistory(order_id, insert_order_history_dict));

			$q.all(promises).then(function(datas) {
				defer.resolve(datas);
			}, function(err) {
				defer.reject(err);
			});
			return defer.promise;
		};

		var setPayOnStore= function(order_id) {
			var defer = $q.defer();
			var promises = [];

			// Pay On Deliver Parameters Setting
			var update_order_dict = {
				payment_method: PAY_ON_STORE_METHOD,
				order_status_id: PAY_ON_STORE_SUCCESS_ORDER_STATUS_ID
			};
			var insert_order_history_dict = {
				order_status_id: PAY_ON_STORE_SUCCESS_ORDER_STATUS_ID,
				comment: '系統變更訂單狀態'
			};
			
			// Two Steps: 1.Update Order Payment Information.  2.Insert Order History Record
			promises.push(Order.updateOrder(order_id, update_order_dict));
			promises.push(Order.insertOrderHistory(order_id, insert_order_history_dict));

			$q.all(promises).then(function(datas) {
				defer.resolve(datas);
			}, function(err) {
				defer.reject(err);
			});
			return defer.promise;
		};

		var setPayByCreditCard= function(order_id, shipping_method) {
			var defer = $q.defer();
			var promises = [];
			var shipping_id = 0;
			if(shipping_method === '送貨到府') shipping_id = 0;
			if(shipping_method === '超商取貨') shipping_id = 1;
			if(shipping_method === '海外配送') shipping_id = 2;
			// Pay On Deliver Parameters Setting
			var update_order_dict = {
				payment_method: PAY_BY_CREDIT_CARD_METHOD,
				order_status_id: PAY_BY_CREDIT_CARD_CONFIRM_ORDER_STATUS_IDS[shipping_id]
			};
			var insert_order_history_dict = {
				order_status_id: PAY_BY_CREDIT_CARD_CONFIRM_ORDER_STATUS_IDS[shipping_id],
				comment: '系統變更訂單狀態'
			};
			
			// Two Steps: 1.Update Order Payment Information.  2.Insert Order History Record
			promises.push(Order.updateOrder(order_id, update_order_dict));
			promises.push(Order.insertOrderHistory(order_id, insert_order_history_dict));

			$q.all(promises).then(function(datas) {
				defer.resolve(datas);
			}, function(err) {
				defer.reject(err);
			});
			return defer.promise;
		};		

		// Public API here
		return {
			setPayOnDeliver: setPayOnDeliver,
			setPayOnStore: setPayOnStore,
			setPayByCreditCard: setPayByCreditCard
		};
	});
