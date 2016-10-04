'use strict';

describe('Service: Referral', function () {

  // load the service's module
  beforeEach(module('webApp'));

  // instantiate service
  var Referral;
  beforeEach(inject(function (_Referral_) {
    Referral = _Referral_;
  }));

  it('should do something', function () {
    expect(!!Referral).toBe(true);
  });

});
