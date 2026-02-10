/**
 * Passport Configuration for OAuth
 * 
 * Sets up Google and Apple OAuth strategies
 */

const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const AppleStrategy = require('passport-apple').Strategy;
const { get, run } = require('./database');

/**
 * Configure Google OAuth Strategy
 */
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_ID !== 'your-google-client-id') {
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      const email = profile.emails[0].value;
      
      // Check if user exists
      let user = await get('SELECT * FROM users WHERE email = ?', [email]);
      
      if (!user) {
        // Create new user from Google profile
        const result = await run(`
          INSERT INTO users (email, name, google_id, email_verified, created_at)
          VALUES (?, ?, ?, 1, datetime('now'))
        `, [email, profile.displayName, profile.id]);
        
        user = await get('SELECT * FROM users WHERE id = ?', [result.lastID]);
      } else if (!user.google_id) {
        // Link Google account to existing user
        await run('UPDATE users SET google_id = ? WHERE id = ?', [profile.id, user.id]);
      }
      
      return done(null, user);
    } catch (error) {
      return done(error, null);
    }
  }));
}

/**
 * Configure Apple OAuth Strategy
 */
if (process.env.APPLE_CLIENT_ID && process.env.APPLE_CLIENT_ID !== 'your-apple-client-id') {
  passport.use(new AppleStrategy({
    clientID: process.env.APPLE_CLIENT_ID,
    teamID: process.env.APPLE_TEAM_ID,
    keyID: process.env.APPLE_KEY_ID,
    privateKeyLocation: process.env.APPLE_PRIVATE_KEY_PATH,
    callbackURL: process.env.APPLE_CALLBACK_URL,
    passReqToCallback: false
  },
  async (accessToken, refreshToken, idToken, profile, done) => {
    try {
      // Apple provides email only on first login
      const email = profile.email;
      const appleId = profile.sub;
      
      // Check if user exists
      let user = await get('SELECT * FROM users WHERE apple_id = ?', [appleId]);
      
      if (!user && email) {
        user = await get('SELECT * FROM users WHERE email = ?', [email]);
      }
      
      if (!user) {
        // Create new user from Apple profile
        const result = await run(`
          INSERT INTO users (email, name, apple_id, email_verified, created_at)
          VALUES (?, ?, ?, 1, datetime('now'))
        `, [email || `apple_${appleId}@temp.com`, profile.name || 'Apple User', appleId]);
        
        user = await get('SELECT * FROM users WHERE id = ?', [result.lastID]);
      } else if (!user.apple_id) {
        // Link Apple account to existing user
        await run('UPDATE users SET apple_id = ? WHERE id = ?', [appleId, user.id]);
      }
      
      return done(null, user);
    } catch (error) {
      return done(error, null);
    }
  }));
}

// Serialize user for session (not used with JWT, but required by Passport)
passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await get('SELECT * FROM users WHERE id = ?', [id]);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

module.exports = passport;
