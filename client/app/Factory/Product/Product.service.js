'use strict';

angular.module('webApp')
	.factory('Product', function ($q, $http) {
		// Service logic
		// ...

		var meaningOfLife = 42;
		var validateProducts = function(customer_group_id, product_coll) {
			var defer = $q.defer();
			$http.post('/api/products/validate/', {
				customer_group_id: customer_group_id, 
				product_coll: product_coll
			})
			.then(function(result) {
				defer.resolve(result);
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
			validateProducts: validateProducts
		};
	});
