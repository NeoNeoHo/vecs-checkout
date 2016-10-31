'use strict';

angular.module('webApp')
	.factory('Cart', function ($q, $http, Config, $cookies, Product, Reward, Promotion) {
		var _cart = {flag: false};
		var _total_price_with_discount = 0;

		var _updateSession = function(cart_products) {
			var defer = $q.defer();
			var update_products = _.map(cart_products, function(product) {
				if(product.key) {
					return {product_key: product.key, quantity: product.quantity};
				} else {
					defer.reject('no product key');
				}
			});
			
			$http.put('/api/carts/session/', {update_products: update_products})
			.then(function(result) {
				defer.resolve(result);
			}, function(err) {
				defer.reject(err);
			});
			return defer.promise;
		};

		// 檢查個別商品是否符合優惠價格，與優惠無關
		var _checkDiscount = function() {
			_cart.products = _.map(_cart.products, function(product) {
				var discounts = product.discount;
				if(_.size(discounts) > 0) {
					var discount_available = _.sortBy(_.filter(discounts, function(discount) {
						return discount.quantity <= product.quantity;
					}), 'quantity');
					product.spot_price = (discount_available.length) ? discount_available[discount_available.length - 1].price : product.price.special_price;
				}
				return product;
			});		
		};

		// 更新個別商品價格以及購物車商品總價，與優惠無關
		var _updateProductTotal = function() {
			_cart.products = _.map(_cart.products, function(product) {
				product.total = (product.spot_price + product.option_price) * product.quantity;
				return product;
			});
			_cart.product_total_price = _.reduce(_cart.products, function(sum, o){return sum+o.total}, 0);
		};

		// 更新Session購物車商品資訊，與優惠無關
		var _updateCartCookiesSession = function() {
			var defer = $q.defer();
			var products = _cart.products;
			products = _.map(products, function(product) {
				return _.pick(product, ['key', 'option', 'product_id', 'quantity', 'href', 'thumb']);
			});
			_updateSession(products).then(function(data) {
				defer.resolve(data);
			}, function(err) {
				defer.reject(err);
			});
			return defer.promise;
		};
		var _getSession = function() {
			var defer = $q.defer();
			$http.get('/api/carts/session/')
			.then(function(result) {
				defer.resolve(result);
			}, function(err) {
				defer.reject(err);
			});
			return defer.promise;
		};
		var _clearCartCookieSession = function() {
			var defer = $q.defer();
			_cart = {flag: false};
			$cookies.remove('vecs_cart', {domain: Config.DIR_COOKIES});
			$cookies.remove('vecs_reward', {domain: Config.DIR_COOKIES});
			$cookies.remove('vecs_coupon', {domain: Config.DIR_COOKIES});
			$cookies.remove('vecs_voucher', {domain: Config.DIR_COOKIES});
			$http.delete('/api/carts/session/').then(function(result) {
				defer.resolve(result);
			}, function(err) {
				defer.reject(err);
			});
			return defer.promise;
		};

		// 更新購物車折扣後價格
		var _updateDiscountPrice = function() {
			_cart.total_price_with_discount = _cart.product_total_price - _cart.discount.coupon.saved_amount - _cart.discount.voucher.saved_amount - _cart.discount.reward.saved_amount;
		};

		// 更新可用紅利點數
		var _updateAvailableReward = function() {
			var total_price_with_discount_wo_reward = _cart.product_total_price - _cart.discount.coupon.saved_amount - _cart.discount.voucher.saved_amount;
			_cart.rewards_available = (total_price_with_discount_wo_reward > _cart.rewards_customer_has_pts) ? _cart.rewards_customer_has_pts : total_price_with_discount_wo_reward;
		};
		var _calcCouponSaved = function() {
			var resp_coupon = Promotion.calcCouponSaved(_cart);
			_cart.discount.coupon = resp_coupon;
			_updateDiscountPrice();
			_updateAvailableReward();
			return _cart;
		};
		var _calcRewardSaved = function(reward_used_pts) {
			var resp_reward = Promotion.calcRewardSaved(reward_used_pts, _cart);
			_cart.discount.reward = resp_reward;
			_updateDiscountPrice();
			_updateAvailableReward();
			return _cart;			
		};
		var _calcVoucherSaved = function() {
			var resp_voucher = Promotion.calcVoucherSaved(_cart);
			_cart.discount.voucher = resp_voucher;
			_updateDiscountPrice();
			_updateAvailableReward();
			return _cart;			
		};
		var get = function() {
			var defer = $q.defer();
			if(_cart.flag == true) {
				if(_.size(_cart.products) == 0) {
					defer.reject();
				} else {
					defer.resolve(_cart);
				}
			} else {
				_getSession().then(function(result) {
					var cart_cookies = result.data.cart;

					var clean_cart_cookies = _.map(cart_cookies, function(lproduct) {
						lproduct.product_id = parseInt(lproduct.product_id);
						return lproduct;
					});
					if(_.size(clean_cart_cookies) == 0) {
						defer.reject();
					}
					_cart = {
						products: clean_cart_cookies,
						product_total_price: _.reduce(cart_cookies, function(sum, o){return sum+o.price*o.quantity}, 0),
						discount: {
							reward: {
								saved_amount: 0,
								name: ''
							},
							coupon: {
								saved_amount: 0,
								name: '',
								id: 0
							},
							voucher: {
								saved_amount: 0,
								name: '',
								id: 0,
								available_amount: 0
							}
						},
						shipment_fee: 0,
					};

					Product.getProductsDetail(_cart.products).then(function(db_products) {
						_cart.products = _.reduce(_cart.products, function(product_detail, product) {
							var db_product = _.find(db_products, {product_id: product.product_id});
							if(db_product) {
								product.price = db_product.price;
								product.discount = db_product.discount || [];
								product.reward = db_product.reward;
								product.model = db_product.model;
								product.maximum = (db_product.maximum > 0) ? _.range(1,db_product.maximum) : _.range(1,20); 
								product.name = db_product.name;
								product.image = db_product.image;
								product.spot_price = product.price.special_price;
								product.option_price = _.reduce(_.pluck(product.option, 'price'), function(sum, num){return sum+num;}, 0);
								
								product.total = (product.spot_price + product.option_price) * product.quantity;
								product_detail.push(product);
							}
							return product_detail;
						}, []);
						updateCartTotal();
						Promotion.getReward().then(function(reward) {
							_cart.rewards_customer_has_pts = (reward.points) ? reward.points : 0;
							_cart.rewards_available = (_cart.total_price_with_discount > _cart.rewards_customer_has_pts) ? _cart.rewards_customer_has_pts : _cart.total_price_with_discount;
							_cart.flag = true;
							defer.resolve(_cart);
						}, function(err) {
							_cart.rewards_customer_has_pts = 0;
							_cart.rewards_available = 0;
							_cart.flag = true;
							defer.resolve(_cart);
						});
					}, function(err) {
						defer.reject(err);
					});
				}, function(err) {
					defer.reject(err);
				});
			}
			return defer.promise;
		};

		var updateCartTotal = function() {
			_checkDiscount();  				// 檢查單品折扣，與優惠無關
			_updateProductTotal();  		// 更新單品價格與購物車商品總價，與優惠無關
			_updateCartCookiesSession();	// 更新Session購物車商品資訊，與優惠無關
			_updateDiscountPrice();			// 更新購物車折扣後價格
			_updateAvailableReward();		// 更新可用紅利點數
			_calcCouponSaved();				// 計算Coupon折價與更新購物車
			return _cart;
		};

		var clear = function() {
			_clearCartCookieSession();
		};

		var removeProduct = function(key='') {
			_cart.products = _.reject(_cart.products, {key: key});
			updateCartTotal();
			return _cart;
		};

		var updateProduct = function(product_key, quantity) {
			var defer = $q.defer();
			_cart.products = _.map(_cart.products, function(product) {
				if(product.key === product_key) {
					product.quantity = quantity;
				}
				return product;
			});
			updateCartTotal();
			return _cart;
		};

		var update = function(update_dict) {
			for(var key in update_dict) {
				_cart[key] = update_dict[key];
			}
			return _cart;
		};

		var getPriceWithDiscount = function() {
			if(_cart.flag == false) {
				return 0;
			} else {
				_total_price_with_discount = _cart.product_total_price - _cart.discount.reward.saved_amount - _cart.discount.coupon.saved_amount;
				return _total_price_with_discount;
			}
		};

		// Public API here
		return {
			get: get,
			update: update,
			updateCartTotal: updateCartTotal,
			clear: clear,
			removeProduct: removeProduct,
			updateProduct: updateProduct,
			calcCouponSaved: _calcCouponSaved,
			calcRewardSaved: _calcRewardSaved,
			calcVoucherSaved: _calcVoucherSaved,
			getPriceWithDiscount: getPriceWithDiscount
		};
	});
