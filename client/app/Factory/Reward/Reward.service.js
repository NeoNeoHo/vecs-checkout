'use strict';

angular.module('webApp')
	.factory('Reward', function ($q, $http) {
		// Service logic
		// ...

		var meaningOfLife = 42;
		var getByCustomer = function(customer_id) {
			var defer = $q.defer();
			$http.get('/api/rewards/'+customer_id)
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
			getByCustomer: getByCustomer
		};
	});
