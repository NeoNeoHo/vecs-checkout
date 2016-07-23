'use strict';

angular.module('webApp')
	.controller('SuccessCtrl', function ($scope, $location, Order) {
		$scope.message = 'Hello';
		var urlParams = $location.search();
		var order_id = urlParams['order_id'] ? urlParams['order_id'] : 0;
		Order.getOrderProducts(order_id).then(function(order) {
			$scope.order = order;
			$scope.order_status_level = Order.getStatusLevel($scope.order.order_status_id);
			console.log($scope.order_status_level);
			console.log(order);
		}, function(err) {
			console.log(err);
		});

	});
