'use strict';

angular.module('webApp')
	.controller('MainController', function ($scope, $anchorScroll , $location, $cookies, $http, $q, User, Auth,  Location, Shipment, Payment, Promotion, Cart, Customer, Reward, Product) {
		var currentUser = Auth.getCurrentUser();
		$scope.allow_amount = _.range(1,10);
		var SHIPMENT_EZSHIP_FEE = 60;
		var SHIPMENT_HOME_FEE = 90;
		var SHIPMENT_OVERSEAS_FEE = 350;
		var FREESHIPPING_FEE = 1200;
		var FREESHIPPING_OVERSEAS_FEE = 5000;

		$scope.checkout_disabled = false;

		$scope.with_shipping_collapsed = false;
		$scope.with_payment_collapsed = true;
		$scope.with_info_collapsed = true;
		$scope.with_memo_collapsed = true;
		$scope.with_voucher_collapsed = true;

		$scope.store_select_text = '選擇超商門市';
		$scope.urlParams = $location.search();
		$scope.to_show_next_process = ($scope.urlParams['showCheckout']) ? $scope.urlParams['showCheckout'] : false;
		$scope.shipping_info = {
			country_id: 206,
			payment_sel_str: null,
			shipment_sel_str: null
		};
		$scope.payment_btn = {
			store_pay: false,
			hand_pay: false,
			credit_pay: false
		};
		$scope.with_city_ready = false;
		$scope.with_district_ready = false;
		var cart_cookies = JSON.parse($cookies.get('vecs_cart'));
		var clean_cart_cookies = _.map(cart_cookies, function(lproduct) {
			lproduct.product_id = parseInt(lproduct.product_id);
			return lproduct;
		});
		$scope.cart = {
			products: clean_cart_cookies,
			product_total_price: _.reduce(cart_cookies, function(sum, o){return sum+o.price*o.quantity}, 0),
			discount: {
				reward: 0,
				coupon: 0,
				voucher: 0
			},
			shipment_fee: 0,
		};


		// #########################  根據購物車的product_id,更新商品資料 ######################
		// #########														   
		// #########															   
		// #################################################################################
		// 取得商品是否有discount的條件
		Product.getProductsDetail($scope.cart.products).then(function(db_products) {
			console.log('@@@@@@@@@');
			$scope.cart.products = _.map($scope.cart.products, function(product) {
				var db_product = _.find(db_products, {product_id: product.product_id});
				if(db_product) {
					product.price = db_product.price;
					product.discount = db_product.discount;
					product.reward = db_product.reward;
					product.model = db_product.model;
					product.name = db_product.name;
					product.spot_price = product.price.special_price;
					product.option_price = _.reduce(_.pluck(product.option, 'price'), function(sum, num){return sum+num;}, 0);
					checkDiscount(product.$$hashKey);
					product.total = (product.spot_price + product.option_price) * product.quantity;
					console.log('total = '+ product.total);
				} else {
					product = {};
				}
				return product;
			});
			$scope.updateCartTotal();
		}, function(err) {
			console.log(err);
		});

		$scope.promotion_list = $scope.cart.products;

		currentUser.$promise.then(function(data) {
			console.log(data);
			$scope.shipping_info.firstname = data.firstname;
			$scope.shipping_info.telephone = data.telephone;
			getAddress();
			$scope.customer = {
				customer_id: data.customer_id,
				customer_group_id: data.customer_group_id,
				address_id: data.address_id,
				email: data.email
			};
			Reward.getFromCustomer(data.customer_id).then(function(reward) {
				$scope.rewards_customer_has_pts = (reward.points) ? reward.points : 0;
			}, function(err) {
				console.log(err.data);
			});
		});
		
		console.log('This is cart: ');
		console.log($scope.cart);

		$scope.goToAnchor = function(anchor) {
			($location.hash() !== anchor) ? $location.hash(anchor) : $anchorScroll();
			return true;
		};

		$scope.proceedNext = function() {
			// $scope.shipping_info.shipment_sel_str = null;
			$scope.shipping_info.payment_sel_str = null;

			$scope.to_show_next_process = true;
			$scope.goToAnchor('checkout_shipping');
			return true;
		};

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
			$cookies.put('vecs_cart', JSON.stringify(products));
		}

		var checkDiscount = function(hash_key) {
			_.map($scope.cart.products, function(product) {
				if(product['$$hashKey'] !== hash_key) return product;

				var discounts = product.discount;
				if(discounts.length > 0) {
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

		$scope.updateCartTotal = function(hash_key='') {
			checkDiscount(hash_key);
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
			Location.getCities(country_id).then(function(result) {
				$scope.city_coll = result.cities;
				$scope.with_city_ready = true;
			}, function(err) {
				console.log(err);
			});
		};

		$scope.setDistricts = function(city_id) {
			$scope.with_district_ready = false;
			Location.getDistricts(city_id).then(function(result) {
				$scope.district_coll = result.districts;
				$scope.with_district_ready = true;
			}, function(err) {
				console.log(err);
			});		
		};

		var getAddress = function() {
			Location.getAddress().then(function(data) {
				if(data) {
					console.log('This is customer address: ');
					console.log(data);
					$scope.shipping_info.city_id = (data.zone_id) ? data.zone_id : 0;
					$scope.setDistricts((data.zone_id) ? data.zone_id : '');

					$scope.shipping_info.country_id = (data.country_id) ? data.country_id : 0;
					$scope.setCities((data.country_id) ? data.country_id : 206);

					$scope.shipping_info.district_id = (data.district_id) ? data.district_id : 0;
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
			$scope.payment_btn.store_pay = (lstrcmp(['超商取貨'], lmethod)) ? true : false;
			$scope.payment_btn.hand_pay = (lstrcmp(['送貨到府'], lmethod)) ? true : false;
			$scope.payment_btn.credit_pay = (lstrcmp(['送貨到府','海外配送', '超商取貨'], lmethod)) ? true : false;

			
			var total_price_with_discount = $scope.cart.product_total_price - $scope.cart.discount.reward - $scope.cart.discount.coupon;
			if(lmethod === '送貨到府') {
				$scope.shipping_info.country_id = 206;
				$scope.setCities(206);
				$scope.cart.shipment_fee = (total_price_with_discount >= FREESHIPPING_FEE) ? 0 : SHIPMENT_HOME_FEE;
			}
			if(lmethod === '超商取貨') {
				$scope.cart.shipment_fee = (total_price_with_discount >= FREESHIPPING_FEE) ? 0 : SHIPMENT_EZSHIP_FEE;
			}
			if(lmethod === '海外配送') {
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
		$scope.getEzshipStore = function(order_id) {
			order_id = order_id ? order_id : 999999999;
			Shipment.getEzshipStore(order_id).then(function(data) {
				console.log('This is ezship store info: ');
				console.log(data);
				$scope.store_select_text = '重新選擇超商';
				$scope.ezship_store_info = data;
				$scope.shipping_info.ezship_store_info = data;
				$scope.shipping_info.shipment_sel_str = '超商取貨';
				$scope.setPaymentMethod('超商取貨');
				$scope.with_shipping_collapsed = false;
			}, function(err) {
				console.log(err);
				$scope.ezship_store_info = null;
			});
		};

		var calcRewardSaved = function(reward_used_pts) {
			if(reward_used_pts <= $scope.cart.product_total_price - $scope.cart.discount.coupon) {
				return reward_used_pts;
			} else {
				return $scope.cart.product_total_price - $scope.cart.discount.coupon;
			}
			
		};

		$scope.calcPriceSaved = function() {
			var defer = $q.defer();
			if($scope.reward_used_pts && $scope.reward_used_pts > 0) {
				$scope.cart.discount.reward = calcRewardSaved($scope.reward_used_pts);
			}
			if($scope.coupon_name) {
				Promotion.calcCouponSaved($scope.coupon_name, $scope.customer.customer_id, $scope.cart).then(function(data) {
					$scope.cart.discount.coupon = data.coupon_saved_amount;
					$scope.cart.discount.coupon_name = $scope.coupon_name;
					$scope.cart.discount.coupon_id = data.coupon_id;
					if(data.coupon_saved_amount == 0) {
						$scope.coupon_name = '';
						alert('您購買的商品並不適用此張優惠券');
					} 
					defer.resolve({data: data.coupon_saved_amount});
				}, function(err) {
					$scope.cart.discount.coupon = 0;
					$scope.coupon_name = '';
					alert(err.data);
					defer.reject(err);
				});	
			}
			else {
				defer.resolve('');
			}
			return defer.promise;
		};

		$scope.applyVoucher = function() {
			var defer = $q.defer();
			if($scope.cart.discount.voucher_name) {
				Promotion.getVoucher($scope.cart.discount.voucher_name).then(function(data) {
					$scope.voucher_available_amount = data.available_amount; 
					var discount_so_far = $scope.cart.discount.reward + $scope.cart.discount.coupon;
					$scope.voucher_max_amount = (data.available_amount >= $scope.cart.product_total_price + $scope.cart.shipment_fee - discount_so_far) ? ($scope.cart.product_total_price + $scope.cart.shipment_fee - discount_so_far) : data.available_amount;
					defer.resolve('')
				}, function(err) {
					alert(err.data);
					defer.reject(err);
				});
			}
			return defer.promise;
		}

		$scope.proceedCheckout = function() {
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
			});

			// Step 3. 檢查優惠內容
			$scope.calcPriceSaved().then(function(data) {}, function(err) {alert(err)}); 
			
			// Step 4. 檢查禮品券內容是否正確
			$scope.applyVoucher().then(function(data) {}, function(err) {alert(err)});

			// Step 5. 根據不同配送 付款方式，產生相對應後送動作
			if(lstrcmp(['送貨到府', '海外配送'], shipment_method)) {
				$scope.shipping_info.country_d = _.find($scope.country_coll, {country_id: $scope.shipping_info.country_id});
				$scope.shipping_info.city_d = _.find($scope.city_coll, {zone_id: $scope.shipping_info.city_id});
				$scope.shipping_info.district_d = _.find($scope.district_coll, {district_id: $scope.shipping_info.district_id});
			}

			if(shipment_method === '送貨到府') { 
				shipping_promise.push(Shipment.setShipToHome($scope.cart, $scope.shipping_info, payment_method));
			} else if(shipment_method === '海外配送') {
				shipping_promise.push(Shipment.setShipToOverseas($scope.cart, $scope.shipping_info, payment_method));
			} else if(shipment_method === '超商取貨') {
				shipping_promise.push(Shipment.setShipToEzship($scope.cart, $scope.shipping_info, payment_method));
			} else {
				alert('沒有配送方式');
			}

			// Step 5-1. 先處理配送方式，回傳訂單編號
			$q.all(shipping_promise).then(function(resp_new_order_id_array) {
				var resp_new_order_id = resp_new_order_id_array[0];
				if(payment_method === '貨到付款') payment_promise.push(Payment.setPayOnDeliver(resp_new_order_id));
				if(payment_method === '超商付現') payment_promise.push(Payment.setPayOnStore(resp_new_order_id));
				if(payment_method === '信用卡') payment_promise.push(Payment.setPayByCreditCard(resp_new_order_id));

				// Step 5-2. 再處理付款方式，回傳訂單狀態與訂單編號
				$q.all(payment_promise).then(function(datas) {
					console.log('完成付款部分: ');
					var checkout_result = datas[0];
					console.log(checkout_result);
					// if(checkout_result.checkout_status == 1) {
						$location.path('/success').search({order_id: checkout_result.order_id}).hash('');
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
	});
