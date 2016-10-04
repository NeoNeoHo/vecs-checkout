'use strict';

angular.module('webApp')
  .directive('footer', function () {
    return {
      templateUrl: 'components/footer/footer.html',
      restrict: 'E',
      controller: 'FooterController'
    };
  });
