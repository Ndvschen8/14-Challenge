

const express = require('express');
const session = require('express-session');
const MongoDBStore = require('connect-mongodb-session')(session);
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcrypt');
const { body, validationResult } = require('express-validator');

const app = express();
const PORT = process.env.PORT || 3000;

// MongoDB configuration
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/blog', { useNewUrlParser: true, useUnifiedTopology: true });

// Blog post model
const Post = mongoose.model('Post', {
  title: String,
  content: String,
  author: String,
  date: { type: Date, default: Date.now },
  comments: [{ body: String, author: String, date: { type: Date, default: Date.now } }]
});

// User model
const User = mongoose.model('User', {
  username: String,
  password: String
});

// Session configuration
const store = new MongoDBStore({
  uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/blog',
  collection: 'sessions'
});
app.use(session({
  secret: 'mysecret',
  resave: false,
  saveUninitialized: true,
  store
}));

// Passport configuration
passport.use(new LocalStrategy(
  (username, password, done) => {
    User.findOne({ username }, (err, user) => {
      if (err) { return done(err); }
      if (!user) { return done(null, false); }
      bcrypt.compare(password, user.password, (err, result) => {
        if (err) { return done(err); }
        if (result) { return done(null, user); }
        else { return done(null, false); }
      });
    });
  }
));
passport.serializeUser((user, done) => {
  done(null, user.id);
});
passport.deserializeUser((id, done) => {
  User.findById(id, (err, user) => {
    done(err, user);
  });
});
app.use(passport.initialize());
app.use(passport.session());

// Middleware for checking authentication
const isAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect('/login');
};

// Routes
app.get('/', (req, res) => {
  Post.find().sort('-date').exec((err, posts) => {
    res.render('index', { user: req.user, posts });
  });
});
app.get('/login', (req, res) => {
  res.render('login', { user: req.user });
});
app.post('/login', passport.authenticate('local', { failureRedirect: '/login' }), (req, res) => {
  res.redirect('/');
});
app.get('/signup', (req, res) => {
  res.render('signup', { user: req.user });
});
app.post('/signup', [
  body('username').notEmpty().withMessage('Username is required').bail().isLength({ max: 20 }).withMessage('Username must be no more than 20 characters'),
  body('password').notEmpty().withMessage('Password is required').bail().isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
], (req, res) => {
});