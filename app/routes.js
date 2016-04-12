let isLoggedIn = require('./middlewares/isLoggedIn')
let Twitter = require('twitter');
let then = require('express-then');
let posts = require('./data/posts');

module.exports = (app) => {
    let passport = app.passport
    let scope = 'email';


    app.get('/', (req, res) => res.render('index.ejs'))

    app.get('/profile', isLoggedIn, (req, res) => {
        res.render('profile.ejs', {
            user: req.user,
            message: req.flash('error')
        })
    })

    app.get('/logout', (req, res) => {
        req.logout()
        res.redirect('/')
    })

    app.get('/login', (req, res) => {
        console.log("inside login route")
        res.render('login.ejs', {message: req.flash('error')})
    })

    app.get('/connect/local', (req, res) => {
        console.log("inside login route")
        res.render('login.ejs', {message: req.flash('error')})
    })

    app.get('/signup', (req, res) => {
        console.log("inside login route")
        res.render('signup.ejs', {message: req.flash('error')})
    })

    app.post('/signup', passport.authenticate('local-signup', {
        successRedirect: '/profile',
        failureRedirect: '/signup',
        failureFlash: true
    }));

    app.post('/login', passport.authenticate('local-login', {
        successRedirect: '/profile',
        failureRedirect: '/login',
        failureFlash: true
    }));

    app.get('/connect/twitter', passport.authenticate('twitter', {scope}));


    app.get('/auth/twitter', passport.authenticate('twitter', {scope}));

    app.get('/auth/twitter/callback', passport.authenticate('twitter', {
        successRedirect: '/profile',
        failureRedirect: '/profile',
        failureFlash: true
    }));


    app.get('/timeline', isLoggedIn, then(async(req, res) => {
        try {
            console.log(JSON.stringify(req.user.twitter.token))
            console.log(JSON.stringify(app.config.auth.twitter.consumerKey))
            console.log(JSON.stringify(app.config.auth.twitter.consumerSecret))
            console.log(JSON.stringify(req.user.twitter.tokenSecret))

            var twitterClient = new Twitter({
            consumer_key: app.config.auth.twitter.consumerKey,
            consumer_secret: app.config.auth.twitter.consumerSecret,
            access_token_key: req.user.twitter.token,
            access_token_secret: req.user.twitter.tokenSecret
        });

        let [tweets] = await twitterClient.promise.get('statuses/home_timeline', {count: 20});

        posts = tweets.map(tweet => {
            return {
                id: tweet.id_str,
                image: tweet.user.profile_image_url,
                text: tweet.text,
                name: tweet.user.name,
                username: "@" + tweet.user.screen_name,
                liked: tweet.favorited,
                network: ""
            }
        });

        res.render('timeline.ejs', {
            message: req.flash('error'),
            posts: posts

        })
        } catch(e) {
            console.log(e)
        }
    }));

    app.get('/compose', isLoggedIn,  (req, res) => {
        res.render('compose.ejs', {
            message: req.flash('error')
        })
    });

    app.post('/compose', isLoggedIn,  (req, res) => {
        let text = req.body.reply;

        if (text.length > 140){
            req.flash('error', 'Status is over 140 characters');
            res.redirect('/timeline');
            return
        }

        if (!text){
            req.flash('error', 'Status cannot be empty');
            res.redirect('/timeline');
            return
        }

        var twitterClient = new Twitter({
            consumer_key: app.config.auth.twitter.consumerKey,
            consumer_secret: app.config.auth.twitter.consumerSecret,
            access_token_key: req.user.twitter.token,
            access_token_secret: req.user.twitter.tokenSecret
        });

        twitterClient.promise.post('/statuses/update', {status: text});
        res.redirect('/timeline');
    });

    /**
    app.get('/share/:id', isLoggedIn, then(async(req, res) => {
        let id = req.params.id;

        var twitterClient = new Twitter({
            consumer_key: app.config.auth.twitter.consumerKey,
            consumer_secret: app.config.auth.twitter.consumerSecret,
            access_token_key: req.user.twitter.token,
            access_token_secret: req.user.twitter.tokenSecret
        });
        console.log(id)
        console.log(JSON.stringify(req.params))
        let tweet =  twitterClient.promise.get("/statuses/show/"+id);
        console.log(JSON.stringify(tweet))
        let post = {
            id : tweet.id_str,
            text: tweet.text,
            name: tweet.user.name,
            username: '@' + tweet.user.screen_name
        };

        res.render('share.ejs', {
            message: req.flash('error'),
            post: post
        })
    }))



    app.get('/share/:postId', isLoggedIn, (req, res) => {
        res.render('share.ejs', {
            postId: req.params.postId,
            message: req.flash('error')
        })
    })

    app.post('/share/:postId', isLoggedIn, then(async (req, res) => {
        let post = await Feed.promise.findOne({'id': req.params.postId})
        let network = post.network.icon
        let message = req.body.share

        if (message.length > 140) {
            return req.flash('error', 'Share message is over 140 characters!')
        }

        if (network === 'twitter') {
            let twitterClient = new Twitter({
                consumer_key: twitterConfig.consumerKey,
                consumer_secret: twitterConfig.consumerSecret,
                access_token_key: req.user.twitter.token,
                access_token_secret: req.user.twitter.tokenSecret
            })
            await twitterClient.promise.post('statuses/retweet/'+ post.id)
        }

        res.redirect('/timeline')
    }))

     */

    app.get('/share/:id', isLoggedIn, async(req, res) => {
        let id = req.params.id;

        let twitterClient = new Twitter({
            consumer_key: app.config.auth.twitter.consumerKey,
            consumer_secret: app.config.auth.twitter.consumerSecret,
            access_token_key: req.user.twitter.token,
            access_token_secret: req.user.twitter.tokenSecret
        });

        let tweet =  await twitterClient.promise.get(`/statuses/show/${id}`);
        console.log("response from server for share: "+JSON.stringify(tweet));
        tweet = tweet[0]

        let post = {
            id : tweet.id_str,
            image: tweet.user.profile_image_url,
            text: tweet.text,
            name: tweet.user.name,
            username: '@' + tweet.user.screen_name
        };

        res.render('share.ejs', {
            message: req.flash('error'),
            post: post
        })
    });

    app.post('/share/:id', isLoggedIn, async (req, res) => {
        let text = req.body.share;
        let id = req.params.id;

        console.log(id)
        console.log(text)

        let twitterClient = new Twitter({
            consumer_key: app.config.auth.twitter.consumerKey,
            consumer_secret: app.config.auth.twitter.consumerSecret,
            access_token_key: req.user.twitter.token,
            access_token_secret: req.user.twitter.tokenSecret
        });


        try {
            let res = await twitterClient.promise.post('/statuses/retweet/'+id, {
                status: text
            });
            console.log("response from server for share: "+JSON.stringify(res));

        }
        catch(e){
            console.log(e, e.message);
        }

        res.redirect('/timeline')
    });

    app.post('/like/:id', isLoggedIn, async(req, res) => {

        let id = req.params.id;
        let twitterClient = new Twitter({
            consumer_key: app.config.auth.twitter.consumerKey,
            consumer_secret: app.config.auth.twitter.consumerSecret,
            access_token_key: req.user.twitter.token,
            access_token_secret: req.user.twitter.tokenSecret
        });
        try {
            let res = await twitterClient.promise.post('/favorites/create', {
                id: id
            });
            console.log("response from server for like: "+JSON.stringify(res));
        }
        catch(e){
            console.log(e, e.message);
        }
        res.redirect('/timeline')
    })

    app.post('/unlike/:id', isLoggedIn, async(req, res) => {

        let id = req.params.id;
        let twitterClient = new Twitter({
            consumer_key: app.config.auth.twitter.consumerKey,
            consumer_secret: app.config.auth.twitter.consumerSecret,
            access_token_key: req.user.twitter.token,
            access_token_secret: req.user.twitter.tokenSecret
        });
        try {
            let res = await twitterClient.promise.post('/favorites/destroy', {
                id: id
            });
            console.log("response from server for unlike: "+JSON.stringify(res));
        }
        catch(e){
            console.log(e, e.message);
        }
        res.redirect('/timeline')
    })

    app.get('/reply/:id', isLoggedIn, async(req, res) => {
        let id = req.params.id;

        let twitterClient = new Twitter({
            consumer_key: app.config.auth.twitter.consumerKey,
            consumer_secret: app.config.auth.twitter.consumerSecret,
            access_token_key: req.user.twitter.token,
            access_token_secret: req.user.twitter.tokenSecret
        });

        let tweet =  await twitterClient.promise.get('/statuses/show/'+id);
        console.log("response from server for share: "+JSON.stringify(tweet));
        tweet = tweet[0]

        let post = {
            id : tweet.id_str,
            image: tweet.user.profile_image_url,
            text: tweet.text,
            name: tweet.user.name,
            username: '@' + tweet.user.screen_name
        };

        res.render('reply.ejs', {
            message: req.flash('error'),
            post: post
        })
    });

    app.post('/reply/:id', isLoggedIn, async(req, res) => {
        console.log("\n\nbody" + JSON.stringify(req.body))
        let reply = req.body.reply;
        let inReplyTo = req.params.id;

        let twitterClient = new Twitter({
            consumer_key: app.config.auth.twitter.consumerKey,
            consumer_secret: app.config.auth.twitter.consumerSecret,
            access_token_key: req.user.twitter.token,
            access_token_secret: req.user.twitter.tokenSecret
        });

        let resp = await twitterClient.promise.post('/statuses/update', {
            in_reply_to_status_id: inReplyTo,
            status : reply
        });
        console.log(resp)
        res.redirect('/timeline')
    });

}