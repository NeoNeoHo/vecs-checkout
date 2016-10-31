'use strict';

angular.module('webApp')
	.controller('CheckoutController', function ($rootScope, $scope, $window, $state, $document) {
		$rootScope.$state = $state;
		$rootScope.$on('$stateChangeSuccess', function() {
			var someElement = angular.element(document.getElementById('form-container'));
			$document.scrollToElementAnimated(someElement, 0, 800);
		});
	});
