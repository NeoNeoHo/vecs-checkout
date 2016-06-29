'use strict';

angular.module('webApp')
	.controller('MainController', function ($scope, $anchorScroll , $location, $cookies, $http, $q, User, Auth,  Location, Shipment, Promotion, Cart, Customer, Reward, Product) {
		var currentUser = Auth.getCurrentUser();
		$scope.allow_amount = _.range(1,10);
		var SHIPMENT_EZSHIP_FEE = 60;
		var SHIPMENT_HOME_FEE = 90;
		var SHIPMENT_OVERSEAS_FEE = 350;
		var FREESHIPPING_FEE = 1200;
		var FREESHIPPING_OVERSEAS_FEE = 5000;

		$scope.with_shipping_collapsed = false;
		$scope.with_payment_collapsed = true;
		$scope.with_info_collapsed = true;
		$scope.with_memo_collapsed = true;

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
			product_total_price: _.reduce(cart_cookies, function(sum, o){return sum+o.total}, 0),
			discount: {
				reward: 0,
				coupon: 0,
				voucher: 0
			},
			shipment_fee: 0,
		};
		
		$scope.promotion_list = $scope.cart.products;

		currentUser.$promise.then(function(data) {
			console.log(data);
			$scope.shipping_info.firstname = data.firstname;
			$scope.shipping_info.telephone = data.telephone;
			getAddress(data.customer_id, data.address_id);
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
			$scope.shipping_info.shipment_sel_str = null;
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

		$scope.updateProductTotal = function() {
			$scope.cart.product_total_price = _.reduce($scope.cart.products, function(sum, o){return sum+o.price*o.quantity}, 0);
			$cookies.put('vecs_cart', JSON.stringify($scope.cart.products));
			return true;
		};

		$scope.removeProduct = function(lmodel) {
			$scope.cart.products = _.reject($scope.cart.products, {model: lmodel});
			$scope.updateProductTotal();
			$cookies.put('vecs_cart', JSON.stringify($scope.cart.products));
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

		var getAddress = function(customer_id, address_id) {
			Location.getAddress(customer_id, address_id).then(function(data) {
				if(data) {
					console.log('This is customer address: ');
					console.log(data);
					$scope.shipping_info.city_id = (data.zone_id) ? data.zone_id : '';
					$scope.setDistricts((data.zone_id) ? data.zone_id : '');

					$scope.shipping_info.country_id = (data.country_id) ? data.country_id : '';
					$scope.setCities((data.country_id) ? data.country_id : 206);

					$scope.shipping_info.district_id = (data.district_id) ? data.district_id : '';
					$scope.shipping_info.address = data.address_1 ? data.address_1 : '';
				}
			});
		};

		$scope.setPaymentMethod = function(lmethod) {
			$scope.with_shipping_collapsed = true;
			$scope.with_payment_collapsed = false;
			console.log($scope.shipping_info.shipment_sel_str);
			$scope.shipping_info.payment_sel_str = null;
			$scope.shipping_info.country_id = 206;
			$scope.payment_btn.store_pay = (lstrcmp(['shipToStore'], lmethod)) ? true : false;
			$scope.payment_btn.hand_pay = (lstrcmp(['shipToHome'], lmethod)) ? true : false;
			$scope.payment_btn.credit_pay = (lstrcmp(['shipToHome','shipToOverseas', 'shipToStore'], lmethod)) ? true : false;
			$scope.payment_btn.voucher_pay = (lstrcmp(['shipToStore', 'shipToHome'], lmethod)) ? true : false;
			var total_price_with_discount = $scope.cart.product_total_price - $scope.cart.discount.reward - $scope.cart.discount.coupon;
			if(lmethod === 'shipToHome') {
				$scope.shipping_info.country_id = 206;
				$scope.setCities(206);
				$scope.cart.shipment_fee = (total_price_with_discount >= FREESHIPPING_FEE) ? 0 : SHIPMENT_HOME_FEE;
			}
			if(lmethod === 'shipToStore') {
				$scope.cart.shipment_fee = (total_price_with_discount >= FREESHIPPING_FEE) ? 0 : SHIPMENT_EZSHIP_FEE;
			}
			if(lmethod === 'shipToOverseas') {
				$scope.cart.shipment_fee = (total_price_with_discount >= FREESHIPPING_OVERSEAS_FEE) ? 0 : SHIPMENT_OVERSEAS_FEE;
				Location.getCountries().then(function(result) {
					$scope.country_coll = result;
					$scope.with_city_ready = false;
				}, function(err) {
					console.log(err);
				});
			}
		};
		$scope.getEzshipStore = function(order_id) {
			order_id = order_id ? order_id : 999999999;
			Shipment.getEzshipStore(order_id).then(function(data) {
				console.log('This is ezship store info: ');
				console.log(data);
				$scope.store_select_text = '重新選擇超商';
				$scope.ezship_store_info = data;
				$scope.shipping_info.ezship_store_info = data;
				$scope.shipping_info.shipment_sel_str = 'shipToStore';
				$scope.setPaymentMethod('shipToStore');
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
			if($scope.voucher_name) {
				Promotion.getVoucher($scope.voucher_name).then(function(data) {
					console.log(data.available_amount);
					$scope.voucher_available_amount = data.available_amount; 
					var discount_so_far = $scope.cart.discount.reward + $scope.cart.discount.coupon;
					$scope.cart.discount.voucher = (data.available_amount >= $scope.cart.product_total_price + $scope.cart.shipment_fee - discount_so_far) ? ($scope.cart.product_total_price + $scope.cart.shipment_fee - discount_so_far) : data.available_amount;
					return 1;
				}, function(err) {
					alert(err.data);
				});
			}
		}

		var validateCart = function() {
			var defer = $q.defer();

			return defer.promise;
		}

		$scope.proceedCheckout = function(shipping_info) {
			var address = {
				firstname: shipping_info.firstname,
				lastname: '',
				company: shipping_info.company ? shipping_info.company : '',
				company_id: shipping_info.company_id ? shipping_info.company_id : '',
				address_1: shipping_info.address,
				country_id: shipping_info.country_id,
				zone_id: shipping_info.city_id,
				telephone: shipping_info.telephone,
				district_id: shipping_info.district_id
			};
			var customer = {
				firstname: shipping_info.firstname,
				lastname: '',
				telephone: shipping_info.telephone
			};
			if(lstrcmp(['海外配送','送貨到府'], shipping_info.shipment_sel_str)) {
				Location.updateAddress($scope.customer.customer_id, $scope.customer.address_id, address).then(function(result){console.log(result)}, function(err){console.log(err)});
				$scope.shipping_info.country_d = _.find($scope.country_coll, {country_id: shipping_info.country_id});
				$scope.shipping_info.city_d = _.find($scope.city_coll, {zone_id: shipping_info.city_id});
				if(shipping_info.shipment_sel_str.localeCompare('送貨到府') == 0) {
					$scope.shipping_info.district_d = _.find($scope.district_coll, {district_id: shipping_info.district_id});
				}
			}
			Customer.updateCustomer($scope.customer.customer_id, customer).then(function(result) {}, function(err){console.log(err);});
			$scope.calcPriceSaved().then(function(data) {}, function(err) {alert(err)});
			Product.validateProducts($scope.customer.customer_group_id, $scope.cart.products).then(function(data) {
				console.log(data);
			}, function(err) {
				alert('商品價格及紅利點數有異，請洽客服人員，並將客服代碼『1201』告知客服人員，謝謝');
			});
		};




		$scope.getEzshipStore();
	});
