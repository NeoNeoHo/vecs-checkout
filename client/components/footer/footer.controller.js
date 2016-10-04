angular.module('webApp')
	.controller('FooterController', function($scope, $sce, Referral, Promotion) {
		Promotion.getModule('checkout', 'footer_sentence').then(function(result) {
			$scope.footerSentence = result.setting || 'Vecs Gardenia 嘉丹妮爾，沒有負擔的美麗';
		}, function(err) {
			$scope.footerSentence = 'Vecs Gardenia 嘉丹妮爾，沒有負擔的美麗';
		});
		$scope.trustAsHtml = function(string) {
    		return $sce.trustAsHtml(string);
		};
	});

