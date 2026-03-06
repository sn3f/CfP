import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { convertToModelMessages, streamText } from 'ai';
import bodyParser from 'body-parser';
import cors from 'cors';
import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';

import { createRemoteJWKSet, jwtVerify } from 'jose';

const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: '4mb' }));

// Check for API key on boot
if (!process.env.OPENROUTER_API_KEY) {
    console.error('❌ Missing OPENROUTER_API_KEY in environment variables.');
    process.exit(1);
}

if (
    !process.env.OAUTH2_JWK_URI ||
    !process.env.OAUTH2_ISSUER_URI
) {
    console.error('❌ Missing Auth environment variables.');
    console.error('   Ensure OAUTH2_JWK_URI, OAUTH2_ISSUER_URI are set.');
    process.exit(1);
}

const JWKS = createRemoteJWKSet(new URL(process.env.OAUTH2_JWK_URI));

// Create OpenRouter model provider
const openrouter = createOpenRouter({
    apiKey: process.env.OPENROUTER_API_KEY!,
});

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
    res.status(200).json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        service: 'chat-server',
    });
});

const authMiddleware = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized: Missing or invalid token' });
    }

    const token = authHeader.substring(7); // Remove 'Bearer '

    try {
        const { payload } = await jwtVerify(token, JWKS, {
            issuer: process.env.OAUTH2_ISSUER_URI,
        });

        (req as any).user = payload;
        console.log(`Request validated for user: ${payload.preferred_username}`);

        next();
    } catch (err: any) {
        console.warn('Authentication failed:', err.message);
        if (err.code === 'ERR_JWT_EXPIRED') {
            return res.status(401).json({ error: 'Unauthorized: Token expired' });
        }
        return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }
};

app.post('/api/chat', authMiddleware, async (req: Request, res: Response) => {
    try {
        const { messages, cfpContext, model } = req.body;
        const modelUsed = model || 'openai/gpt-5-nano';

        console.log(`Model Used: ${modelUsed}`);

        if (!messages || !Array.isArray(messages)) {
            console.warn('Missing or invalid messages in request body');
            throw new Error('Invalid messages format.');
        }

        let modelMessages = [];
        try {
            modelMessages = convertToModelMessages(messages);
        } catch (err) {
            console.error('❌ Failed to convert messages to ModelMessage[]', err);
            throw err;
        }

        if (cfpContext) {
            console.log('CfP Context Provided');
            modelMessages.unshift({
                role: 'system',
                content: `Proposal context:\n${cfpContext}`,
            });
        }

        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.setHeader('Transfer-Encoding', 'chunked');
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('Cache-Control', 'no-cache, no-transform');
        res.setHeader('Connection', 'keep-alive');

        const result = streamText({
            model: openrouter(modelUsed),
            system: `
              You are an AI assistant that helps users interpret, analyze, and summarize Calls for Proposals (CfPs) from the International Labour Organization (ILO).
            
              ## Core Principles
              - **Priority Source:** Treat the provided CfP context as the primary and authoritative source of truth.
              - **Specifics vs. General Knowledge:** - For proposal-specific details (deadlines, budget, eligibility, evaluation criteria), you must ONLY use the provided context. If it's missing, state it is unavailable.
                - For broader context regarding the ILO mission, "Decent Work" agenda, or general strategic objectives not explicitly detailed in the CfP, you may utilize your internal knowledge base.
              - Maintain a professional, neutral, and concise tone, suitable for an international project proposal audience.
            
              ## Responsibilities
              - Extract and emphasize key facts such as:
                - Eligibility criteria (who can apply, e.g. governments, NGOs, research institutions).
                - Deadlines and submission dates.
                - Thematic focus, sectors, or target regions.
                - Activities supported and funding amounts.
                - Administrative requirements and evaluation criteria.
              - Provide summaries in well-structured text with clear paragraphs and, where suitable, bullet points.
              - If asked for advice, frame recommendations explicitly in terms of what the CfP text suggests or implies.
            
              ## Output Guidelines
              - **The Disclaimer Rule:** If you answer a question using general ILO knowledge because the specific CfP text does not cover it (e.g., alignment with ILO global mission), you MUST preface your answer with a disclaimer: *"While not explicitly stated in this specific CfP context, generally within the ILO..."*
              - Do NOT hallucinate specific requirements (like budget caps or deadlines) if they are not in the text.
              - Keep answers as short as possible but as detailed as necessary: prioritize clarity and signal important details.
              - If multiple languages are present, respond in the language used by the user’s query. 
              - Do not include raw JSON unless explicitly asked.
              - If the user asks about something outside the CfP and unrelated to the ILO, politely decline.
            
              ## Edge Cases
              - If context is missing or empty, tell the user you have no CfP to analyze.
              - If the question is vague, ask clarifying questions.
              - If the CfP provides a PDF filename, URL, or referenced attachment but no content, acknowledge that and recommend consulting the source directly.
            
              ## Important
              - Context will be inserted in the prompt as:
                "Proposal context: {cfp JSON or summary}"
            `,
            messages: modelMessages,
        });

        // Pipe back as SSE events
        result.pipeUIMessageStreamToResponse(res);
    } catch (err) {
        console.error('Unhandled error in /api/chat route:', err);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Internal server error' });
        }
    }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Listening On: http://localhost:${PORT}`);
});
