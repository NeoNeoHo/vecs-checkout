'use strict';

angular.module('webApp')
	.factory('Location', function ($q, $http) {
		var _country_coll = [];		// [{country_id, name} ...]
		var _city_coll = [];		// [{country_id, cities_coll} ...]
		var _district_coll = [];	// [{city_id, districts_coll} ...]

		// return: [{country_id, name} ...]
		var getCountries = function() {
			var defer = $q.defer();
			if(_.size(_country_coll) > 0) {
				defer.resolve(_country_coll);
			} else {
				$http.get('/api/locations/countries/')
				.then(function(result) {
					_country_coll = result.data;
					defer.resolve(_country_coll);
				}, function(err) {
					defer.reject(err);
				});
			}
			return defer.promise;
		};

		// return: {country_id, cities_coll}
		var getCities = function(country_id) {
			var defer = $q.defer();
			var result_city = _.find(_city_coll, {'country_id' : country_id});
			if(result_city) {
				defer.resolve(result_city);
			} else {
				$http.get('/api/locations/cities/'+country_id)
				.then(function(result) {
					_city_coll.push({
						cities : result.data,
						country_id: country_id
					});
					defer.resolve({
						country_id: country_id,
						cities: result.data
					});
				}, function(err) {
					defer.reject(err);
				});				
			}
			return defer.promise;
		};

		// return: {city_id, districts_coll}
		var getDistricts = function(city_id) {
			var defer = $q.defer();
			var result_district = _.find(_district_coll, {'city_id': city_id});
			if(result_district) {
				defer.resolve(result_district);
			} else {
				$http.get('/api/locations/districts/'+city_id)
				.then(function(result) {
					_district_coll.push({
						districts : result.data,
						city_id : city_id
					});
					defer.resolve({
						districts : result.data,
						city_id : city_id
					});
				}, function(err) {
					defer.reject(err);
				});				
			}
			return defer.promise;
		};

		var getAddress = function() {
			var defer = $q.defer();
			$http.get('/api/locations/customer/')
			.then(function(result) {
				defer.resolve(result.data);
			}, function(err) {
				defer.reject(err);
			});
			return defer.promise;
		};

		var updateAddress = function(shipping_info) {
			var defer = $q.defer();
			var address_to_update = {
				firstname: shipping_info.firstname,
				lastname: '',
				company: shipping_info.company ? shipping_info.company : '',
				company_id: shipping_info.company_id ? shipping_info.company_id : '',
				address_1: shipping_info.address,
				address_2: '',
				country_id: shipping_info.country_id,
				city: '',
				postcode: (shipping_info.district_d) ? shipping_info.district_d.postcode : 0,
				zone_id: shipping_info.city_id,
				telephone: shipping_info.telephone,
				district_id: shipping_info.district_id
			};
			$http.put('/api/locations/address/', {address: address_to_update})
			.then(function(result) {
				console.log('我結束updateAddress');
				defer.resolve(result);
			}, function(err) {
				defer.reject(err);
			});
			return defer.promise;
		};

		// Public API here
		return {
			getCountries: getCountries,
			getCities: getCities,
			getDistricts: getDistricts,
			getAddress: getAddress,
			updateAddress: updateAddress
		};
	});
