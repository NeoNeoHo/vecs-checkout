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



		// Public API here
		return {
			someMethod: function () {
				return meaningOfLife;
			},
			createOrder: createOrder,
		};
	});
