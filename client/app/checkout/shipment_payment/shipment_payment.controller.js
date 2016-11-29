'use strict';

angular.module('webApp')
	.controller('ShipmentPaymentController', function ($rootScope, $scope, $window, $state, $document, $location, Location, Shipment, Payment, Cart, ShippingInfo, Config, Referral) {

		var SHIPMENT_EZSHIP_FEE = Config.SHIPPING_FEE.EZSHIP;
		var SHIPMENT_HOME_FEE = Config.SHIPPING_FEE.HOME;
		var SHIPMENT_OVERSEAS_FEE = Config.SHIPPING_FEE.OVERSEAS;
		var FREESHIPPING_FEE = Config.FREE_SHIPPING_CONDICTION.EZSHIP;
		var FREESHIPPING_OVERSEAS_FEE = Config.FREE_SHIPPING_CONDICTION.OVERSEAS;
		$scope.EZSHIP_PRICE_UPPER_BOUND = Config.EZSHIP_PRICE_UPPER_BOUND;

		var SHIPPING_NAME = Config.SHIPPING_NAME;
		var PAYMENT_NAME = Config.PAYMENT_NAME;
		$scope.SHIPPING_NAME = SHIPPING_NAME;
		$scope.PAYMENT_NAME = PAYMENT_NAME;
		$scope.is_address_valid = true;
		
		Cart.get().then(function(cart) {
			$scope.cart = cart;
		}, function(err) {
			window.location.href = Config.DIR_DOMAIN;
		});
		ShippingInfo.get().then(function(init_result) {
			$scope.shipping_info = init_result.shipping_info;
			$scope.city_coll = init_result.city_coll;
			$scope.district_coll = init_result.district_coll;
			checkEzshipStore();
			var searchUrlObject = $location.search();
			if(_.has($scope.shipping_info, 'shipment_sel_str')) {
				$scope.setPaymentMethod($scope.shipping_info.shipment_sel_str);
			}
			if(_.has(searchUrlObject, 'shipment') && searchUrlObject.shipment == 'ship_to_store') {
				$scope.shipping_info = ShippingInfo.update({shipment_sel_str: SHIPPING_NAME.ship_to_store});
				$scope.setPaymentMethod(SHIPPING_NAME.ship_to_store);
			}

			$scope.is_passed_tel_check = true;
			Referral.withReferralQualified().then(function(result) {
				if(result) {
					$scope.referral_reminder_text = '首次好友購物結帳滿千輸入『 NM15off 』，即可享有15%的專屬優惠喔';
					$scope.is_passed_tel_check = ($scope.shipping_info.verification.status === 'pass');  // default : fail
				}
			}, function(err) {
				$scope.referral_reminder_text = '';
			});
		}, function(err) {
			window.location.href = Config.DIR_DOMAIN;
		});

		$scope.wait_30_s = false;
		$scope.smsFraudCheck = function(telephone) {
			$scope.wait_30_s = true;
			setTimeout(function(){
				$scope.wait_30_s = false;
			}, 30*1000);
			Referral.smsFraudCheck(telephone).then(function(result) {
				if(result.status === 'pass') {
					$scope.shipping_info = ShippingInfo.update({verification: { status: 'pass', code : ''}});
					$scope.is_passed_tel_check = true;
				}
				$scope.sent_sms_code_msg = result;
			}, function(err) {

			});
		};
		$scope.verifyTelSms = function() {
			Referral.verifyTelSms($scope.shipping_info.telephone, $scope.shipping_info.verification.code).then(function(result) {
				if(result === 'yes') {
					console.log('verify yes');
					$scope.shipping_info = ShippingInfo.update({verification: { status: 'pass', code : $scope.shipping_info.verification.code}});
					$scope.is_passed_tel_check = true;
				}
				if(result === 'no') {
					console.log('verify no');
					$scope.shipping_info = ShippingInfo.update({verification: { status: 'fail', code : $scope.shipping_info.verification.code}});
				}
			}, function(err) {

			});
		};

		$scope.checkout_first_step = function() {
			$state.go('checkout.product_check');
		};

		$scope.checkout_third_step = function() {
			$scope.checkShipmentFee();
			if($scope.shipping_info.shipment_sel_str === SHIPPING_NAME.ship_to_home) {
				$scope.is_address_valid = $scope.shipping_info.city_d && $scope.shipping_info.district_d && $scope.shipping_info.address;
			}
			if($scope.shipping_info.shipment_sel_str === SHIPPING_NAME.ship_to_overseas) {
				$scope.is_address_valid = $scope.shipping_info.city_d && $scope.shipping_info.address;
			}
			if($scope.shipping_info.shipment_sel_str === SHIPPING_NAME.ship_to_store) {
				$scope.is_address_valid = $scope.shipping_info.ezship_store_info;
			}
			if($scope.shipment_payment_form.$valid && $scope.is_address_valid){
				$state.go('checkout.final_confirm');
			} else {
				$scope.is_address_valid = false;
				console.log($scope.shipment_payment_form.$valid);
			}
		};

		$scope.store_select_text = '選擇超商門市';


		$scope.payment_btn = {
			store_pay: true,
			hand_pay: true,
			credit_pay: true
		};
		$scope.with_city_ready = false;
		$scope.with_district_ready = false;



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

		$scope.setDistrictName = function(district_id) {
			$scope.shipping_info = ShippingInfo.setDistrictName(district_id);
		};

		$scope.setCityName = function(city_id) {
			$scope.shipping_info = ShippingInfo.setCityName(city_id);
		};

		$scope.setPaymentMethod = function(lmethod) {
			$scope.is_address_valid = true;
			$scope.shipping_info = ShippingInfo.update({
				shipment_sel_str: lmethod
			});
			if(!ShippingInfo.checkPayment()) {
				$scope.shipping_info = ShippingInfo.update({
					payment_sel_str: null,
					country_id: 206
				});
			}
			$scope.payment_btn.store_pay = (lstrcmp([SHIPPING_NAME.ship_to_store], lmethod)) ? true : false;
			$scope.payment_btn.hand_pay = (lstrcmp([SHIPPING_NAME.ship_to_home], lmethod)) ? true : false;
			$scope.payment_btn.credit_pay = (lstrcmp([SHIPPING_NAME.ship_to_home,SHIPPING_NAME.ship_to_overseas, SHIPPING_NAME.ship_to_store], lmethod)) ? true : false;
			
			// IF customer is in black list => mulitiple records of not picking her orders
			if ($scope.shipping_info.customer_group_id == 10) {
				$scope.payment_btn.store_pay = false;
				$scope.payment_btn.hand_pay = false;
				$scope.payment_btn.credit_pay = true;
			}
			
			var total_price_with_discount = Cart.getPriceWithDiscount();
			switch (lmethod) {
				case SHIPPING_NAME.ship_to_home:
					$scope.shipping_info = ShippingInfo.update({shipment_fee : (total_price_with_discount >= FREESHIPPING_FEE) ? 0 : SHIPMENT_HOME_FEE});
					$scope.setCities(206);
					break;
				case SHIPPING_NAME.ship_to_store:
					$scope.shipping_info = ShippingInfo.update({shipment_fee : (total_price_with_discount >= FREESHIPPING_FEE) ? 0 : SHIPMENT_EZSHIP_FEE});
					break;
				case SHIPPING_NAME.ship_to_overseas:
					$scope.shipping_info = ShippingInfo.update({shipment_fee : (total_price_with_discount >= FREESHIPPING_OVERSEAS_FEE) ? 0 : SHIPMENT_OVERSEAS_FEE});
					Location.getCountries().then(function(result) {
						$scope.country_coll = result;
						$scope.with_city_ready = false;
					}, function(err) {
						// $state.go('failure');
					});
					break;
				default:
					break;
			}
		};

		$scope.checkShipmentFee = function(){
			var lmethod = $scope.shipping_info.shipment_sel_str;
			var total_price_with_discount = Cart.getPriceWithDiscount();
			switch (lmethod) {
				case SHIPPING_NAME.ship_to_home:
					$scope.shipping_info = ShippingInfo.update({shipment_fee : (total_price_with_discount >= FREESHIPPING_FEE) ? 0 : SHIPMENT_HOME_FEE});
					break;
				case SHIPPING_NAME.ship_to_store:
					$scope.shipping_info = ShippingInfo.update({shipment_fee : (total_price_with_discount >= FREESHIPPING_FEE) ? 0 : SHIPMENT_EZSHIP_FEE});
					break;
				case SHIPPING_NAME.ship_to_overseas:
					$scope.shipping_info = ShippingInfo.update({shipment_fee : (total_price_with_discount >= FREESHIPPING_OVERSEAS_FEE) ? 0 : SHIPMENT_OVERSEAS_FEE});
					break;
			}
			return true;
		};

		$scope.updatePaymentMethod = function(lpayment) {
			$scope.shipping_info = ShippingInfo.update({payment_sel_str: lpayment});
		};
		
		var checkEzshipStore = function() {
			if($scope.shipping_info.ezship_store_info) {
				$scope.store_select_text = '重新選擇超商';
			}
		};

		$scope.setCities = function(country_id) {
			$scope.with_city_ready = false;
			ShippingInfo.setCities(country_id).then(function(result) {
				$scope.shipping_info = result.shipping_info;
				$scope.city_coll = result.city_coll;
				$scope.with_city_ready = true;
			}, function(err) {
				console.log(err);
			});
		};

		$scope.setDistricts = function(city_id) {
			$scope.with_district_ready = false;
			ShippingInfo.setDistricts(city_id).then(function(result) {
				$scope.shipping_info = result.shipping_info;
				$scope.district_coll = result.district_coll;
				$scope.with_district_ready = true;
			}, function(err) {
				console.log(err);
			});	
		};
	});
