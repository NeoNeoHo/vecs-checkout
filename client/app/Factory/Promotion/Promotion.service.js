'use strict';

angular.module('webApp')
	.factory('Promotion', function ($q, $http) {
		// Service logic
		// ...

		var meaningOfLife = 42;

		var getCoupon = function(couponNum, customer_id) {
			var defer = $q.defer();
			$http.get('/api/coupons/'+couponNum+'/'+customer_id).then(function(data) {
				defer.resolve(data.data);
			}, function(err) {
				defer.reject(err);
			});
			return defer.promise;
		}

		var calcCouponSaved = function(couponNum, customer_id, cart_collection) {
			var defer = $q.defer();
			getCoupon(couponNum, customer_id).then(function(data) {
				var promotion_result = data.status;
				var coupon_type = data.setting.type;
				var discount = data.setting.discount;
				_.forEach(cart_collection.products, function(product_obj) {
					
				});
				defer.resolve(data);
			}, function(err) {
				var promotion_result = err.data;
				defer.reject(err);
			});
			return defer.promise;
		}
		// Public API here
		return {
			someMethod: function () {
				return meaningOfLife;
			},
			getCoupon: getCoupon,
			calcCouponSaved: calcCouponSaved
		};
	});
