'use strict';

angular.module('webApp')
	.controller('ProductCheckController', function ($rootScope, $scope, $window, $state, $document, $location, $q, Promotion, Cart, Reward, Product, Config, Referral) {

		$scope.DIR_DOMAIN = Config.DIR_DOMAIN;

		Cart.get().then(function(cart) {
			$scope.cart = cart;
		}, function(err) {
			window.location.href = Config.DIR_DOMAIN;
		});

		$scope.is_passed_tel_check = true;
		Referral.withReferralQualified().then(function(result) {
			if(result) {
				$scope.referral_reminder_text = '首次好友購物結帳滿千輸入『 NM15off 』，即可享有15%的專屬優惠喔';
				$scope.is_needed_to_check_tel = true;
				$scope.is_passed_tel_check = false;  // default : fail
			}
		}, function(err) {
			$scope.referral_reminder_text = '';
		});

		$scope.checkout_second_step = function() {
			if($scope.product_check_form.$valid){
				$state.go('checkout.shipment_payment');
			} else {
				console.log($scope.product_check_form.$valid);
			}
		};
		
		var lstrcmp = function(collection, str) {
			var result = _.some(collection, function(data){
				return data.localeCompare(str) == 0;
			});
			return result;
		}

		$scope.updateCartTotal = function() {
			$scope.cart = Cart.updateCartTotal();
		}
		$scope.removeProduct = function(key='') {	
			$scope.cart = Cart.removeProduct(key);
		};
		$scope.updateProduct = function(product_key, quantity) {
			$scope.cart = Cart.updateProduct(product_key, quantity);
		};

		$scope.calcRewardSaved = function() {
			$scope.cart = Cart.calcRewardSaved($scope.cart.discount.reward.name);
		};

		$scope.calcVoucherSaved = function() {
			var defer = $q.defer();
			Promotion.getVoucher($scope.cart.discount.voucher.name).then(function(resp_voucher) {
				$scope.cart = Cart.calcVoucherSaved();
				defer.resolve();
			}, function(err) {
				$scope.cart = Cart.calcVoucherSaved();
				defer.reject(err);
			});
			return defer.promise;
		};

		$scope.applyCoupon = function() {
			var defer = $q.defer();
			Promotion.getCoupon($scope.cart.discount.coupon.name).then(function(data) {
				$scope.cart = Cart.calcCouponSaved();
				defer.resolve();
			}, function(err) {
				$scope.cart = Cart.calcCouponSaved();
				defer.resolve();
			});			
			return defer.promise;
		};

		$scope.removeCoupon = function() {
			Promotion.removeCoupon();
		};
	});
