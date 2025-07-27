/**
 * Conversation State Management
 * Manages conversation sessions and context for each call
 */

const logger = require('./logger');
const config = require('../config');

class ConversationManager {
    constructor() {
        // In-memory storage for conversation sessions
        // In production, this should be replaced with Redis or a database
        this.sessions = new Map();
        
        // Clean up old sessions every 30 minutes
        setInterval(() => {
            this.cleanupOldSessions();
        }, 30 * 60 * 1000);
    }

    /**
     * Create a new conversation session
     */
    createSession(callSid) {
        const session = {
            callSid,
            startTime: new Date(),
            lastActivity: new Date(),
            messages: [],
            context: {
                userName: null,
                topic: null,
                mood: 'neutral'
            },
            metadata: {
                totalMessages: 0,
                averageResponseTime: 0,
                errors: 0
            }
        };

        this.sessions.set(callSid, session);
        logger.logConversation('session_created', callSid, 'New conversation session started');
        
        return session;
    }

    /**
     * Get existing session or create new one
     */
    getSession(callSid) {
        let session = this.sessions.get(callSid);
        
        if (!session) {
            session = this.createSession(callSid);
        } else {
            session.lastActivity = new Date();
        }
        
        return session;
    }

    /**
     * Add message to conversation history
     */
    addMessage(callSid, role, content, metadata = {}) {
        const session = this.getSession(callSid);
        
        const message = {
            role, // 'user' or 'assistant'
            content,
            timestamp: new Date(),
            metadata
        };

        session.messages.push(message);
        session.metadata.totalMessages++;
        session.lastActivity = new Date();

        // Keep only the last N messages to manage memory and context
        if (session.messages.length > config.app.maxConversationLength) {
            session.messages = session.messages.slice(-config.app.maxConversationLength);
        }

        logger.logConversation('message_added', callSid, content, {
            role,
            messageCount: session.messages.length,
            ...metadata
        });

        return message;
    }

    /**
     * Get conversation history for OpenAI
     */
    getConversationHistory(callSid) {
        const session = this.getSession(callSid);
        
        // Format messages for OpenAI API
        const systemMessage = {
            role: 'system',
            content: this.getSystemPrompt(session)
        };

        const conversationMessages = session.messages.map(msg => ({
            role: msg.role,
            content: msg.content
        }));

        return [systemMessage, ...conversationMessages];
    }

    /**
     * Generate system prompt based on conversation context
     */
    getSystemPrompt(session) {
        const basePrompt = `You are a helpful AI assistant speaking with someone over the phone. 

Key guidelines:
- Keep responses conversational and natural
- Responses should be 1-3 sentences maximum
- Speak as if you're having a phone conversation
- Be friendly, helpful, and engaging
- If asked about your capabilities, mention you can help with questions, provide information, and have conversations
- If the conversation seems to be ending, politely wrap up

Current conversation context:
- Call started: ${session.startTime.toLocaleTimeString()}
- Messages exchanged: ${session.metadata.totalMessages}`;

        // Add contextual information if available
        if (session.context.userName) {
            return basePrompt + `\n- User's name: ${session.context.userName}`;
        }

        if (session.context.topic) {
            return basePrompt + `\n- Current topic: ${session.context.topic}`;
        }

        return basePrompt;
    }

    /**
     * Update conversation context
     */
    updateContext(callSid, updates) {
        const session = this.getSession(callSid);
        
        Object.assign(session.context, updates);
        session.lastActivity = new Date();

        logger.logConversation('context_updated', callSid, 'Context updated', updates);
    }

    /**
     * Record response time for analytics
     */
    recordResponseTime(callSid, responseTime) {
        const session = this.getSession(callSid);
        
        const currentAvg = session.metadata.averageResponseTime;
        const totalMessages = session.metadata.totalMessages;
        
        // Calculate running average
        session.metadata.averageResponseTime = 
            (currentAvg * (totalMessages - 1) + responseTime) / totalMessages;

        logger.debug('Response time recorded', {
            callSid,
            responseTime: `${responseTime}ms`,
            averageResponseTime: `${session.metadata.averageResponseTime.toFixed(0)}ms`
        });
    }

    /**
     * Record error for analytics
     */
    recordError(callSid, error, context = {}) {
        const session = this.getSession(callSid);
        
        session.metadata.errors++;
        
        logger.error('Conversation error recorded', {
            callSid,
            error: error.message,
            errorCount: session.metadata.errors,
            ...context
        });
    }

    /**
     * End conversation session
     */
    endSession(callSid) {
        const session = this.sessions.get(callSid);
        
        if (session) {
            const duration = new Date() - session.startTime;
            
            logger.logConversation('session_ended', callSid, 'Conversation session ended', {
                duration: `${Math.round(duration / 1000)}s`,
                totalMessages: session.metadata.totalMessages,
                averageResponseTime: `${session.metadata.averageResponseTime.toFixed(0)}ms`,
                errors: session.metadata.errors
            });
            
            this.sessions.delete(callSid);
        }
    }

    /**
     * Clean up old sessions (older than 1 hour)
     */
    cleanupOldSessions() {
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        let cleanedCount = 0;

        for (const [callSid, session] of this.sessions.entries()) {
            if (session.lastActivity < oneHourAgo) {
                this.sessions.delete(callSid);
                cleanedCount++;
            }
        }

        if (cleanedCount > 0) {
            logger.info(`Cleaned up ${cleanedCount} old conversation sessions`);
        }
    }

    /**
     * Get session statistics
     */
    getSessionStats(callSid) {
        const session = this.sessions.get(callSid);
        
        if (!session) {
            return null;
        }

        const duration = new Date() - session.startTime;
        
        return {
            callSid,
            duration: Math.round(duration / 1000),
            totalMessages: session.metadata.totalMessages,
            averageResponseTime: Math.round(session.metadata.averageResponseTime),
            errors: session.metadata.errors,
            lastActivity: session.lastActivity
        };
    }

    /**
     * Get all active sessions (for monitoring)
     */
    getActiveSessions() {
        return Array.from(this.sessions.keys()).map(callSid => 
            this.getSessionStats(callSid)
        );
    }
}

// Export singleton instance
module.exports = new ConversationManager();
