'use strict';

angular.module('webApp')
	.factory('Payment', function ($http, $q, $filter, $cookies, Location, Order) {
		// Service logic
		// ...
		var PAY_BY_HAND_METHOD = '貨到付款';
		var PAY_BY_HAND_ORDER_STATUS_ID = 43;

		var SHIP_TO_OVERSEAS_METHOD = '海外配送';
		var SHIP_TO_OVERSEAS_ORDER_STATUS_ID = 43;

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

		var setShipToOverseas = function(cart, shipping_info) {
			var defer = $q.defer();
			var promises = [];
			var insert_order_dict = {};
			var address_to_update = {};

			// Ship to Home Parameters
			shipping_info.shipping_method = SHIP_TO_OVERSEAS_METHOD;
			shipping_info.order_status_id = SHIP_TO_OVERSEAS_ORDER_STATUS_ID;
			shipping_info.shipping_firstname = shipping_info.firstname;
			shipping_info.shipping_lastname = ' ';

			promises.push(Location.updateAddress(shipping_info));
			promises.push(Order.createOrder(cart, shipping_info));

			$q.all(promises).then(function(datas) {
				console.log('shipping: "Ship to Overseas" done !');
				console.log(datas[1]);
				defer.resolve(datas[1]);
			}, function(err) {
				console.log(err);
				defer.reject(err);
			});
			return defer.promise;
		};
		// Public API here
		return {
			setPayByHand: setPayByHand
		};
	});
