'use strict';

angular.module('webApp')
  .config(function ($stateProvider) {
    $stateProvider
      .state('success', {
        url: '/success',
        templateUrl: 'app/success/success.html',
        controller: 'SuccessCtrl'
      });
  });
