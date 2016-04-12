let passport = require('passport')
let wrap = require('nodeifyit')
let User = require('../models/user')
let LocalStrategy = require('passport-local')
let TwitterStrategy = require('passport-twitter').Strategy

// Handlers
async function localAuthHandler(email, password) {
    console.log("Inside localauthhandler")
    let user = await User.promise.findOne({'local.email': email})

    if (!user || email !== user.local.email) {
        return [false, {message: 'Invalid username'}]
    }

    if (!await user.validatePassword(password)) {
        return [false, {message: 'Invalid password'}]
    }
    return user
}

async function localSignupHandler(email, password) {
    console.log("Inside localSignupHandler")
    email = (email || '').toLowerCase()
    // Is the email taken?
    if (await User.promise.findOne({'local.email': email})) {
        return [false, {message: 'That email is already taken.'}]
    }
    // create the user
    let user = new User()
    user.local.email = email
    // Use a password hash instead of plain-text
    user.local.password = await user.generateHash(password)
    return await user.save()
}

// 3rd-party Auth Helper
function loadPassportStrategy(OauthStrategy, config, userField) {
    config.passReqToCallback = true
    passport.use(new OauthStrategy(config, wrap(authCB, {spread: true})))

    async function authCB(req, token, _ignored_, account) {
        // 1. Load user from store by matching user[userField].id && account.id
        // 2. If req.user exists, we're authorizing (linking account to an existing user)
        // 2a. Ensure it's not already associated with another user
        // 2b. Link account
        // 3. If req.user !exist, we're authenticating (logging in an existing user)
        // 3a. If Step 1 failed (existing user for 3rd party account does not already exist), create a user and link this account (Otherwise, user is logging in).
        // 3c. Return user

        let query = {}
        query['twitter.id'] = account.id

        let user = await User.promise.findOne(query)

        //check if the user is already logged in
        if (!req.user) {
            //if the user is found, then log them in
            if (!user) {
                console.log('user not logged in')

                //if there is no user found with id, create them
                user = new User()
            }
        } else {
            console.log('user logged in')

            //user already exists and is logged in, we have to link accounts
            user = req.user
        }

        user.twitter.id = account.id
        user.twitter.token = token
        user.twitter.username = account.username
        user.twitter.displayName = account.displayName
        user.twitter.tokenSecret = _ignored_
        return await user.promise.save()
        req.user = user;
    }
}

function configure(CONFIG) {
    console.log("Inside configure")
    // Required for session support / persistent login sessions
    passport.serializeUser(wrap(async(user) => user._id))
    passport.deserializeUser(wrap(async(id) => {
        return await User.promise.findById(id)
    }))

    /**
     * Local Auth
     */
    let localLoginStrategy = new LocalStrategy({
        usernameField: 'email', // Use "email" instead of "username"
        failureFlash: true // Enable session-based error logging
    }, wrap(localAuthHandler, {spread: true}))

    let localSignupStrategy = new LocalStrategy({
        usernameField: 'email',
        failureFlash: true
    }, wrap(localSignupHandler, {spread: true}))

    passport.use('local-login', localLoginStrategy)
    passport.use('local-signup', localSignupStrategy)

    /**
     * 3rd-Party Auth
     */
    loadPassportStrategy(TwitterStrategy, {
        consumerKey: CONFIG.twitter.consumerKey,
        consumerSecret: CONFIG.twitter.consumerSecret,
        callbackURL: CONFIG.twitter.callbackUrl
    }, 'twitter')

    return passport
}

module.exports = {passport, configure}
