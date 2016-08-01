'use strict';

angular.module('webApp')
  .config(function($stateProvider) {
    $stateProvider
      .state('success', {
        url: '/checkout/success',
        templateUrl: 'app/checkout/success/success.html',
        controller: 'SuccessCtrl'
        // authenticate: true
      });
  });