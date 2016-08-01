'use strict';

angular.module('webApp')
	.controller('SuccessCtrl', function ($scope, $location, Order, $cookies, Config, Cart, Customer) {
		Cart.clear();
		$scope.message = 'Hello';
		var urlParams = $location.search();
		var order_id = urlParams['order_id'] ? urlParams['order_id'] : 0;
		Order.getOrderProducts(order_id).then(function(order) {
			$scope.order = order;
			$scope.order_status_level = Order.getStatusLevel($scope.order.order_status_id);
		}, function(err) {
			console.log(err);
		});
		Customer.updateCustomer({cart: ''}).then(function(result) {
			console.log(result);
		}, function(err) {
			console.log(err);
		});
		// $cookies.remove('vecs_cart', {domain: Config.DIR_COOKIES});
		$scope.backToHome = function() {
			window.location.href = Config.DIR_DOMAIN;
		}
	});
