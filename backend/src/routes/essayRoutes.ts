import express from 'express';
import { prisma } from '../server.js';
import { authenticateToken, type AuthRequest } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', authenticateToken, async (req: AuthRequest, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.sendStatus(401);
        }
        const essays = await prisma.essayDatabase.findMany({
            where: { userId },
            orderBy: { timestamp: 'desc' }
        });

        const serializedEssays = essays.map((essay: any) => ({
            ...essay,
            timestamp: Number(essay.timestamp),
            imageUrls: JSON.parse(essay.imageUrls),
            tokenUsage: essay.tokenUsage ? JSON.parse(essay.tokenUsage) : undefined,
            cost: essay.cost ? JSON.parse(essay.cost) : undefined,
        }));

        res.json(serializedEssays);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch essays' });
    }
});

router.post('/', authenticateToken, async (req: AuthRequest, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.sendStatus(401);
        }
        const essay = req.body;

        const newEssay = await prisma.essayDatabase.create({
            data: {
                timestamp: BigInt(essay.timestamp),
                title: essay.title,
                contentScore: essay.scores.content,
                expressionScore: essay.scores.expression,
                structureScore: essay.scores.structure,
                punctuationScore: essay.scores.punctuation,
                typoBonus: essay.scores.typoBonus,
                totalScore: essay.scores.total,
                transcribedText: essay.transcribedText,
                overallComment: essay.overallComment,
                feedbackContent: essay.feedback.content,
                feedbackExpression: essay.feedback.expression,
                feedbackStructure: essay.feedback.structure,
                feedbackPunctuation: essay.feedback.punctuation,
                tokenUsage: essay.tokenUsage ? JSON.stringify(essay.tokenUsage) : null,
                cost: essay.cost ? JSON.stringify(essay.cost) : null,
                imageUrls: JSON.stringify(essay.imageUrls),
                userId,
            }
        });

        res.json({ success: true, id: newEssay.id });

        // Log the action
        const now = new Date();
        const hktString = now.toLocaleString('en-HK', { timeZone: 'Asia/Hong_Kong' });

        await prisma.userAction.create({
            data: {
                userId,
                actionType: '批改作文',
                modelUsed: 'unknown',
                costHKD: 0,
                actionTimeHKT: hktString
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to save essay' });
    }
});

export default router;
