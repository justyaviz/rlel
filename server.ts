import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import cors from 'cors';
import session from 'express-session';
import { IgApiClient } from 'instagram-private-api';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.set('trust proxy', 1);
  app.use(cors());
  app.use(express.json());
  app.use(session({
    secret: 'insta-clean-secret',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // Set to true in prod with HTTPS
  }));

  // Store active clients in memory
  const clients: Record<string, IgApiClient> = {};

  const getClient = (sessionId: string) => {
    if (!sessionId) return new IgApiClient();
    if (!clients[sessionId]) {
      clients[sessionId] = new IgApiClient();
    }
    return clients[sessionId];
  };

  const apiRouter = express.Router();

  apiRouter.use((req, res, next) => {
    const sessId = req.sessionID || 'unknown';
    console.log(`[API] ${req.method} ${req.url} (SESS: ${sessId})`);
    next();
  });

  // Diagnostic Health Check
  apiRouter.get('/health', (req, res) => {
    res.json({ status: 'ok', uptime: process.uptime() });
  });

  apiRouter.post('/login', async (req, res) => {
    const { username, password, forceManual } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Username va parolni kiriting' });
    }

    // [TEST MODE] Allow users to bypass standard Instagram logic for demo
    if (forceManual === true && password === 'manual-override') {
      console.log(`[LOGIN] Manual override granted for: ${username}`);
      return res.json({ 
        success: true, 
        user: { 
          pk: 999999, 
          username: username.replace(/^@/, ''), 
          full_name: 'Manual Test Mode',
          profile_pic_url: 'https://cdn-icons-png.flaticon.com/512/149/149071.png'
        } 
      });
    }

    const sessionId = req.sessionID || 'default';
    const ig = getClient(sessionId);
    const META_APP_ID = '1455621515814473';

    try {
      const cleanUsername = username.trim().toLowerCase().replace(/^@/, '');
      console.log(`[LOGIN] Starting: ${cleanUsername} with AppID: ${META_APP_ID}`);

      // Set the app id in the state
      ig.state.appId = META_APP_ID;
      
      // 1. More "trusted" iPhone Device profile
      ig.state.generateDevice(cleanUsername);
      
      // 2. Realistic Simulation Flow with delays
      try {
        await ig.simulate.preLoginFlow();
        await new Promise(resolve => setTimeout(resolve, 3000)); // Organic human-like pause
      } catch (e) {
        console.warn('[LOGIN] Pre-flow warning');
      }

      // 3. Final Prep
      const auth = await ig.account.login(cleanUsername, password);
      console.log(`[LOGIN] Success: ${cleanUsername}`);

      const userData = {
        pk: auth.pk,
        username: auth.username,
        full_name: auth.full_name,
        profile_pic_url: auth.profile_pic_url
      };

      process.nextTick(async () => {
        try { await ig.simulate.postLoginFlow(); } catch (e) {}
      });

      res.json({ success: true, user: userData });
    } catch (error: any) {
      // Clear client on failure to ensure a fresh state for next attempt
      delete clients[sessionId];
      
      const msg = (error.message || '').toLowerCase();
      const errName = error.name || 'UnknownError';
      console.error(`[LOGIN ERROR] Name: ${errName}, Msg: ${msg}`);
      
      let friendlyMessage = 'Login muvaffaqiyatsiz.';

      // Check for challenge/checkpoint FIRST (most specific and common)
      if (msg.includes('challenge') || msg.includes('checkpoint') || errName === 'IgCheckpointError') {
        friendlyMessage = 'Xavfsizlik tekshiruvi (Verification required). Iltimos, telefoningizda Instagramga kiring va "BU MEN EDIM" tugmasini bosing.';
      } 
      // Check for bad password SECOND
      else if (errName === 'IgLoginBadPasswordError' || msg.includes('password')) {
        friendlyMessage = 'Parol noto\'g\'ri.';
      }
      // Check for invalid user THIRD (excluding cases that look like challenges)
      else if (errName === 'IgLoginInvalidUserError' || msg.includes('invalid_user')) {
        friendlyMessage = `Instagram "@${username}" akkauntini topa olmadi. Username to'g'riligini tekshiring.`;
      }
      // Check for spam FOURTH
      else if (msg.includes('spam') || msg.includes('feedback') || msg.includes('400')) {
        friendlyMessage = 'Instagram vaqtincha botlarni bloklamoqda (Spam/Block). Bir ozdan so\'ng urinib ko\'ring.';
      }

      res.status(400).json({ 
        success: false, 
        message: friendlyMessage,
        details: error.message,
        errorType: error.name
      });
    }
  });

  apiRouter.post('/analyze', async (req, res) => {
    const { count = 50 } = req.body;
    const ig = clients[req.sessionID];

    if (!ig) return res.status(401).json({ success: false, message: 'Seans muddati tugagan' });

    try {
      const pk = ig.state.cookieUserId;
      const followingFeed = ig.feed.accountFollowing(pk);
      const followings = await followingFeed.items();
      
      const followersFeed = ig.feed.accountFollowers(pk);
      const followers = await followersFeed.items();

      const followerIds = new Set(followers.map(f => f.pk));
      const nonFollowBack = followings
        .filter(f => !followerIds.has(f.pk))
        .slice(0, count);

      res.json({ success: true, profiles: nonFollowBack });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

  apiRouter.post('/unfollow', async (req, res) => {
    const { userIds } = req.body;
    const ig = clients[req.sessionID];

    if (!ig) return res.status(401).json({ success: false, message: 'Seans muddati tugagan' });

    try {
      const results = [];
      for (const pk of userIds) {
        await ig.friendship.destroy(pk);
        results.push({ pk, success: true });
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      res.json({ success: true, results });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

  apiRouter.post('/logout', (req, res) => {
    delete clients[req.sessionID];
    req.session.destroy(() => res.json({ success: true }));
  });

  // API Catch-all 404
  apiRouter.use((req, res) => {
    console.warn(`[API 404] ${req.method} ${req.url}`);
    res.status(404).json({ 
      success: false, 
      message: `API yo'nalishi topilmadi: ${req.method} ${req.originalUrl}`,
      details: 'Check server logs for path matching issues.'
    });
  });

  app.use('/api', apiRouter);

  // Global Error Handler
  app.use((err: any, req: any, res: any, next: any) => {
    console.error('[SERVER ERROR]', err);
    res.status(500).json({ 
      success: false, 
      message: 'Serverda ichki xatolik yuz berdi.',
      details: err.message 
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
