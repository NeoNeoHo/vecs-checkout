'use strict';

import User from './user.model';
import passport from 'passport';
import config from '../../config/environment';
import jwt from 'jsonwebtoken';
import db_config from '../../config/db_config.js';
var mysql_pool = db_config.mysql_pool;

function validationError(res, statusCode) {
	statusCode = statusCode || 422;
	return function(err) {
		res.status(statusCode).json(err);
	}
}

function handleError(res, statusCode) {
	statusCode = statusCode || 500;
	return function(err) {
		res.status(statusCode).send(err);
	};
}

/**
 * Get list of users
 * restriction: 'admin'
 */
export function index(req, res) {
	User.findAsync({}, '-salt -password')
		.then(users => {
			res.status(200).json(users);
		})
		.catch(handleError(res));
}

/**
 * Creates a new user
 */
export function create(req, res, next) {
	var newUser = new User(req.body);
	newUser.provider = 'local';
	newUser.role = 'user';
	newUser.saveAsync()
		.spread(function(user) {
			var token = jwt.sign({ _id: user._id }, config.secrets.session, {
				expiresIn: 60 * 60 * 5
			});
			res.json({ token });
		})
		.catch(validationError(res));
}

/**
 * Get a single user
 */
export function show(req, res, next) {
	var userId = req.params.id;

	User.findByIdAsync(userId)
		.then(user => {
			if (!user) {
				return res.status(404).end();
			}
			res.json(user.profile);
		})
		.catch(err => next(err));
}

/**
 * Deletes a user
 * restriction: 'admin'
 */
export function destroy(req, res) {
	User.findByIdAndRemoveAsync(req.params.id)
		.then(function() {
			res.status(204).end();
		})
		.catch(handleError(res));
}

/**
 * Change a users password
 */
export function changePassword(req, res, next) {
	var userId = req.user._id;
	var oldPass = String(req.body.oldPassword);
	var newPass = String(req.body.newPassword);

	User.findByIdAsync(userId)
		.then(user => {
			if (user.authenticate(oldPass)) {
				user.password = newPass;
				return user.saveAsync()
					.then(() => {
						res.status(204).end();
					})
					.catch(validationError(res));
			} else {
				return res.status(403).end();
			}
		});
}

/**
 * Get my info
 */
export function me(req, res, next) {
	var userId = req.user._id;
	console.log(req.user);
	mysql_pool.getConnection(function(err, connection){
		if(err) {
			connection.release();
			handleError(res)(err);
		}
		connection.query('select customer_id, firstname, address_id, email, telephone, customer_group_id, referral_code from oc_customer where customer_id = ?',[userId], function(err, rows) {
			connection.release();
			if(err) next(err);
			if(!rows) return res.status(401).end();
			if(rows) {
				// console.log(rows[0]);
				res.json(rows[0]);
			}
		});
	});
}

/**
 * Authentication callback
 */
export function authCallback(req, res, next) {
	res.redirect('/');
}
