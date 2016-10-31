'use strict';

describe('Service: ShippingInfo', function () {

  // load the service's module
  beforeEach(module('webApp'));

  // instantiate service
  var ShippingInfo;
  beforeEach(inject(function (_Location_) {
    ShippingInfo = _Location_;
  }));

  it('should do something', function () {
    expect(!!ShippingInfo).toBe(true);
  });

});
