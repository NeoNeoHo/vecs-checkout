'use strict';

angular.module('webApp')
	.factory('Customer', function ($q, $http) {
		// Service logic
		// ...

		var meaningOfLife = 42;
		var updateCustomer = function(customer_id, info) {
			var defer = $q.defer();
			$http.put('/api/customers/'+customer_id, info)
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
			updateCustomer: updateCustomer
		};
	});
