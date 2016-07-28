'use strict';

angular.module('webApp')
	.controller('CheckoutController', function ($rootScope, $scope, $window, $state, $document, $location, $cookies, $sce, $http, $q, User, Auth,  Location, Shipment, Payment, Promotion, Cart, Customer, Reward, Product, Config) {
		$rootScope.$state = $state;
		$rootScope.$on('$stateChangeSuccess', function() {
   		var someElement = angular.element(document.getElementById('form-container'));
    	$document.scrollToElementAnimated(someElement, 0, 800);
		});

		$scope.currentUser = $scope.currentUser || Auth.getCurrentUser();
		$scope.allow_amount = $scope.allow_amount || _.range(1,10);
		var SHIPMENT_EZSHIP_FEE = Config.SHIPPING_FEE.EZSHIP;
		var SHIPMENT_HOME_FEE = Config.SHIPPING_FEE.HOME;
		var SHIPMENT_OVERSEAS_FEE = Config.SHIPPING_FEE.OVERSEAS;
		var FREESHIPPING_FEE = Config.FREE_SHIPPING_CONDICTION.EZSHIP;
		var FREESHIPPING_OVERSEAS_FEE = Config.FREE_SHIPPING_CONDICTION.OVERSEAS;

		var SHIPPING_NAME = Config.SHIPPING_NAME;
		var PAYMENT_NAME = Config.PAYMENT_NAME;
		$scope.SHIPPING_NAME = SHIPPING_NAME;
		$scope.PAYMENT_NAME = PAYMENT_NAME;
		$scope.is_address_valid = $scope.is_address_valid || true;



		$scope.checkout_first_step = function() {
			$state.go('checkout.product_check');
		};
		$scope.checkout_second_step = function() {
			if($scope.checkout_form.$valid){
				$state.go('checkout.shipment_payment');
			} else {
				console.log($scope.checkout_form.$valid);
			}
		};
		$scope.checkout_third_step = function() {
			if(lstrcmp([SHIPPING_NAME.ship_to_home,SHIPPING_NAME.ship_to_overseas], $scope.shipping_info.shipment_sel_str)) {
				$scope.is_address_valid = $scope.shipping_info.city_d && $scope.shipping_info.address;
			}
			if($scope.shipping_info.shipment_sel_str === SHIPPING_NAME.ship_to_store) {
				$scope.is_address_valid = $scope.shipping_info.ezship_store_info;
			}
			if($scope.checkout_form.$valid && $scope.is_address_valid){
				$state.go('checkout.final_confirm');
			} else {
				$scope.is_address_valid = false;
				console.log($scope.checkout_form.$valid);
			}
		};

		$scope.checkout_disabled = false;
		$scope.with_memo_collapsed = true;
		$scope.rewards_customer_has_pts = $scope.rewards_customer_has_pts || '';

		$scope.store_select_text = '選擇超商門市';

		$scope.shipping_info = $scope.shipping_info || {
			firstname: '',
			telephone: '',
			country_id: 206,
			payment_sel_str: null,
			shipment_sel_str: null
		};
		$scope.payment_btn = {
			store_pay: true,
			hand_pay: true,
			credit_pay: true
		};
		$scope.with_city_ready = false;
		$scope.with_district_ready = false;
		if(!$cookies.get('vecs_cart')) {
			console.log('redirect to host');
			window.location.href = 'http://' + Config.COOKIES_DOMAIN;
		}
		var cart_cookies = JSON.parse($cookies.get('vecs_cart'));
		var clean_cart_cookies = _.map(cart_cookies, function(lproduct) {
			lproduct.product_id = parseInt(lproduct.product_id);
			return lproduct;
		});
		$scope.cart = $scope.cart || {
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

		$scope.discount_temp = $scope.discount_temp || {
			coupon_name: '',
			reward_points: '',
			voucher_name: ''
		};
		// #########################  根據購物車的product_id,更新商品資料 ######################
		// #########														   
		// #########															   
		// #################################################################################
		// 取得商品是否有discount的條件
		if(_.size($scope.cart.products) > 0 && !$scope.cart.products[0].spot_price) {
			Product.getProductsDetail($scope.cart.products).then(function(db_products) {
				$scope.cart.products = _.map($scope.cart.products, function(product) {
					var db_product = _.find(db_products, {product_id: product.product_id});
					if(db_product) {
						product.price = db_product.price;
						product.discount = db_product.discount || [];
						product.reward = db_product.reward;
						product.model = db_product.model;
						product.name = db_product.name;
						product.spot_price = product.price.special_price;
						product.option_price = _.reduce(_.pluck(product.option, 'price'), function(sum, num){return sum+num;}, 0);
						checkDiscount(product.product_id);
						product.total = (product.spot_price + product.option_price) * product.quantity;
					} else {
						product = {};
					}
					return product;
				});
				$scope.updateCartTotal();
			}, function(err) {
				console.log(err);
			});
		}

		$scope.currentUser.$promise.then(function(data) {
			$scope.shipping_info.firstname = $scope.shipping_info.firstname || data.firstname;
			$scope.shipping_info.telephone = $scope.shipping_info.telephone || data.telephone;
			if(!$scope.shipping_info.address) {getAddress();}
			if(!$scope.rewards_customer_has_pts) {
				Reward.getFromCustomer().then(function(reward) {
					$scope.rewards_customer_has_pts = (reward.points) ? reward.points : 0;
				}, function(err) {
					console.log(err.data);
				});
			}
		});
		
		console.log('This is cart: ');
		console.log($scope.cart);

		var lstrcmp = function(collection, str) {
			var result = _.some(collection, function(data){
				return data.localeCompare(str) == 0;
			});
			return result;
		}

		var updateCartCookies = function(products) {
			products = _.map(products, function(product) {
				return _.pick(product, ['$$hashKey', 'option', 'product_id', 'quantity', 'href', 'thumb']);
			});
			$cookies.put('vecs_cart', JSON.stringify(products), {domain: Config.COOKIES_DOMAIN});
		}

		var checkDiscount = function(product_id) {
			_.map($scope.cart.products, function(product) {
				if(product.product_id !== product_id) return product;
				var discounts = product.discount;
				if(_.size(discounts) > 0) {
					var discount_available = _.sortBy(_.filter(discounts, function(discount) {
						return discount.quantity <= product.quantity;
					}), 'quantity');
					product.spot_price = (discount_available.length) ? discount_available[discount_available.length - 1].price : product.price.special_price;
				}
				return product;
			});
			return 0;		
		};

		var updateProductTotal = function() {
			_.map($scope.cart.products, function(product) {
				product.total = (product.spot_price + product.option_price) * product.quantity;
				return product;
			});
			return 0;
		};

		$scope.updateCartTotal = function(product_id) {
			checkDiscount(product_id);
			updateProductTotal();
			$scope.cart.product_total_price = _.reduce($scope.cart.products, function(sum, o){return sum+o.total}, 0);
			updateCartCookies($scope.cart.products);
			return true;
		};

		$scope.removeProduct = function(hash_key='') {
			$scope.cart.products = _.reject($scope.cart.products, {$$hashKey: hash_key});
			$scope.updateCartTotal();
			updateCartCookies($scope.cart.products);
			return true;
		};

		$scope.setEzshipStore = function(order_id) {
			order_id = order_id ? order_id : 999999999;
			Shipment.setEzshipStore(order_id);
		};

		$scope.setCities = function(country_id) {
			$scope.with_city_ready = false;
			if($scope.country_coll) {
				$scope.shipping_info.country_d = _.find($scope.country_coll, {country_id: $scope.shipping_info.country_id});
			}
			Location.getCities(country_id).then(function(result) {
				$scope.city_coll = result.cities;
				$scope.with_city_ready = true;
			}, function(err) {
				console.log(err);
			});
		};

		$scope.setDistricts = function(city_id) {
			$scope.with_district_ready = false;
			if($scope.city_coll){
				$scope.shipping_info.city_d = _.find($scope.city_coll, {zone_id: city_id});
			}
			Location.getDistricts(city_id).then(function(result) {
				$scope.district_coll = result.districts;
				$scope.with_district_ready = true;
			}, function(err) {
				console.log(err);
			});		
		};

		$scope.setDistrictName = function(district_id) {
			if($scope.district_coll) {
				$scope.shipping_info.district_d = _.find($scope.district_coll, {district_id: district_id});
			}
		};

		$scope.setCityName = function(city_id) {
			if($scope.city_coll){
				$scope.shipping_info.city_d = _.find($scope.city_coll, {zone_id: city_id});
			}
		};

		var getAddress = function() {
			Location.getAddress().then(function(data) {
				if(data) {
					console.log('This is customer address: ');
					console.log(data);
					$scope.shipping_info.city_id = (data.zone_id) ? data.zone_id : 0;
					$scope.shipping_info.city_d = {zone_id: data.zone_id, name: data.city_name};
					$scope.setDistricts((data.zone_id) ? data.zone_id : '');

					$scope.shipping_info.country_id = (data.country_id) ? data.country_id : 0;
					$scope.shipping_info.country_d = {country_id: data.country_id, name: data.country_name};
					$scope.setCities((data.country_id) ? data.country_id : 206);

					$scope.shipping_info.district_id = (data.district_id) ? data.district_id : 0;
					$scope.shipping_info.district_d = {district_id: data.district_id, name: data.district_name, postcode: data.postcode};
					$scope.shipping_info.address = data.address_1 ? data.address_1 : '';
				}
			});
		};

		$scope.setPaymentMethod = function(lmethod) {
			$scope.shipping_info.shipment_sel_str = lmethod;
			$scope.with_shipping_collapsed = true;
			$scope.with_payment_collapsed = false;
			$scope.shipping_info.payment_sel_str = null;
			$scope.shipping_info.country_id = 206;
			$scope.payment_btn.store_pay = (lstrcmp([SHIPPING_NAME.ship_to_store], lmethod)) ? true : false;
			$scope.payment_btn.hand_pay = (lstrcmp([SHIPPING_NAME.ship_to_home], lmethod)) ? true : false;
			$scope.payment_btn.credit_pay = (lstrcmp([SHIPPING_NAME.ship_to_home,SHIPPING_NAME.ship_to_overseas, SHIPPING_NAME.ship_to_store], lmethod)) ? true : false;

			
			var total_price_with_discount = $scope.cart.product_total_price - $scope.cart.discount.reward.saved_amount - $scope.cart.discount.coupon.saved_amount;
			if(lmethod === SHIPPING_NAME.ship_to_home) {
				$scope.shipping_info.country_id = 206;
				$scope.setCities(206);
				$scope.cart.shipment_fee = (total_price_with_discount >= FREESHIPPING_FEE) ? 0 : SHIPMENT_HOME_FEE;
			}
			if(lmethod === SHIPPING_NAME.ship_to_store) {
				$scope.cart.shipment_fee = (total_price_with_discount >= FREESHIPPING_FEE) ? 0 : SHIPMENT_EZSHIP_FEE;
			}
			if(lmethod === SHIPPING_NAME.ship_to_overseas) {
				$scope.cart.shipment_fee = (total_price_with_discount >= FREESHIPPING_OVERSEAS_FEE) ? 0 : SHIPMENT_OVERSEAS_FEE;
				Location.getCountries().then(function(result) {
					$scope.country_coll = result;
					$scope.with_city_ready = false;
				}, function(err) {
					console.log(err);
				});
			}
			$scope.shipping_info.shipment_fee = $scope.cart.shipment_fee;
		};
		$scope.getEzshipStore = function() {
			Shipment.getEzshipStore().then(function(data) {
				console.log('This is ezship store info: ');
				$scope.store_select_text = '重新選擇超商';
				$scope.ezship_store_info = data;
				$scope.shipping_info.ezship_store_info = data;
				// $scope.shipping_info.shipment_sel_str = $scope.shipping_info.shipment_sel_str || SHIPPING_NAME.ship_to_store;
				// $scope.setPaymentMethod(SHIPPING_NAME.ship_to_store);
			}, function(err) {
				console.log(err);
				$scope.ezship_store_info = null;
			});
		};

		var calcRewardSaved = function(reward_used_pts, cart) {
			var defer = $q.defer();
			if(reward_used_pts <= 0) {
				defer.resolve({saved_amount: 0, name: ''});
			} else {
				Reward.getFromCustomer().then(function(reward) {
					var rewards = (reward.points) ? reward.points : 0;
					if(reward_used_pts > rewards){
						defer.reject('您並無這麼多的紅利點數喔');
					} else {
						if(reward_used_pts <= cart.product_total_price - cart.discount.coupon.saved_amount) {
							defer.resolve({saved_amount: reward_used_pts, name: ''});
						} else {
							defer.resolve({saved_amount: cart.product_total_price - cart.discount.coupon.saved_amount, name: ''});
						}
					}
				}, function(err) {
					defer.reject(err);
				});
			}
			return defer.promise;
		};

		var calcVoucherSaved = function(voucher_name, cart) {
			var defer = $q.defer();
			if(voucher_name === '') {
				defer.resolve({saved_amount: 0, name: ''});
			} else {
				Promotion.getVoucher(voucher_name).then(function(data) {
					var available_amount = data.available_amount; 
					var discount_so_far = cart.discount.reward.saved_amount + cart.discount.coupon.saved_amount;
					var voucher_max_amount = (available_amount >= cart.product_total_price - discount_so_far) ? (cart.product_total_price - discount_so_far) : available_amount;
					defer.resolve({saved_amount: voucher_max_amount, name: voucher_name, available_amount: available_amount, id: data.voucher_id})
				}, function(err) {
					alert(err.data);
					defer.reject(err);
				});
			}
			return defer.promise;
		};

		var calcCouponSaved = function(coupon_name, cart) {
			var defer = $q.defer();
			if(coupon_name === '') {
				defer.resolve({saved_amount: 0, name: '', id: 0});
			} else {
				Promotion.calcCouponSaved(coupon_name, cart).then(function(data) {
					if(data.coupon_saved_amount == 0) {
						defer.reject('您購買的商品並不適用此張優惠券');
					} else {
						defer.resolve({saved_amount: data.coupon_saved_amount, name: coupon_name, id: data.coupon_id});
					}
				}, function(err) {
					defer.reject(err);
				});
			}
			return defer.promise;
		};

		$scope.calcPriceSaved = function() {
			console.log('calcPriceSaved')
			var defer = $q.defer();
			calcRewardSaved($scope.discount_temp.reward_points, $scope.cart).then(function(resp_reward) {
				$scope.cart.discount.reward = resp_reward;

				calcCouponSaved($scope.discount_temp.coupon_name, $scope.cart).then(function(resp_coupon) {
					$scope.cart.discount.coupon = resp_coupon;

					calcVoucherSaved($scope.discount_temp.voucher_name, $scope.cart).then(function(resp_voucher) {
						$scope.cart.discount.voucher = resp_voucher;
						defer.resolve();
					}, function(err) {
						alert(err);
						$scope.discount_temp.voucher_name = '';
						defer.reject(err);
					});

				}, function(err) {
					console.log(err);
					alert(err);
					$scope.discount_temp.coupon_name = '';
					defer.reject(err);
				});

			}, function(err) {
				alert(err);
				defer.reject(err);
			});

			return defer.promise;
		};

		$scope.proceedCheckout = function() {
			if($scope.checkout_form.$invalid) {
				alert('請檢查結帳資訊，謝謝');
				$scope.checkout_second_step();
				return 0;
			}
			$scope.checkout_disabled = true;

			var shipping_promise = [];
			var payment_promise = [];
			var shipment_method = $scope.shipping_info.shipment_sel_str;
			var payment_method = $scope.shipping_info.payment_sel_str;
			var customer_to_update = {
				firstname: $scope.shipping_info.firstname,
				lastname: '',
				telephone: $scope.shipping_info.telephone
			};

			// Step 1. 更新用戶資料
			Customer.updateCustomer(customer_to_update).then(function(result) {}, function(err){console.log(err);});
			
			// Step 2. 檢查商品資訊是否有被篡改 
			Product.validateProducts($scope.cart.products).then(function(data) {
				console.log(data);
			}, function(err) {
				console.log(err);
				alert('商品價格及紅利點數有異，請洽客服人員，並將客服代碼『1201』告知客服人員，謝謝');
				$scope.checkout_first_step();
				return 0;
			});

			// Step 3. 檢查優惠內容與禮品券內容
			$scope.calcPriceSaved().then(function(data) {}, function(err) {alert(err)}); 
			

			// Step 5. 根據不同配送 付款方式，產生相對應後送動作
			if(lstrcmp([SHIPPING_NAME.ship_to_home, SHIPPING_NAME.ship_to_overseas], shipment_method)) {
				$scope.shipping_info.country_d = _.find($scope.country_coll, {country_id: $scope.shipping_info.country_id});
				$scope.shipping_info.city_d = _.find($scope.city_coll, {zone_id: $scope.shipping_info.city_id});
				$scope.shipping_info.district_d = _.find($scope.district_coll, {district_id: $scope.shipping_info.district_id});
			}

			if(shipment_method === SHIPPING_NAME.ship_to_home) { 
				shipping_promise.push(Shipment.setShipToHome($scope.cart, $scope.shipping_info, payment_method));
			} else if(shipment_method === SHIPPING_NAME.ship_to_overseas) {
				shipping_promise.push(Shipment.setShipToOverseas($scope.cart, $scope.shipping_info, payment_method));
			} else if(shipment_method === SHIPPING_NAME.ship_to_store) {
				shipping_promise.push(Shipment.setShipToEzship($scope.cart, $scope.shipping_info, payment_method));
			} else {
				alert('沒有配送方式');
				$scope.checkout_second_step();
				return 0;
			}

			// Step 5-1. 先處理配送方式，回傳訂單編號
			$q.all(shipping_promise).then(function(resp_new_order_id_array) {
				var resp_new_order_id = resp_new_order_id_array[0];
				if(payment_method === PAYMENT_NAME.hand_pay) payment_promise.push(Payment.setPayOnDeliver(resp_new_order_id));
				if(payment_method === PAYMENT_NAME.store_pay) payment_promise.push(Payment.setPayOnStore(resp_new_order_id));
				if(payment_method === PAYMENT_NAME.credit_pay) payment_promise.push(Payment.setPayByCreditCard(resp_new_order_id));

				// Step 5-2. 再處理付款方式，回傳訂單狀態與訂單編號
				$q.all(payment_promise).then(function(datas) {
					console.log('完成付款部分: ');
					var checkout_result = datas[0];
					console.log(checkout_result);
					// if(checkout_result.checkout_status == 1) {
						$location.path('/checkout/success').search({order_id: checkout_result.order_id}).hash('');
					// }
				}, function(err) {
					console.log('完成付款部分: ' + err);
				});
			}, function(err) {
				console.log(err);
			});


			Cart.updateCart($scope.cart.products).then(function(result) {}, function(err) {console.log(err)});
			console.log($scope.shipping_info);
		};
		$scope.getEzshipStore();
		if($window.innerWidth <= 768){
			$scope.form_action = $sce.trustAsResourceUrl("https://sslpayment.uwccb.com.tw/EPOSService/Payment/Mobile/OrderInitial.aspx");
		} else {
			$scope.form_action = $sce.trustAsResourceUrl("https://sslpayment.uwccb.com.tw/EPOSService/Payment/OrderInitial.aspx");
		}

		var searchUrlObject = $location.search();
		console.log('url params');
		console.log(searchUrlObject);
		if(_.has(searchUrlObject, 'shipment') && searchUrlObject.shipment == 'ship_to_store') {
			$scope.cart.shipment_sel_str = SHIPPING_NAME.ship_to_store;
			$scope.setPaymentMethod(SHIPPING_NAME.ship_to_store);
		}
	});
