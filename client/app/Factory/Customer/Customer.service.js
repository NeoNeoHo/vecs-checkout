'use strict';

angular.module('webApp')
	.factory('Customer', function ($q, $http, Auth) {
		var _customer = '';

		var getCustomer = function() {
			var defer = $q.defer();
			if(_customer !== '') {
				defer.resolve(_customer);
			} else {
				Auth.getCurrentUser().$promise.then(function(data) {
					_customer = data;
					defer.resolve(_customer);
				}, function(err) {
					_customer = '';
					defer.reject(err);
				});
			}
			return defer.promise;
		};
		var updateCustomer = function(info) {
			var defer = $q.defer();
			$http.put('/api/customers/', info)
			.then(function(result) {
				defer.resolve(result);
			}, function(err) {
				defer.reject(err);
			});
			return defer.promise;
		};
		// Public API here
		return {
			getCustomer: getCustomer,
			updateCustomer: updateCustomer
		};
	});
