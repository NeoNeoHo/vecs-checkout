'use strict';

angular.module('webApp')
	.factory('Megamenu', function ($q, $http) {
		var _tree = '';
		var getTree = function() {
			var defer = $q.defer();
			if(_tree !== '') {
				defer.resolve(_tree);
			} else {
				$http.get('https://vecsgardenia.com/index.php?route=api/megamenu/getTree').then(function(result) {
					_tree = result.data.treemenu;
					defer.resolve(result.data.treemenu);
				}, function(err) {
					defer.reject(err);
				});
			}
			return defer.promise;
		};
		// Public API here
		return {
			getTree: getTree,
		};
	});
