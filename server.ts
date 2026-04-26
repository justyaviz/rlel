import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import cors from 'cors';
import session from 'express-session';
import { IgApiClient } from 'instagram-private-api';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());
  app.use(session({
    secret: 'insta-clean-secret',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // Set to true in prod with HTTPS
  }));

  // Store active clients in memory for performance during long analysis
  // In a real production app, we'd persist the session state (cookies) to a DB
  const clients: Record<string, IgApiClient> = {};

  const getClient = (sessionId: string) => {
    if (!clients[sessionId]) {
      clients[sessionId] = new IgApiClient();
    }
    return clients[sessionId];
  };

  // API Routes
  app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    const ig = getClient(req.sessionID);

    try {
      // 0. Basic username scrubbing
      const cleanUsername = username.trim().toLowerCase().replace(/^@/, '');
      
      console.log(`Attempting login for: ${cleanUsername}`);

      // 1. Generate a consistent device for this username
      ig.state.generateDevice(cleanUsername);
      
      // 2. Perform pre-login simulation with multiple steps
      // This makes the request look more like a real app
      await ig.simulate.preLoginFlow();
      
      // Small delay to simulate human typing/delay
      await new Promise(resolve => setTimeout(resolve, 1500));

      // 3. Attempt Login
      const auth = await ig.account.login(cleanUsername, password);
      
      // 4. Perform post-login simulation in background
      process.nextTick(async () => {
        try {
          await ig.simulate.postLoginFlow();
        } catch (e) {
          console.warn('Post-login simulation failed (non-critical):', e);
        }
      });

      res.json({ success: true, user: auth });
    } catch (error: any) {
      console.error('Login error detail:', error);
      
      let friendlyMessage = 'Login failed. Please check your credentials.';
      
      // Handle the specific "account not found" error which is often a bot block
      if (error.name === 'IgLoginInvalidUserError') {
        friendlyMessage = `Instagram sizning "${username}" akkauntingizni topa olmadi. Iltimos, usernameni to'g'ri kiritganingizni tekshiring (belgilarsiz). Agar username to'g'ri bo'lsa, Instagram vaqtincha botlarni bloklayotgan bo'lishi mumkin.`;
      } else if (error.name === 'IgLoginTwoFactorRequiredError') {
        friendlyMessage = 'Ikki bosqichli autentifikatsiya (2FA) yoqilgan. Bu bot hozircha faqat standart loginni qo\'llab-quvvatlaydi.';
      } else if (error.name === 'IgCheckpointError' || error.message?.includes('checkpoint')) {
        friendlyMessage = 'Instagram xavfsizlik tekshiruvi so\'ramoqda. Iltimos, telefoningizda Instagramga kiring va "Bu men edim" (It was me) tugmasini bosing, so\'ng qaytadan urinib ko\'ring.';
      } else if (error.name === 'IgLoginBadPasswordError') {
        friendlyMessage = 'Parol noto\'g\'ri. Iltimos, tekshirib qaytadan kiring.';
      } else if (error.message?.includes('spam')) {
        friendlyMessage = 'Instagram sizning so\'rovingizni spam deb baholadi. Bir oz kuting va qaytadan urinib ko\'ring.';
      }

      res.status(400).json({ 
        success: false, 
        message: friendlyMessage,
        errorType: error.name
      });
    }
  });

  app.post('/api/analyze', async (req, res) => {
    const { count = 100 } = req.body;
    const ig = clients[req.sessionID];

    if (!ig) {
      return res.status(401).json({ success: false, message: 'Not logged in' });
    }

    try {
      const pk = ig.state.cookieUserId;
      
      // Fetch followings
      const followingFeed = ig.feed.accountFollowing(pk);
      const followings = await followingFeed.items();
      
      // Fetch followers
      const followersFeed = ig.feed.accountFollowers(pk);
      const followers = await followersFeed.items();

      const followerIds = new Set(followers.map(f => f.pk));
      
      // Filter for those who don't follow back
      const nonFollowBack = followings
        .filter(f => !followerIds.has(f.pk))
        .slice(0, count);

      res.json({ success: true, profiles: nonFollowBack });
    } catch (error: any) {
      console.error('Analysis error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  app.post('/api/unfollow', async (req, res) => {
    const { userIds } = req.body;
    const ig = clients[req.sessionID];

    if (!ig) {
      return res.status(401).json({ success: false, message: 'Not logged in' });
    }

    try {
      const results = [];
      for (const pk of userIds) {
        await ig.friendship.destroy(pk);
        results.push({ pk, success: true });
        // Add a small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1500));
      }

      res.json({ success: true, results });
    } catch (error: any) {
      console.error('Unfollow error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  app.post('/api/logout', (req, res) => {
    delete clients[req.sessionID];
    req.session.destroy(() => {
      res.json({ success: true });
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
