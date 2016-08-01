'use strict';

angular.module('webApp')
  .config(function($stateProvider) {
    $stateProvider
      .state('failure', {
        url: '/checkout/failure',
        templateUrl: 'app/checkout/failure/failure.html',
        controller: 'FailureCtrl'
        // authenticate: true
      });
  });