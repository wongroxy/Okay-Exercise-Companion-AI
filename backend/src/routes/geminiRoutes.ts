import express from 'express';
import multer from 'multer';
import { GoogleGenerativeAI } from '@google/generative-ai';

const router = express.Router();
const upload = multer(); // memory storage

const geminiApiKey = process.env.GEMINI_API_KEY;
if (!geminiApiKey) {
    console.error('GEMINI_API_KEY is not set');
}
const genAI = new GoogleGenerativeAI(geminiApiKey || '');

function getModel(model: string) {
    const allowed = ['gemini-1.5-pro', 'gemini-1.5-flash'];
    const chosen = allowed.includes(model) ? model : 'gemini-1.5-pro';
    return genAI.getGenerativeModel({ model: chosen });
}

function filesToBase64(files: Express.Multer.File[]) {
    return files.map((f) => f.buffer.toString('base64'));
}

router.post('/grade-quiz', upload.array('images'), async (req, res) => {
    try {
        const files = req.files as Express.Multer.File[];
        const base64Images = filesToBase64(files);
        const model = (req.body.model as string) || 'gemini-1.5-pro';
        const genModel = getModel(model);
        const prompt = `You are grading a quiz based on the provided images. Return a JSON object with fields: score (0-100), feedback (string).`;
        const result = await genModel.generateContent([prompt, ...base64Images]);
        const text = await result.response.text();
        res.json(JSON.parse(text));
    } catch (e) {
        console.error('Error grading quiz', e);
        res.status(500).json({ error: (e as Error).message });
    }
});

router.post('/grade-essay', upload.array('images'), async (req, res) => {
    try {
        const files = req.files as Express.Multer.File[];
        const base64Images = filesToBase64(files);
        const model = (req.body.model as string) || 'gemini-1.5-pro';
        const genModel = getModel(model);
        const prompt = `You are grading an essay based on the provided images. Return a JSON object with fields: score (0-100), feedback (string).`;
        const result = await genModel.generateContent([prompt, ...base64Images]);
        const text = await result.response.text();
        res.json(JSON.parse(text));
    } catch (e) {
        console.error('Error grading essay', e);
        res.status(500).json({ error: (e as Error).message });
    }
});

router.post('/generate-similar-questions', upload.none(), async (req, res) => {
    try {
        const questions = JSON.parse(req.body.questions as string);
        const model = (req.body.model as string) || 'gemini-1.5-pro';
        const genModel = getModel(model);
        const prompt = `Given the following review questions, generate three similar questions for each. Return a JSON array of objects with originalQuestion and generatedQuestions fields.`;
        const result = await genModel.generateContent([prompt, JSON.stringify(questions)]);
        const text = await result.response.text();
        res.json(JSON.parse(text));
    } catch (e) {
        console.error('Error generating similar questions', e);
        res.status(500).json({ error: (e as Error).message });
    }
});

router.post('/regenerate-question', upload.none(), async (req, res) => {
    try {
        const question = JSON.parse(req.body.question as string);
        const model = (req.body.model as string) || 'gemini-1.5-pro';
        const genModel = getModel(model);
        const prompt = `Regenerate the following question to improve clarity while keeping the same intent. Return a JSON object with fields: regeneratedQuestion (string).`;
        const result = await genModel.generateContent([prompt, JSON.stringify(question)]);
        const text = await result.response.text();
        res.json(JSON.parse(text));
    } catch (e) {
        console.error('Error regenerating question', e);
        res.status(500).json({ error: (e as Error).message });
    }
});

export default router;
