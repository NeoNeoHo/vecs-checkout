'use strict';

angular.module('webApp')
	.factory('Order', function ($q, $http) {
		// Service logic
		// ...
		var DIR_IMAGE_PATH = 'https://www.vecsgardenia.com/image/';

		var createOrder = function(cart, shipping_info) {
			var defer = $q.defer();
			$http.post('/api/orders/order/', {cart: cart, shipping_info: shipping_info})
			.then(function(result) {
				defer.resolve(result.data);
			}, function(err) {
				defer.reject(err);
			});
			return defer.promise;
		};

		var updateOrder = function(order_id, update_dict) {
			var defer = $q.defer();
			$http.put('/api/orders/order/'+order_id, {update_dict: update_dict})
			.then(function(result) {
				defer.resolve(result.data);
			}, function(err) {
				defer.reject(err);
			});
			return defer.promise;			
		};

		var insertOrderHistory = function(order_id, insert_dict) {
			var defer = $q.defer();
			$http.post('/api/orders/orderHistory/', {order_id: order_id, insert_dict: insert_dict})
			.then(function(result) {
				defer.resolve(result.data);
			}, function(err) {
				defer.reject(err);
			});
			return defer.promise;			
		};
		// Public API here
		return {
			someMethod: function () {
				return meaningOfLife;
			},
			createOrder: createOrder,
			updateOrder: updateOrder,
			insertOrderHistory: insertOrderHistory
		};
	});
