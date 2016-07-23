'use strict';

class NavbarController {
	//start-non-standard
	menu = [
		{
			'title': 'Home',
			'state': 'main'
		},
		{
			'title': 'Checkout',
			'state': 'checkout'
		},
		{
			title: 'Checkout Success',
			state: 'success'
		}
	];

	isCollapsed = true;
	//end-non-standard

	constructor(Auth) {
		this.isLoggedIn = Auth.isLoggedIn;
		this.isAdmin = Auth.isAdmin;
		this.getCurrentUser = Auth.getCurrentUser;
	}
}

angular.module('webApp')
	.controller('NavbarController', NavbarController);
