'use strict';

angular.module('webApp')
	.factory('Payment', function ($http, $q, $filter, $cookies, Location, Order) {
		// Service logic
		// ...
		var PAY_BY_HAND_METHOD = '貨到付款';
		var PAY_BY_HAND_ORDER_STATUS_ID = 43;

		var PAY_BY_VOUCHER_METHOD = '禮品券';
		

		var checkoutToken = $cookies.get('vecs_token');

		var setPayByHand = function(order_id) {
			var defer = $q.defer();
			var promises = [];

			// Pay By Hand Parameters Setting
			var update_order_dict = {
				payment_method: PAY_BY_HAND_METHOD,
				order_status_id: PAY_BY_HAND_ORDER_STATUS_ID
			};
			var insert_order_history_dict = {
				order_status_id: PAY_BY_HAND_ORDER_STATUS_ID,
				comment: ''
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
			setPayByHand: setPayByHand
		};
	});
