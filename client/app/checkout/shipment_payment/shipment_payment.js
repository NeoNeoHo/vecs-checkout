'use strict';

angular.module('webApp')
  .config(function($stateProvider) {
    $stateProvider
      .state('checkout.shipment_payment', {
        url: '/shipment_payment',
        templateUrl: 'app/checkout/shipment_payment/shipment_payment.html',
        authenticate: true
      });
  });