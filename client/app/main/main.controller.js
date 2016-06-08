'use strict';

angular.module('webApp')
	.controller('MainController', function ($scope, $anchorScroll , $location, $cookies, $http, $q, User, Auth,  Location, Shipment, Promotion, Cart, Customer, Reward) {
		var currentUser = Auth.getCurrentUser();
		$scope.allow_amount = _.range(1,10);
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

		currentUser.$promise.then(function(data) {
			$scope.address_id = data.address_id;
			$scope.shipping_info.firstname = data.firstname;
			$scope.shipping_info.telephone = data.telephone;
			$scope.getAddress(data.customer_id, data.address_id);
			$scope.customer_id = data.customer_id;
			Reward.getByCustomer(data.customer_id).then(function(reward_result) {
				$scope.rewards_owned_by_customer = reward_result.points;
			}, function(err) {
				console.log(err.data);
			});
		});
		
		$scope.cart = {
			products: clean_cart_cookies,
			product_total: _.reduce(cart_cookies, function(sum, o){return sum+o.total}, 0)
		};
		console.log('This is cart: ');
		console.log($scope.cart);
		
		$scope.goToAnchor = function(anchor) {
			($location.hash() !== anchor) ? $location.hash(anchor) : $anchorScroll();
			return true;
		};

		$scope.proceedNext = function() {
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

		$scope.getAddress = function(customer_id, address_id) {
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
			$scope.shipping_info.payment_sel_str = null;
			$scope.shipping_info.country_id = 206;
			$scope.payment_btn.store_pay = (lstrcmp(['shipToStore'], lmethod)) ? true : false;
			$scope.payment_btn.hand_pay = (lstrcmp(['shipToHome'], lmethod)) ? true : false;
			$scope.payment_btn.credit_pay = (lstrcmp(['shipToHome','shipToOverseas', 'shipToStore'], lmethod)) ? true : false;
			if(lstrcmp(['shipToHome'], lmethod)) {
				$scope.shipping_info.country_id = 206;
				$scope.setCities(206);
			}
			if(lstrcmp(['shipToOverseas'], lmethod)) {
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

		$scope.updateProductTotal = function() {
			$scope.cart.product_total = _.reduce($scope.cart.products, function(sum, o){return sum+o.price*o.quantity}, 0);
			$cookies.put('vecs_cart', JSON.stringify($scope.cart.products));
			return true;
		};

		$scope.removeProduct = function(lmodel) {
			$scope.cart.products = _.reject($scope.cart.products, {model: lmodel});
			$scope.updateProductTotal();
			$cookies.put('vecs_cart', JSON.stringify($scope.cart.products));
			return true;
		};

		$scope.calcCouponSaved = function(couponNum, cart) {
			Promotion.calcCouponSaved(couponNum, $scope.customer_id, cart).then(function(data) {
				$scope.cart.promotion_total = data.promotion_total;
			}, function(err) {
				$scope.cart.promotion_total = 0;
				$scope.couponNum = '';
				alert(err.data);
			});
		};

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
			if(lstrcmp(['shipToHome','shipToOverseas'], shipping_info.shipment_sel_str)) {
				Location.updateAddress($scope.customer_id, $scope.address_id, address).then(function(result){console.log(result)}, function(err){console.log(err)});
				$scope.shipping_info.country_d = _.find($scope.country_coll, {country_id: shipping_info.country_id});
				$scope.shipping_info.city_d = _.find($scope.city_coll, {zone_id: shipping_info.city_id});
				if(shipping_info.shipment_sel_str.localeCompare('shipToHome') == 0) {
					$scope.shipping_info.district_d = _.find($scope.district_coll, {district_id: shipping_info.district_id});
				}
			}
			Customer.updateCustomer($scope.customer_id, customer).then(function(result){console.log(result)}, function(err){console.log(err)});
			// validateCart();
			$scope.calcCouponSaved($scope.couponNum, $scope.cart);
			// validateReward();
			// validateVoucher();
		};




		$scope.getEzshipStore();
	});
