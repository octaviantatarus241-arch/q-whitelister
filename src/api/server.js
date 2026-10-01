const express = require('express');
const session = require('express-session');
const passport = require('passport');
const DiscordStrategy = require('passport-discord').Strategy;
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
require('dotenv').config();

const { Project, Key } = require('../database/models');
const { generateKey, generateKeys } = require('../utils/keyGenerator');

const app = express();

// Middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: process.env.FRONTEND_URL || true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../../website')));

app.use(session({
  secret: process.env.SESSION_SECRET || 'change-me',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 7 * 24 * 60 * 60 * 1000 } // 7 days
}));

app.use(passport.initialize());
app.use(passport.session());

// Passport Discord Strategy
passport.use(new DiscordStrategy({
  clientID: process.env.DISCORD_CLIENT_ID,
  clientSecret: process.env.DISCORD_CLIENT_SECRET,
  callbackURL: process.env.DISCORD_CALLBACK_URL,
  scope: ['identify', 'guilds']
}, (accessToken, refreshToken, profile, done) => {
  return done(null, profile);
}));

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));

// Auth middleware
function ensureAuth(req, res, next) {
  if (req.isAuthenticated()) return next();
  res.status(401).json({ error: 'Not authenticated' });
}

// ========== AUTH ROUTES ==========
app.get('/auth/discord', passport.authenticate('discord'));

app.get('/auth/discord/callback',
  passport.authenticate('discord', { failureRedirect: '/' }),
  (req, res) => {
    res.redirect('/dashboard.html');
  }
);

app.get('/auth/logout', (req, res) => {
  req.logout(() => {
    res.redirect('/');
  });
});

app.get('/api/me', (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Not logged in' });
  res.json({
    id: req.user.id,
    username: req.user.username,
    avatar: req.user.avatar,
    discriminator: req.user.discriminator
  });
});

// ========== PROJECT ROUTES ==========
app.post('/api/projects', ensureAuth, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Name required' });

    const project = await Project.create({
      name,
      ownerId: req.user.id,
      scriptId: generateKey(16)
    });

    res.json(project);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/projects', ensureAuth, async (req, res) => {
  try {
    const projects = await Project.find({ ownerId: req.user.id });
    res.json(projects);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== KEY ROUTES ==========
app.post('/api/keys/generate', ensureAuth, async (req, res) => {
  try {
    const { projectId, count = 1, days = null, discordId = null } = req.body;

    const project = await Project.findOne({ _id: projectId, ownerId: req.user.id });
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const keys = [];
    for (let i = 0; i < Math.min(count, 100); i++) {
      const key = await Key.create({
        key: generateKey(),
        projectId: project._id,
        discordId: discordId || null,
        expiresAt: days ? new Date(Date.now() + days * 24 * 60 * 60 * 1000) : null
      });
      keys.push(key);
    }

    res.json(keys);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/keys/:projectId', ensureAuth, async (req, res) => {
  try {
    const project = await Project.findOne({ _id: req.params.projectId, ownerId: req.user.id });
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const keys = await Key.find({ projectId: project._id }).sort({ createdAt: -1 }).limit(200);
    res.json(keys);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/keys/:keyId', ensureAuth, async (req, res) => {
  try {
    const key = await Key.findById(req.params.keyId).populate('projectId');
    if (!key || key.projectId.ownerId !== req.user.id) {
      return res.status(404).json({ error: 'Key not found' });
    }
    await Key.deleteOne({ _id: key._id });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== PUBLIC KEY CHECK (for scripts) ==========
app.post('/api/check-key', async (req, res) => {
  try {
    const { key, hwid, scriptId } = req.body;
    if (!key) return res.status(400).json({ code: 'KEY_INVALID', message: 'Key is required' });

    const keyDoc = await Key.findOne({ key }).populate('projectId');
    if (!keyDoc) {
      return res.json({ code: 'KEY_INCORRECT', message: 'Key does not exist' });
    }

    if (keyDoc.blacklisted) {
      return res.json({ code: 'KEY_BANNED', message: 'Key is blacklisted' });
    }

    if (keyDoc.expiresAt && keyDoc.expiresAt < new Date()) {
      return res.json({ code: 'KEY_EXPIRED', message: 'Key has expired' });
    }

    // HWID check
    if (keyDoc.hwid && hwid && keyDoc.hwid !== hwid) {
      return res.json({ code: 'KEY_HWID_LOCKED', message: 'HWID mismatch. Reset your HWID.' });
    }

    // Assign HWID if not set
    if (!keyDoc.hwid && hwid) {
      keyDoc.hwid = hwid;
    }

    keyDoc.totalExecutions += 1;
    keyDoc.lastUsed = new Date();
    await keyDoc.save();

    res.json({
      code: 'KEY_VALID',
      message: 'Key is valid',
      data: {
        auth_expire: keyDoc.expiresAt ? Math.floor(keyDoc.expiresAt.getTime() / 1000) : -1,
        note: keyDoc.note,
        total_executions: keyDoc.totalExecutions,
        discord_id: keyDoc.discordId
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 'UNKNOWN_ERROR', message: 'Server error' });
  }
});

module.exports = app;
