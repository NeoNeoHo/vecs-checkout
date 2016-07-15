'use strict';

angular.module('webApp')
	.factory('Payment', function ($http, $q, $filter, $cookies, Location, Order) {
		// Service logic
		// ...
		var PAY_ON_DELIVER_METHOD = '貨到付款';
		var PAY_ON_DELIVER_SUCCESS_ORDER_STATUS_ID = 55;

		var PAY_ON_STORE_METHOD = '超商付現';
		var PAY_ON_STORE_SUCCESS_ORDER_STATUS_ID = 58;

		var PAY_BY_CREDIT_CARD_METHOD = '信用卡';
		var PAY_BY_CREDIT_CARD_CONFIRM_ORDER_STATUS_IDS = [53, 56, 59];
		var PAY_BY_CREDIT_CARD_SUCCESS_ORDER_STATUA_IDS = [54, 57, 60];
		

		var checkoutToken = $cookies.get('vecs_token');

		var getCathayStrRqXML = function(order_id) {
			console.log('getCathayStrRqXML: ' + order_id);
			var defer = $q.defer();
			$http.get('/api/payments/cathay/rqXML/'+order_id).then(function(resp) {
				defer.resolve(resp.data.rqXML);
			}, function(err) {
				defer.reject(err);
			});
			return defer.promise;
		};	

		// Public API here
		return {
			getCathayStrRqXML: getCathayStrRqXML
		};
	});
