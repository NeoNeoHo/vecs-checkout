'use strict';

angular.module('webApp')
	.factory('Shipment', function ($http, $q, $filter, $cookies, Location, Order) {
		// Service logic
		// ...
		var SHIP_TO_HOME_METHOD = '送貨到府';
		var SHIP_TO_HOME_ORDER_STATUS_ID = 51;

		var SHIP_TO_OVERSEAS_METHOD = '海外配送';
		var SHIP_TO_OVERSEAS_ORDER_STATUS_ID = 52;

		var SHIP_TO_EZSHIP_METHOD = '超商取貨';
		var SHIP_TO_EZSHIP_ORDER_STATUS_ID = 50;

		var checkoutToken = $cookies.get('vecs_token');
		
		var setEzshipStore = function(order_id) {
			var url = 'https://map.ezship.com.tw/ezship_map_web.jsp';
			var suID = '?suID=' + $filter('encodeURI')('shipping@vecsgardenia.com');
			var processID = '&processID=' + order_id;
			var rtURL = '&rtURL=' + $filter('encodeURI')('http://61.220.72.50:9001/api/ezships/history/');
			var webPara = '&webPara='+checkoutToken;
			var req_str = url+suID+processID+rtURL+webPara;
			window.location = req_str;
		};

		var getEzshipStore = function(order_id) {
			var defer = $q.defer();
			$http.get('/api/ezships/history/'+order_id).then(function(data) {
				defer.resolve(data.data[0]);
			}, function(err) {
				defer.reject(err);
			});
			return defer.promise;
		};

		var setShipToHome = function(cart, shipping_info, payment_method='超商付現') {
			var defer = $q.defer();
			var promises = [];
			var insert_order_dict = {};
			var address_to_update = {};

			// Ship to Home Parameters
			shipping_info.shipping_method = SHIP_TO_HOME_METHOD;
			shipping_info.order_status_id = SHIP_TO_HOME_ORDER_STATUS_ID;
			shipping_info.shipping_firstname = shipping_info.firstname;
			shipping_info.shipping_lastname = ' ';

			// Two Steps: 1.Update Address. 2.Create Order Correspondent DB Datas  
			promises.push(Location.updateAddress(shipping_info));
			promises.push(Order.createOrder(cart, shipping_info));

			$q.all(promises).then(function(datas) {
				console.log('shipping: "Ship to Home" done !');
				console.log(datas);
				var order_id = datas[1].order_id

				// Shipment Method Should Return "Order Id" For Later Use (Payment Method)
				defer.resolve(order_id);
			}, function(err) {
				console.log(err);
				defer.reject(err);
			});
			return defer.promise;
		};

		var setShipToOverseas = function(cart, shipping_info, payment_method='超商付現') {
			var defer = $q.defer();
			var promises = [];
			var insert_order_dict = {};
			var address_to_update = {};

			// Ship to Overseas Parameters
			shipping_info.shipping_method = SHIP_TO_OVERSEAS_METHOD;
			shipping_info.order_status_id = SHIP_TO_OVERSEAS_ORDER_STATUS_ID;
			shipping_info.shipping_firstname = shipping_info.firstname;
			shipping_info.shipping_lastname = ' ';

			// Two Steps: 1.Update Address. 2.Create Order Correspondent DB Datas 
			promises.push(Location.updateAddress(shipping_info));
			promises.push(Order.createOrder(cart, shipping_info));

			$q.all(promises).then(function(datas) {
				console.log('shipping: "Ship to Overseas" done !');
				var order_id = datas[1].order_id

				// Shipment Method Should Return "Order Id" For Later Use (Payment Method)
				defer.resolve(order_id);
			}, function(err) {
				console.log(err);
				defer.reject(err);
			});
			return defer.promise;
		};

		var postEzshipOrder = function(order_id, order_type) {
			var defer = $q.defer();
			$http.post('/api/ezships/sendOrder/', {order_id: order_id, order_type: order_type}).then(function(data) {
				defer.resolve(data);
			}, function(err) {
				console.log(err);
				defer.reject(err);
			});
			return defer.promise;			
		}

		var setShipToEzship = function(cart, shipping_info, payment_method='超商付現') {
			var defer = $q.defer();
			var promises = [];
			var insert_order_dict = {};
			var address_to_update = {};
			var order_type = (payment_method === '信用卡') ? 3 : 1;

			// Ship to Store Parameters
			shipping_info.shipping_method = SHIP_TO_EZSHIP_METHOD;
			shipping_info.order_status_id = SHIP_TO_EZSHIP_ORDER_STATUS_ID;
			shipping_info.shipping_firstname = shipping_info.firstname;
			shipping_info.shipping_lastname = ' ';
			shipping_info.address = shipping_info.ezship_store_info.stAddr;
			shipping_info.district_d = {
				name: shipping_info.ezship_store_info.stName,
				district_id: 0,
				postcode: ''
			};
			shipping_info.city_d = {
				name: '超商電話: ' + shipping_info.ezship_store_info.stTel,
				zone_id: 0
			};
			shipping_info.country_d = {
				name: shipping_info.ezship_store_info.stCate + shipping_info.ezship_store_info.stCode,
				country_id: 206
			}

			// One Steps: 1.Create Order Correspondent DB Datas  
			promises.push(Order.createOrder(cart, shipping_info));

			$q.all(promises).then(function(datas) {
				var order_id = datas[0].order_id
				postEzshipOrder(order_id, order_type).then(function(ezship_order_status_resp) {
					console.log('shipping: "Ship to Ezship" done !');
					var ezship_order_status = ezship_order_status_resp.data;
					var update_dict = {
						payment_postcode: ezship_order_status.sn_id
					};
					Order.updateOrder(order_id, update_dict).then(function(data) {
						// Shipment Method Should Return "Order Id" For Later Use (Payment Method)
						defer.resolve(order_id);
					}, function(err) {
						defer.reject(err);
					});
				}, function(err) {
					console.log(err);
					defer.reject(err);					
				});
			}, function(err) {
				console.log(err);
				defer.reject(err);
			});
			return defer.promise;
		};

		// Public API here
		return {
			setEzshipStore: setEzshipStore,
			getEzshipStore: getEzshipStore,

			setShipToHome: setShipToHome,
			setShipToOverseas: setShipToOverseas,
			setShipToEzship: setShipToEzship
		};
	});
