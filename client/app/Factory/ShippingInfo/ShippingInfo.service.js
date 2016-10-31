'use strict';

angular.module('webApp')
	.factory('ShippingInfo', function ($q, $http, $cookies, Location, Customer, Shipment, Config) {
		var _shipping_info = {flag: false};
		var _country_coll = [];		// [{country_id, name} ...]
		var _city_coll = [];		// [{city_id, name} ...]
		var _district_coll = [];	// [{district_id, name} ...]

		var SHIPPING_NAME = Config.SHIPPING_NAME;
		var PAYMENT_NAME = Config.PAYMENT_NAME;

		var _getCities = function(country_id) {
			var defer = $q.defer();
			Location.getCities(country_id).then(function(result) {
				_city_coll = result.cities;
				defer.resolve(_city_coll);
			}, function(err) {
				defer.reject(err);
			});
			return defer.promise;
		};

		var _getDistricts = function(city_id) {
			var defer = $q.defer();
			Location.getDistricts(city_id).then(function(result) {
				_district_coll = result.districts;
				defer.resolve(_district_coll);
			}, function(err) {
				defer.reject(err);
			});
			return defer.promise;
		};

		var _lstrcmp = function(collection, str) {
			var result = _.some(collection, function(data){
				return data.localeCompare(str) == 0;
			});
			return result;
		};

		var setCities = function(country_id) {
			var defer = $q.defer();
			_shipping_info.country_id = country_id;
			if(_.size(_country_coll) > 0) {
				_shipping_info.country_d = _.find(_country_coll, {country_id: _shipping_info.country_id});
			} else {
				_shipping_info.country_d = {country_id: 206, name: '台灣'};
			}
			_getCities(country_id).then(function(city_coll) {
				defer.resolve({shipping_info: _shipping_info, city_coll: city_coll});
			}, function(err) {
				defer.reject(err);
			});
			return defer.promise;
		};

		var setDistricts = function(city_id) {
			var defer = $q.defer();
			_shipping_info.city_id = city_id;
			if(_.size(_city_coll) > 0) {
				_shipping_info.city_d = _.find(_city_coll, {city_id: city_id});
			} else {
				_shipping_info.city_d = {city_id: 0, name: '台北市'};
			}
			_getDistricts(city_id).then(function(district_coll) {
				defer.resolve({shipping_info: _shipping_info, district_coll: district_coll});
			}, function(err) {
				defer.reject(err);
			});
			return defer.promise;
		};

		var setDistrictName = function(district_id) {
			_shipping_info.district_id = district_id;
			if(_.size(_district_coll) > 0) {
				_shipping_info.district_d = _.find(_district_coll, {district_id: district_id});
			}
			return _shipping_info;
		};

		var setCityName = function(city_id) {
			_shipping_info.city_id = city_id;
			if(_.size(_city_coll) > 0){
				_shipping_info.city_d = _.find(_city_coll, {city_id: city_id});
			}
			return _shipping_info;
		};

		var update = function(update_dict) {
			for(var key in update_dict) {
				_shipping_info[key] = update_dict[key];
			}
			$cookies.put('shipping_cookies', JSON.stringify(_shipping_info));
			return _shipping_info;
		};

		var checkShipment = function() {
			var is_shipment_valid = false;
			if(_lstrcmp([SHIPPING_NAME.ship_to_home,SHIPPING_NAME.ship_to_overseas], _shipping_info.shipment_sel_str)) {
				is_shipment_valid = _shipping_info.city_d && _shipping_info.address;
			}
			if(_shipping_info.shipment_sel_str === SHIPPING_NAME.ship_to_store) {
				is_shipment_valid = (_shipping_info.ezship_store_info);
			}
			if(!_.has(_shipping_info,'shipment_fee')) {
				is_shipment_valid = false;
			}
			return is_shipment_valid;
		};

		var checkPayment = function() {
			var is_payment_valid = false;
			switch (_shipping_info.payment_sel_str) {
				case PAYMENT_NAME.store_pay:
					is_payment_valid = (_shipping_info.shipment_sel_str === SHIPPING_NAME.ship_to_store);
					break;
				case PAYMENT_NAME.hand_pay:
					is_payment_valid = (_shipping_info.shipment_sel_str === SHIPPING_NAME.ship_to_home);
					break;
				case PAYMENT_NAME.credit_pay:
					is_payment_valid = _lstrcmp([SHIPPING_NAME.ship_to_home,SHIPPING_NAME.ship_to_overseas,SHIPPING_NAME.ship_to_store], _shipping_info.shipment_sel_str);
					break;
				default:
					is_payment_valid = false;
					break;
			}
			return is_payment_valid;
		};

		var get = function(){
			var defer = $q.defer();
			if(_shipping_info.flag == true) {
				defer.resolve({shipping_info:_shipping_info, city_coll: _city_coll, district_coll: _district_coll});
			} else {
				var shipping_cookies = $cookies.get('shipping_cookies') ? JSON.parse($cookies.get('shipping_cookies')) : null;
				var promises = [];
				promises.push(Customer.getCustomer());
				promises.push(Location.getAddress());
				promises.push(Shipment.getEzshipStore());
				$q.all(promises).then(function(datas) {
					var customer = datas[0];
					var address = datas[1];
					var ezship = datas[2];
					_shipping_info = customer;
					_shipping_info.payment_sel_str = _.has(shipping_cookies,'payment_sel_str') ? shipping_cookies.payment_sel_str : null;
					_shipping_info.shipment_sel_str = _.has(shipping_cookies,'shipment_sel_str') ? shipping_cookies.shipment_sel_str : null;
					_shipping_info.verification = {
						status: '',
						code: ''
					};
					_shipping_info.shipment_fee = 90;
					_shipping_info.ezship_store_info = (ezship.status) ? (ezship) : null;
					_shipping_info.country_id = (address.country_id) ? address.country_id : 206;
					_shipping_info.country_d = {country_id: address.country_id, name: address.country_name};

					_shipping_info.city_id = (address.city_id) ? address.city_id : 0;
					_shipping_info.city_d = {city_id: address.city_id, name: address.city_name};
					

					_shipping_info.district_id = (address.district_id) ? address.district_id : 0;
					_shipping_info.district_d = {district_id: address.district_id, name: address.district_name, postcode: address.postcode};
					_shipping_info.address = address.address_1 ? address.address_1 : '';
					
					var lpromises = [];
					lpromises.push(Location.getCities((address.country_id) ? address.country_id : 206));
					lpromises.push(Location.getDistricts((address.city_id) ? address.city_id : ''));
					lpromises.push(Location.getCountries());
					$q.all(lpromises).then(function(results) {
						_city_coll = results[0].cities;
						_district_coll = results[1].districts;
						_country_coll = results[2];
						_shipping_info.flag = true;
						defer.resolve({shipping_info:_shipping_info, city_coll: _city_coll, district_coll: _district_coll});
					}, function(err) {
						_shipping_info.flag = true;
						defer.resolve({shipping_info:_shipping_info, city_coll: _city_coll, district_coll: _district_coll});
					});
				}, function(err) {
					defer.reject(err);
				});				
			}
			return defer.promise;
		};

		return {
			get: get,
			update: update,
			setCities: setCities,
			setCityName: setCityName,
			setDistricts: setDistricts,
			setDistrictName: setDistrictName,
			checkShipment: checkShipment,
			checkPayment: checkPayment
		};
	});
