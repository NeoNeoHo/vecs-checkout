angular.module('webApp')
	.controller('NavbarController', function($scope, $sce, Auth, Megamenu, Referral, Promotion) {
		$scope.menu = [
			{
				title: 'Home',
				state: 'main'
			},
			{
				title: 'Checkout',
				state: 'checkout'
			}
		];
		$scope.isCollapsed = true;
		$scope.isLoggedIn = Auth.isLoggedIn;
		$scope.isAdmin = Auth.isAdmin;
		$scope.getCurrentUser = Auth.getCurrentUser;
		// Referral.withReferralQualified().then(function(result) {
		// 	if(result) {
		// 		Promotion.getModule('checkout', 'referral_notification').then(function(result) {
		// 			$scope.notification = $sce.trustAsHtml(result.setting);
		// 		}, function(err) {
		// 			$scope.notification = '';
		// 		});
		// 	}
		// }, function(err) {
		// 	$scope.notification = '';
		// });
		$scope.trustAsHtml = function(string) {
    		return $sce.trustAsHtml(string);
		};
		Megamenu.getTree().then(function(data) {
			$scope.megamenu = data;
		}, function(err) {});
	});

