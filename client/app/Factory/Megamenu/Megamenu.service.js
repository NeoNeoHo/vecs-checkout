'use strict';

angular.module('webApp')
	.factory('Megamenu', function ($q, $http) {
		var getTree = function() {
			var defer = $q.defer();
			$http.get('/api/megamenus/')
			.then(function(result) {
				// console.log(result.data);
				defer.resolve(result.data);
			}, function(err) {
				defer.reject(err);
			});
			return defer.promise;
		};
		// Public API here
		return {
			getTree: getTree,
		};
	});
