import express from 'express';
import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import { prisma } from '../server.js';

const router = express.Router();
const client = new OAuth2Client(); // Client ID is optional here if we just want to verify signature, but better to pass it if we have it.
const JWT_SECRET = process.env.JWT_SECRET || 'default-dev-secret';

router.post('/google', async (req, res) => {
    const { token } = req.body;

    if (!token) {
        return res.status(400).json({ error: 'Token is required' });
    }

    try {
        // Verify the Google ID token
        const ticket = await client.verifyIdToken({
            idToken: token,
            // audience: process.env.GOOGLE_CLIENT_ID, // Specify the CLIENT_ID of the app that accesses the backend
        });
        const payload = ticket.getPayload();

        if (!payload) {
            return res.status(400).json({ error: 'Invalid token payload' });
        }

        const { sub: googleId, email, name, picture } = payload;

        if (!email) {
            return res.status(400).json({ error: 'Email is required from Google' });
        }

        // Find or create user
        let user = await prisma.user.findUnique({
            where: { googleId },
        });

        if (!user) {
            user = await prisma.user.create({
                data: {
                    googleId,
                    email,
                    name: name || 'Unknown',
                    avatarUrl: picture || null,

                },
            });
        } else {
            // Update avatar if changed
            if (user.avatarUrl !== picture) {
                user = await prisma.user.update({
                    where: { id: user.id },
                    data: { avatarUrl: picture || null }
                });
            }
        }

        // Generate JWT
        const sessionToken = jwt.sign(
            { id: user.id, email: user.email },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        // Log the login
        const now = new Date();
        const hktString = now.toLocaleString('en-HK', { timeZone: 'Asia/Hong_Kong' });

        await prisma.userLogin.create({
            data: {
                userId: user.id,
                loginTimeHKT: hktString
            }
        });

        res.json({
            token: sessionToken,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                avatarUrl: user.avatarUrl,
            },
        });
    } catch (error) {
        console.error('Google auth error:', error);
        res.status(401).json({ error: 'Authentication failed' });
    }
});

export default router;
