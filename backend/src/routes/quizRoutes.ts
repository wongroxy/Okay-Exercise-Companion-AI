import express from 'express';
import { prisma } from '../server.js';
import { authenticateToken, type AuthRequest } from '../middleware/authMiddleware.js';


const router = express.Router();

interface QuestionInput {
    id: string;
    section: string;
    questionNumber: string;
    question: string;
    questionType: string;
    choices?: string[];
    studentAnswer: string;
    isCorrect: boolean;
    correctAnswer?: string;
    explanation?: string;
    boundingBox?: any;
    isSolved: boolean;
    reanswerAttempts: number;
}

// Get all quiz sessions
router.get('/', authenticateToken, async (req: AuthRequest, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.sendStatus(401);
        }
        const sessions = await prisma.quizDatabase.findMany({
            where: { userId },
            include: { questions: true },
            orderBy: { timestamp: 'desc' }
        });

        // Convert BigInt to Number for JSON serialization
        const serializedSessions = sessions.map(session => ({
            ...session,
            timestamp: Number(session.timestamp),
            imageUrls: JSON.parse(session.imageUrls),
            questions: session.questions.map(q => ({
                ...q,
                choices: q.choices ? JSON.parse(q.choices) : undefined,
                boundingBox: q.boundingBox ? JSON.parse(q.boundingBox) : undefined,
            }))
        }));

        res.json(serializedSessions);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch quiz sessions' });
    }
});

// Save a new quiz session
router.post('/', authenticateToken, async (req: AuthRequest, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.sendStatus(401);
        }
        const { timestamp, score, totalQuestions, imageUrls, model, questions } = req.body;

        const session = await prisma.quizDatabase.create({
            data: {
                timestamp: BigInt(timestamp), // Keep BigInt conversion as per original schema
                score,
                totalQuestions,
                imageUrls: JSON.stringify(imageUrls),
                model,
                userId, // Add userId here
                questions: {
                    create: questions.map((q: QuestionInput) => ({
                        id: q.id,
                        section: q.section,
                        questionNumber: q.questionNumber,
                        question: q.question,
                        questionType: q.questionType,
                        choices: q.choices ? JSON.stringify(q.choices) : null,
                        studentAnswer: q.studentAnswer,
                        isCorrect: q.isCorrect,
                        correctAnswer: q.correctAnswer,
                        explanation: q.explanation,
                        boundingBox: q.boundingBox ? JSON.stringify(q.boundingBox) : null,
                        isSolved: q.isSolved,
                        reanswerAttempts: q.reanswerAttempts
                    }))
                }
            },
            include: { questions: true }
        });

        res.json({ success: true, id: session.id });

        // Log the action
        const now = new Date();
        const hktString = now.toLocaleString('en-HK', { timeZone: 'Asia/Hong_Kong' });

        await prisma.userAction.create({
            data: {
                userId,
                actionType: '批改練習',
                modelUsed: model || 'unknown',
                costHKD: 0,
                actionTimeHKT: hktString
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to save quiz session' });
    }
});

// Update a review question
router.put('/:sessionId/questions/:questionId', authenticateToken, async (req: AuthRequest, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.sendStatus(401);
        }
        const { sessionId, questionId } = req.params;
        if (!sessionId || !questionId) {
            return res.status(400).json({ error: 'Missing sessionId or questionId' });
        }
        const updates = req.body;

        // Verify ownership
        const session = await prisma.quizDatabase.findFirst({
            where: {
                timestamp: BigInt(sessionId), // Assuming sessionId in URL is the timestamp
                userId
            }
        });

        if (!session) {
            return res.status(404).json({ error: 'Session not found or unauthorized' });
        }

        const updatedQuestion = await prisma.reviewQuestion.update({
            where: { id: questionId },
            data: {
                ...updates,
                // Handle JSON fields if they are being updated
                choices: updates.choices ? JSON.stringify(updates.choices) : undefined,
                boundingBox: updates.boundingBox ? JSON.stringify(updates.boundingBox) : undefined,
            },
        });

        res.json(updatedQuestion);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to update question' });
    }
});

export default router;
