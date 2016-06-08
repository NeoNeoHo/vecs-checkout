'use strict';

(function() {

function authInterceptor($rootScope, $q, $cookies, $injector, Util) {
  var state;
  return {
    // Add authorization token to headers
    request(config) {
      config.headers = config.headers || {};
      if ($cookies.get('vecs_token') && Util.isSameOrigin(config.url)) {
        config.headers.Authorization = 'Bearer ' + $cookies.get('vecs_token');
      }
      return config;
    },

    // Intercept 401s and redirect you to login
    responseError(response) {
      if (response.status === 401) {
        (state || (state = $injector.get('$state'))).go('login');
        // remove any stale tokens
        $cookies.remove('vecs_token');
      }
      return $q.reject(response);
    }
  };
}

angular.module('webApp.auth')
  .factory('authInterceptor', authInterceptor);

})();
