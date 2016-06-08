'use strict';

angular.module('webApp')
  .factory('Shipment', function ($http, $q, $filter, $cookies) {
    // Service logic
    // ...

    var meaningOfLife = 42;
    var checkoutToken = $cookies.get('vecs_token');
    
    var setEzshipStore = function(order_id) {
      var url = 'http://map.ezship.com.tw/ezship_map_web.jsp'
      var suID = '?suID=' + $filter('encodeURI')('shipping@vecsgardenia.com')
      var processID = '&processID=' + order_id;
      var rtURL = '&rtURL=' + $filter('encodeURI')('http://61.220.72.50:9001/api/ezships/history/')
      var webPara = '&webPara='+checkoutToken
      var req_str = url+suID+processID+rtURL+webPara
      window.location = req_str
    };

    var getEzshipStore = function(order_id) {
      var defer = $q.defer();
      $http.get('/api/ezships/history/'+order_id).then(function(data) {
        defer.resolve(data.data[0]);
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
      setEzshipStore: setEzshipStore,
      getEzshipStore: getEzshipStore
    };
  });
