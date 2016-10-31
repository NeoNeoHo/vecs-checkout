'use strict';

angular.module('webApp')
	.controller('FinalConfirmController', function ($rootScope, $scope, $window, $state, $document, $location, $cookies, $sce, $http, $q, Auth,  Location, Shipment, Payment, Cart, ShippingInfo, Customer, Product, Config) {

		var SHIPMENT_EZSHIP_FEE = Config.SHIPPING_FEE.EZSHIP;
		var SHIPMENT_HOME_FEE = Config.SHIPPING_FEE.HOME;
		var SHIPMENT_OVERSEAS_FEE = Config.SHIPPING_FEE.OVERSEAS;
		var FREESHIPPING_FEE = Config.FREE_SHIPPING_CONDICTION.EZSHIP;
		var FREESHIPPING_OVERSEAS_FEE = Config.FREE_SHIPPING_CONDICTION.OVERSEAS;
		var SHIPPING_NAME = Config.SHIPPING_NAME;
		var PAYMENT_NAME = Config.PAYMENT_NAME;
		$scope.SHIPPING_NAME = SHIPPING_NAME;
		$scope.PAYMENT_NAME = PAYMENT_NAME;

		$scope.is_submitted = false;

		Cart.get().then(function(cart) {
			$scope.cart = cart;
		}, function(err) {
			window.location.href = Config.DIR_DOMAIN;
		});

		ShippingInfo.get().then(function(init_result) {
			$scope.shipping_info = init_result.shipping_info;
			if(!ShippingInfo.checkShipment() || !ShippingInfo.checkPayment()) {
				console.log('就是這邊');
				$state.go('checkout.product_check');
			}
		}, function(err) {
			window.location.href = Config.DIR_DOMAIN;
		});


		$scope.checkout_second_step = function() {
			$state.go('checkout.shipment_payment');
		};

		var lstrcmp = function(collection, str) {
			var result = _.some(collection, function(data){
				return data.localeCompare(str) == 0;
			});
			return result;
		}

		var checkShipmentFee = function(){
			var lmethod = $scope.shipping_info.shipment_sel_str;
			var total_price_with_discount = Cart.getPriceWithDiscount();
			var shipment_fee = 0;
			switch (lmethod) {
				case SHIPPING_NAME.ship_to_home:
					shipment_fee = (total_price_with_discount >= FREESHIPPING_FEE) ? 0 : SHIPMENT_HOME_FEE;
					break;
				case SHIPPING_NAME.ship_to_store:
					shipment_fee = (total_price_with_discount >= FREESHIPPING_FEE) ? 0 : SHIPMENT_EZSHIP_FEE;
					break;
				case SHIPPING_NAME.ship_to_overseas:
					shipment_fee = (total_price_with_discount >= FREESHIPPING_OVERSEAS_FEE) ? 0 : SHIPMENT_OVERSEAS_FEE;
					break;
			}
			return (shipment_fee === $scope.shipping_info.shipment_fee)
		};

		$scope.proceedCheckout = function() {
			$cookies.remove('shipping_cookies');
			$scope.is_submitted = true;
			var shipping_promise = [];
			var payment_promise = [];
			var shipment_method = $scope.shipping_info.shipment_sel_str;
			var payment_method = $scope.shipping_info.payment_sel_str;
			var customer_to_update = {
				firstname: $scope.shipping_info.firstname,
				lastname: '',
				telephone: $scope.shipping_info.telephone
			};

			// Step 1. 檢查有無商品
			if(_.size($scope.cart.products) == 0) {
				$scope.is_submitted = false;
				alert('此購物車沒有商品');
				window.location.href = Config.DIR_DOMAIN;
			}

			// Step 2. 檢查配送方式與付款方式
			if(!ShippingInfo.checkShipment() || !ShippingInfo.checkPayment()) {
				alert('配送方式與付款方式有誤');
				$state.go('checkout.shipment_payment');
			}

			// Step 3. 檢查運費
			if(!checkShipmentFee()) {
				alert('運費有誤，請回到配送方式');
				$state.go('checkout.shipment_payment');
			}

			// Step 4. 處理特殊需求 Comment
			if($scope.shipping_info.dmRequest) {
				if($scope.shipping_info.comment) {
					$scope.shipping_info.comment = $scope.shipping_info.comment + '; ' + '我不需要DM喔，謝謝';
				} else {
					$scope.shipping_info.comment = '我不需要DM喔，謝謝';
				}	
			}


			// 非同步處理的部份
			var lpromises = [];
			// Step 5. 更新用戶資料
			lpromises.push(Customer.updateCustomer(customer_to_update));
			// Step 6. 檢查商品資訊是否有被篡改
			lpromises.push(Product.validateProducts($scope.cart.products));

			$q.all(lpromises).then(function(datas) {

				// Step 7. 根據不同配送 付款方式，產生相對應後送動作
				switch (shipment_method) {
					case SHIPPING_NAME.ship_to_home:
						shipping_promise = Shipment.setShipToHome($scope.cart, $scope.shipping_info, payment_method);
						break;
					case SHIPPING_NAME.ship_to_overseas:
						shipping_promise = Shipment.setShipToOverseas($scope.cart, $scope.shipping_info, payment_method);
						break;
					case SHIPPING_NAME.ship_to_store:
						shipping_promise = Shipment.setShipToEzship($scope.cart, $scope.shipping_info, payment_method);
						break;
					default:
						alert('請檢查配送方式，謝謝');
						$scope.is_submitted = false;
						$scope.checkout_second_step();
						break;
				}
				// Step 7-1. 先處理配送方式，回傳訂單編號
				shipping_promise.then(function(resp_new_order_id) {
					switch (payment_method) {
						case PAYMENT_NAME.hand_pay:
							payment_promise = Payment.setPayOnDeliver(resp_new_order_id);
							break;
						case PAYMENT_NAME.store_pay:
							payment_promise = Payment.setPayOnStore(resp_new_order_id);
							break;
						case PAYMENT_NAME.credit_pay:
							payment_promise = Payment.setPayByCreditCard(resp_new_order_id);
							break;
						default:
							alert('請檢查付款方式，謝謝');
							$scope.is_submitted = false;
							$scope.checkout_second_step();
							break;						
					}

					// Step 7-2. 再處理付款方式，回傳訂單狀態與訂單編號
					payment_promise.then(function(datas) {
						var checkout_result = datas;
						if(payment_method !== PAYMENT_NAME.credit_pay) {
							$location.path('/checkout/success').search({order_id: checkout_result.order_id}).hash('');
						}
					}, function(err) {
						$scope.is_submitted = false;
						$state.go('failure');
					});
				}, function(err) {
					$scope.is_submitted = false;
					$state.go('failure');
				});

			}, function(err) {
				$scope.is_submitted = false;
				alert('商品價格或紅利點數有異，請回到官網重新點選購物車');
				window.location.href = Config.DIR_DOMAIN;
			});
		};

		if($window.innerWidth <= 768){
			$scope.form_action = $sce.trustAsResourceUrl("https://sslpayment.uwccb.com.tw/EPOSService/Payment/Mobile/OrderInitial.aspx");
		} else {
			$scope.form_action = $sce.trustAsResourceUrl("https://sslpayment.uwccb.com.tw/EPOSService/Payment/OrderInitial.aspx");
		}
	});
