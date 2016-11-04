'use strict';

angular.module('webApp')
	.controller('EliminatorController', function ($scope, $cookies, Config, Cart) {
		$scope.eliminator = function() {
			Cart.clear();
			$cookies.remove('vecs_token',{domain: '.vecsgardenia.com'});
			$cookies.remove('vecs_token',{domain: 'checkout.vecsgardenia.com'});
			window.location.href = Config.DIR_DOMAIN;
		}
	});
