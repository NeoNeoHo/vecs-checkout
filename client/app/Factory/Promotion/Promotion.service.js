'use strict';

angular.module('webApp')
	.factory('Promotion', function ($q, $http, Reward) {
		// Service logic
		// ...

		var _coupon = '';
		var _voucher = '';
		var _reward = '';
		var _calcCouponSaved = function(cart) {
			if(_coupon.status == false) {
				alert('沒有此一折扣碼，或此折扣碼已過期');
				return {saved_amount: 0, name: '', id: 0};
			} else if(_coupon.status != true) {
				// alert(_coupon.status);
				return {saved_amount: 0, name: '', id: 0};
			}
			var resolve_data = {
				promotion_total: 0
			};
			var _categories_to_products_coll = _coupon.categories_to_products;
			var _products_coll = _coupon.products;
			var _qualified_products_coll = _.union(_categories_to_products_coll, _products_coll);
			var _discount_fee = _coupon.setting.discount;   // discount: for type F -> amount to discount; for type P -> amount of pct to discount
			var _discount_type = _coupon.setting.type;  // type: F -> fix; P -> percentage
			var _coupon_saved_amount = 0;
			var _qualified_total = _coupon.setting.total || 0;

			// Check If Coupon Content Has Weird Discount
			if(_discount_type === 'P' && _discount_fee >= 60) {
				var lerr = {status: false, data: '此折扣碼優惠折扣異常，請洽客服02-23623827！！'};
				return {saved_amount: 0, name: '', id: 0};
			}

			// Check if cart total is qualified for this coupon to apply
			if(cart.product_total_price >=  _qualified_total) {
				// Directly Apply Coupon If No Any Category or Product Limitation
				// Or
				// Apply to those qualified Products
				if(_qualified_products_coll.length === 0) {
					_coupon_saved_amount = (_discount_type === 'F') ? _discount_fee : Math.round(cart.product_total_price * _discount_fee / 100);
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
			} else {
				alert('此折扣碼需購物滿'+_qualified_total+'元，才可使用!!');
				return {saved_amount: 0, name: '', id: 0};
			}
			resolve_data = {
				saved_amount: _coupon_saved_amount,
				name: _coupon.setting.code,
				coupon_id: _coupon.setting.coupon_id
			};
			return resolve_data;
		};

		var getCoupon = function(couponNum) {
			var defer = $q.defer();
			if(_coupon !== '') {
				if(_coupon.setting.code == couponNum) {
					defer.resolve(_coupon);
				}
			}
			$http.get('/api/coupons/'+couponNum).then(function(data) {
				_coupon = data.data;
				defer.resolve(data.data);
			}, function(err) {
				_coupon = '';
				alert(err.data.data);
				defer.resolve(err.data);
			});
			return defer.promise;
		};

		var removeCoupon = function() {
			_coupon = '';
			return 0;
		};

		var getReward = function() {
			var defer = $q.defer();
			if(_reward !== '') {
				defer.resolve(_reward);
			}
			Reward.getFromCustomer().then(function(reward) {
				_reward = reward;
				defer.resolve(_reward);
			}, function(err) {
				_reward  = {points: 0};
				defer.resolve(_reward);
			});
			return defer.promise;
		};

		var calcRewardSaved = function(reward_used_pts, cart) {
			console.log(reward_used_pts);
			if(reward_used_pts <= 0) {
				return {saved_amount: 0, name: ''};
			} else {
				var rewards = (_reward.points) ? _reward.points : 0;
				if(reward_used_pts > rewards){
					alert('您並無這麼多的紅利點數喔');
					return {saved_amount: 0, name: ''};
				} else {
					if(reward_used_pts <= cart.product_total_price - cart.discount.coupon.saved_amount - cart.discount.voucher.saved_amount) {
						return {saved_amount: reward_used_pts, name: reward_used_pts};
					} else {
						return {saved_amount: cart.product_total_price - cart.discount.coupon.saved_amount - cart.discount.voucher.saved_amount, name: cart.product_total_price - cart.discount.coupon.saved_amount - cart.discount.voucher.saved_amount};
					}
				}
			}
		};

		var getVoucher = function(voucher_name) {
			var defer = $q.defer();
			if(_voucher !== '') {
				if(_voucher.code == voucher_name) {
					defer.resolve(_voucher);
				}
			}
			$http.get('/api/vouchers/'+voucher_name).then(function(data) {
				_voucher = data.data;
				defer.resolve(data.data);
			}, function(err) {
				_voucher = '';
				defer.reject(err);
			});
			return defer.promise;
		};

		var calcVoucherSaved = function(cart) {
			if(_voucher.status == false) {
				alert('查無此禮品券，請撥打客服專線 02-23623827詢問');
				return {saved_amount: 0, name: '', available_amount: 0, id: 0};
			}
			if(_voucher.available_amount <= 0) {
				alert(_voucher.code + ' 禮品券已無現金點數');
				return {saved_amount: 0, name: '', available_amount: 0, id: 0};
			} else {
				var available_amount = _voucher.available_amount; 
				var voucher_max_amount = (available_amount >= cart.total_price_with_discount) ? (cart.total_price_with_discount) : available_amount;
				return {saved_amount: voucher_max_amount, name: _voucher.code, available_amount: available_amount, id: _voucher.voucher_id};
			}
		};

		var getModule = function(server, code) {
			var defer = $q.defer();
			$http.get('/api/dbModules/getModule/'+server+'/'+code).then(function(data) {
				defer.resolve(data.data);
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
			getReward: getReward,
			getVoucher: getVoucher,
			calcCouponSaved: _calcCouponSaved,
			calcRewardSaved: calcRewardSaved,
			calcVoucherSaved: calcVoucherSaved,
			getModule: getModule,
			removeCoupon: removeCoupon
		};
	});
