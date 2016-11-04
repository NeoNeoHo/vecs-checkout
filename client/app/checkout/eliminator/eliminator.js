'use strict';

angular.module('webApp')
  .config(function($stateProvider) {
    $stateProvider
      .state('eliminator', {
        url: '/eliminator',
        templateUrl: 'app/checkout/eliminator/eliminator.html',
        controller: 'EliminatorController',
        resolve: {
		      // Constant title
		      $title: function() { return '修正購物記錄'; }
		    }
      });
  });