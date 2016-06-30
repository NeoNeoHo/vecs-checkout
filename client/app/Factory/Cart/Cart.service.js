'use strict';

angular.module('webApp')
  .factory('Cart', function ($q, $http) {
    // Service logic
    // ...

    var meaningOfLife = 42;
    var updateCart = function(cart_products) {
      var defer = $q.defer();
      $http.put('/api/customers/updateCart/', {cart_products: cart_products})
      .then(function(result) {
        defer.resolve(result);
      }, function(err) {
        defer.reject(err);
      });
      return defer.promise;
    };
    // Public API here
    return {
      someMethod: function () {
        return meaningOfLife;
      },
      updateCart: updateCart
    };
  });
