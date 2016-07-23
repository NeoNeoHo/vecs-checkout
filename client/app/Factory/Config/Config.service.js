'use strict';

angular.module('webApp')
	.factory('Config', function ($q, $http) {
		var DIR_IMAGE_PATH = 'https://www.vecsgardenia.com/image/';
		// var DIR_HOST = 'http://love.vecsgardenia.com.tw';
		// var COOKIES_DOMAIN = 'vecsgardenia.com.tw';
		// var DIR_HOST = 'http://61.220.72.50:9001';
		var DIR_HOST = 'http://localhost';
		var COOKIES_DOMAIN = 'localhost'

		var SHIPPING_FEE = {
			EZSHIP: 60,
			HOME: 90,
			OVERSEAS: 350,
		};

		var FREE_SHIPPING_CONDICTION = {
			EZSHIP: 1200,
			HOME: 1200,
			OVERSEAS: 5000
		};

		var PAYMENT_NAME = {
			store_pay: '超商付現',
			hand_pay: '貨到付款',
			credit_pay: '信用卡'
		};

		var SHIPPING_NAME = {
			ship_to_home: '送貨到府',
			ship_to_overseas: '海外配送',
			ship_to_store: '超商取貨'
		};

		var ORDER_STATUS_def = {
			_created: [54, 55, 57, 58, 60],
			_shipped: [20, 28, 32, 42],
			_received: [21, 29, 34],
			_failed: [10, 50, 51, 52, 53, 56, 59],
			_returned: [45, 46]
		};

		// Public API here
		return {
			DIR_IMAGE_PATH: DIR_IMAGE_PATH,
			DIR_HOST: DIR_HOST,
			COOKIES_DOMAIN: COOKIES_DOMAIN,
			SHIPPING_FEE: SHIPPING_FEE,
			FREE_SHIPPING_CONDICTION: FREE_SHIPPING_CONDICTION,
			PAYMENT_NAME: PAYMENT_NAME,
			SHIPPING_NAME: SHIPPING_NAME,
			ORDER_STATUS_def: ORDER_STATUS_def
		};
	});
