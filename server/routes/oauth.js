import { Router } from 'express';
import crypto from 'crypto';

const router = Router();
const NOTION_AUTH_URL = 'https://api.notion.com/v1/oauth/authorize';
const NOTION_TOKEN_URL = 'https://api.notion.com/v1/oauth/token';

function getRedirectUri(req) {
  const base = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3001}`;
  return `${base}/api/notion/callback`;
}

router.get('/auth', (req, res) => {
  const clientId = (process.env.NOTION_CLIENT_ID || '').trim();
  if (!clientId || clientId === 'your_client_id') {
    return res.status(500).json({ error: 'Notion OAuth not configured: set NOTION_CLIENT_ID in server/.env' });
  }
  const state = crypto.randomBytes(16).toString('hex');
  req.session.oauthState = state;
  const redirectUri = getRedirectUri(req);
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    owner: 'user',
    state,
  });
  res.redirect(`${NOTION_AUTH_URL}?${params.toString()}`);
});

router.get('/callback', async (req, res) => {
  const { code, state, error } = req.query;
  const redirectUri = getRedirectUri(req);
  const frontendOrigin = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

  if (error) {
    return res.redirect(`${frontendOrigin}?error=${encodeURIComponent(error)}`);
  }
  if (!code || state !== req.session?.oauthState) {
    return res.redirect(`${frontendOrigin}?error=invalid_callback`);
  }

  const clientId = (process.env.NOTION_CLIENT_ID || '').trim();
  const clientSecret = (process.env.NOTION_CLIENT_SECRET || '').trim();
  if (!clientId || clientId === 'your_client_id' || !clientSecret || clientSecret === 'your_client_secret') {
    return res.redirect(`${frontendOrigin}?error=server_config`);
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  try {
    const tokenRes = await fetch(NOTION_TOKEN_URL, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Basic ${credentials}`,
        'Notion-Version': '2022-06-28',
      },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
      }),
    });

    const data = await tokenRes.json();
    if (!tokenRes.ok) {
      console.error('Notion token error', data);
      return res.redirect(`${frontendOrigin}?error=token_exchange`);
    }

    req.session.notionAccessToken = data.access_token;
    req.session.notionRefreshToken = data.refresh_token;
    req.session.notionBotId = data.bot_id;
    delete req.session.oauthState;
    res.redirect(`${frontendOrigin}?connected=1`);
  } catch (err) {
    console.error(err);
    res.redirect(`${frontendOrigin}?error=server_error`);
  }
});

router.post('/disconnect', (req, res) => {
  req.session.destroy(() => {});
  res.json({ ok: true });
});

router.get('/me', (req, res) => {
  if (!req.session?.notionAccessToken) {
    return res.status(401).json({ error: 'Not connected to Notion' });
  }
  res.json({
    connected: true,
    bot_id: req.session.notionBotId,
  });
});

export { router as oauthRouter };
