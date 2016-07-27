'use strict';

angular.module('webApp')
	.factory('Promotion', function ($q, $http) {
		// Service logic
		// ...

		var meaningOfLife = 42;

		var getVoucher = function(voucher_name) {
			var defer = $q.defer();
			$http.get('/api/vouchers/'+voucher_name).then(function(data) {
				defer.resolve(data.data);
			}, function(err) {
				defer.reject(err);
			});
			return defer.promise;
		};

		var getCoupon = function(couponNum) {
			var defer = $q.defer();
			$http.get('/api/coupons/'+couponNum).then(function(data) {
				defer.resolve(data.data);
			}, function(err) {
				defer.reject(err.data);
			});
			return defer.promise;
		}

		var calcCouponSaved = function(couponNum, cart) {
			var defer = $q.defer();
			getCoupon(couponNum).then(function(data) {
				var resolve_data = {
					promotion_total: 0
				};
				var _categories_to_products_coll = data.categories_to_products;
				var _products_coll = data.products;
				var _qualified_products_coll = _.union(_categories_to_products_coll, _products_coll);
				var _discount_fee = data.setting.discount;   // discount: for type F -> amount to discount; for type P -> amount of pct to discount
				var _discount_type = data.setting.type;  // type: F -> fix; P -> percentage
				var _coupon_saved_amount = 0;

				// Check If Coupon Content Has Weird Discount
				if(_discount_type === 'P' && _discount_fee >= 60) {
					var lerr = {status: 500, data: '此折購碼優惠折扣異常，請洽客服02-23623827！！'};
					defer.reject(lerr);
				}

				// Directly Apply Coupon If No Any Category or Product Limitation
				// Or
				// Apply to those qualified Products
				if(_qualified_products_coll.length === 0) {
					_coupon_saved_amount = (_discount_type === 'F') ? _discount_fee : Math.round(cart.product_total * _discount_fee / 100);
				} else {
					_coupon_saved_amount = _.reduce(cart.products, function(lcoupon_saved_amount, lproduct) {
						if(_.find(_qualified_products_coll, {'product_id': lproduct.product_id})) {
							lcoupon_saved_amount += (_discount_type === 'P') ? Math.round(lproduct.total * _discount_fee / 100) : -1;  // '-1' is a trick for type F discount
						}
						return lcoupon_saved_amount;
					}, 0);
					if(_discount_type === 'F' && _coupon_saved_amount < 0) {
						_coupon_saved_amount = _discount_fee;
					}
				}
				resolve_data = {
					coupon_saved_amount: _coupon_saved_amount,
					coupon_id: data.setting.coupon_id
				};

				defer.resolve(resolve_data);

			}, function(err) {
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
			calcCouponSaved: calcCouponSaved,
			getVoucher: getVoucher
		};
	});
