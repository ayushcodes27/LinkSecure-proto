import { Router, Request, Response } from 'express';
import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import User from '../models/User';

const router = Router();

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID as string;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET as string;
const OAUTH_REDIRECT_URI = process.env.OAUTH_REDIRECT_URI as string; // e.g. http://localhost:5000/api/auth/google/callback
const CLIENT_BASE_URL = process.env.CLIENT_BASE_URL || 'http://localhost:5173';

if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !OAUTH_REDIRECT_URI) {
	console.warn('Google OAuth env vars missing: GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET/OAUTH_REDIRECT_URI');
}

const oauthClient = new OAuth2Client({
	clientId: GOOGLE_CLIENT_ID,
	clientSecret: GOOGLE_CLIENT_SECRET,
	redirectUri: OAUTH_REDIRECT_URI,
});

router.get('/google/start', async (_req: Request, res: Response) => {
	const scopes = [
		'openid',
		'email',
		'profile',
	];

	const url = oauthClient.generateAuthUrl({
		scope: scopes,
		access_type: 'offline',
		prompt: 'consent',
	});
	res.redirect(url);
});

router.get('/google/callback', async (req: Request, res: Response) => {
	try {
		const code = req.query.code as string | undefined;
		if (!code) return res.status(400).send('Missing code');

		const { tokens } = await oauthClient.getToken(code);
		if (!tokens || !tokens.id_token) return res.status(400).send('Missing id_token');

		// Verify ID token and extract profile
		const ticket = await oauthClient.verifyIdToken({ idToken: tokens.id_token, audience: GOOGLE_CLIENT_ID });
		const payload = ticket.getPayload();
		if (!payload) return res.status(400).send('Invalid token payload');

		const email = payload.email?.toLowerCase();
		const emailVerified = payload.email_verified;
		const firstName = payload.given_name || 'User';
		const lastName = payload.family_name || '';

		if (!email || !emailVerified) {
			return res.status(400).send('Email not verified on Google account');
		}

		// Find or create user
		let user = await User.findOne({ email });
		if (!user) {
			user = await User.create({
				firstName,
				lastName,
				email,
				passwordHash: 'google_oauth', // placeholder; not used for Google accounts
				emailVerified: true, // Google already verified the email
			});
		} else if (!user.emailVerified) {
			// If user exists but email not verified, verify it now since Google verified it
			user.emailVerified = true;
			user.emailVerificationToken = undefined;
			user.emailVerificationExpires = undefined;
			await user.save();
		}

		// Issue our JWT
		const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';
		const token = jwt.sign({ sub: user._id.toString(), email: user.email }, JWT_SECRET, { expiresIn: '7d' });

		// Redirect back to client with token
		const redirectUrl = `${CLIENT_BASE_URL}/login?token=${encodeURIComponent(token)}`;
		return res.redirect(redirectUrl);
	} catch (err) {
		console.error('Google OAuth callback error:', err);
		return res.status(500).send('Authentication failed');
	}
});

export default router;


