'use strict';

angular.module('webApp')
  .config(function($stateProvider) {
    $stateProvider
      .state('checkout.success', {
        url: '/success',
        templateUrl: 'app/checkout/success/success.html',
        controller: 'SuccessCtrl',
        authenticate: true
      });
  });