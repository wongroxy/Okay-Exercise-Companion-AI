import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import quizRoutes from './routes/quizRoutes.js';
import geminiRoutes from './routes/geminiRoutes.js';
import essayRoutes from './routes/essayRoutes.js';
import authRoutes from './routes/authRoutes.js';

const app = express();
export const prisma = new PrismaClient();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' })); // Increase limit for base64 images

app.use('/api/quizzes', quizRoutes);
app.use('/api/gemini', geminiRoutes);
app.use('/api/essays', essayRoutes);
app.use('/api/auth', authRoutes);

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
