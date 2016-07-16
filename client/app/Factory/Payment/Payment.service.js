'use strict';

angular.module('webApp')
	.factory('Payment', function ($http, $q, $filter, Location, Order) {
		// Service logic
		// ...
		var PAY_ON_DELIVER_METHOD = '貨到付款';
		var PAY_ON_DELIVER_SUCCESS_ORDER_STATUS_ID = 55;

		var PAY_ON_STORE_METHOD = '超商付現';
		var PAY_ON_STORE_SUCCESS_ORDER_STATUS_ID = 58;

		var PAY_BY_CREDIT_CARD_METHOD = '信用卡';
		var PAY_BY_CREDIT_CARD_STATUS_coll = [
			{shipping_method: '送貨到府', confirm_status_id: 53, success_status_id: 54},
			{shipping_method: '超商取貨', confirm_status_id: 56, success_status_id: 57},
			{shipping_method: '海外配送', confirm_status_id: 59, success_status_id: 60}
		];

		var getCathayStrRqXML = function(order_id) {
			console.log('getCathayStrRqXML: ' + order_id);
			var defer = $q.defer();
			$http.get('/api/payments/cathay/rqXML/'+order_id).then(function(resp) {
				defer.resolve(resp.data.rqXML);
			}, function(err) {
				defer.reject(err);
			});
			return defer.promise;
		};


		var setPayOnDeliver = function(order_id) {
			var defer = $q.defer();
			var update_dict = {
				payment_method: PAY_ON_DELIVER_METHOD,
				order_status_id: PAY_ON_DELIVER_SUCCESS_ORDER_STATUS_ID
			};
			Order.updateOrder(order_id, update_dict).then(function(data) {
				defer.resolve(data);
			}, function(err) {
				defer.reject(err);
			});
			return defer.promise;
		};

		var setPayOnStore = function(order_id) {
			var defer = $q.defer();
			var update_dict = {
				payment_method: PAY_ON_STORE_METHOD,
				order_status_id: PAY_ON_STORE_SUCCESS_ORDER_STATUS_ID
			};
			Order.updateOrder(order_id, update_dict).then(function(data) {
				defer.resolve(data);
			}, function(err) {
				defer.reject(err);
			});
			return defer.promise;
		};

		var setPayByCreditCard = function(order_id) {
			var defer = $q.defer();
			Order.getOrder(order_id).then(function(orders) {
				var order = orders[0];
				var shipping_method = order.shipping_method;
				var matched_shipping_method = _.find(PAY_BY_CREDIT_CARD_STATUS_coll, {shipping_method: shipping_method})
				var confirm_order_status_id = matched_shipping_method ? matched_shipping_method.confirm_status_id : 0;

				var update_dict = {
					payment_method: PAY_BY_CREDIT_CARD_METHOD,
					order_status_id: confirm_order_status_id
				};
				Order.updateOrder(order_id, update_dict).then(function(data) {
					getCathayStrRqXML(order_id).then(function(strRqXML) {
						document.getElementById("strRqXMLID").value = strRqXML;
						document.getElementById("cathay_order_form").submit();
						defer.resolve(data);
					}, function(err) {
						console.log(err);
						defer.reject(err);
					});					
				}, function(err) {
					console.log(err);
					defer.reject(err);
				});
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
