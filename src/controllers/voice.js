/**
 * Voice Controller
 * Handles Twilio webhook requests for voice interactions
 */

const twilioService = require('../services/twilio');
const openaiService = require('../services/openai');
const elevenLabsService = require('../services/elevenlabs');
const conversationManager = require('../utils/conversation');
const logger = require('../utils/logger');
const config = require('../config');

class VoiceController {
    /**
     * Handle incoming voice calls
     */
    async handleIncomingCall(req, res) {
        try {
            const { CallSid, From, To } = req.body;
            
            logger.logCall('incoming', CallSid, {
                from: From,
                to: To
            });

            // Create new conversation session
            conversationManager.createSession(CallSid);

            // Generate greeting TwiML
            const twiml = twilioService.generateGreeting();
            
            res.type('text/xml');
            res.send(twiml);

        } catch (error) {
            logger.error('Error handling incoming call', {
                error: error.message,
                callSid: req.body.CallSid
            });

            const errorTwiml = twilioService.generateError();
            res.type('text/xml');
            res.send(errorTwiml);
        }
    }

    /**
     * Process speech input from user
     */
    async processSpeech(req, res) {
        const startTime = Date.now();
        
        try {
            const { CallSid, SpeechResult, Confidence } = req.body;
            
            if (!SpeechResult) {
                logger.warn('No speech result received', { callSid: CallSid });
                
                const twiml = twilioService.generateContinueConversation();
                res.type('text/xml');
                res.send(twiml);
                return;
            }

            logger.logConversation('speech_received', CallSid, SpeechResult, {
                confidence: Confidence
            });

            // Add user message to conversation
            conversationManager.addMessage(CallSid, 'user', SpeechResult, {
                confidence: parseFloat(Confidence) || 0
            });

            // Get conversation history for OpenAI
            const conversationHistory = conversationManager.getConversationHistory(CallSid);
            
            // Generate AI response using OpenAI
            const aiResult = await openaiService.generatePhoneResponse(conversationHistory);
            
            // Update conversation context based on AI analysis
            if (aiResult.analysis) {
                conversationManager.updateContext(CallSid, aiResult.analysis);
            }
            
            // Add AI response to conversation
            conversationManager.addMessage(CallSid, 'assistant', aiResult.response, {
                tokens: aiResult.usage?.total_tokens || 0,
                model: config.openai.model,
                processingTime: aiResult.duration
            });

            // Generate high-quality voice using ElevenLabs
            const session = conversationManager.getSession(CallSid);
            const messageIndex = session.metadata.totalMessages;
            let twiml;
            
            try {
                const voiceResult = await elevenLabsService.generatePhoneSpeech(
                    aiResult.response, 
                    CallSid, 
                    messageIndex
                );
                
                // Generate TwiML to play the AI voice
                twiml = twilioService.generateAudioResponse(voiceResult.audioUrl);
                
                logger.logConversation('voice_generated', CallSid, aiResult.response, {
                    audioUrl: voiceResult.audioUrl,
                    voiceDuration: voiceResult.duration,
                    audioSize: voiceResult.audioSize
                });
                
            } catch (voiceError) {
                logger.error('ElevenLabs voice generation failed, falling back to Twilio TTS', {
                    error: voiceError.message,
                    callSid: CallSid
                });
                
                // Fallback to Twilio's TTS if ElevenLabs fails
                twiml = twilioService.generateTextResponse(aiResult.response);
            }
            
            // Record response time
            const responseTime = Date.now() - startTime;
            conversationManager.recordResponseTime(CallSid, responseTime);

            res.type('text/xml');
            res.send(twiml);

        } catch (error) {
            logger.error('Error processing speech', {
                error: error.message,
                callSid: req.body.CallSid
            });

            if (req.body.CallSid) {
                conversationManager.recordError(req.body.CallSid, error);
            }

            const errorTwiml = twilioService.generateError('I\'m sorry, I had trouble understanding. Could you try again?');
            res.type('text/xml');
            res.send(errorTwiml);
        }
    }

    /**
     * Handle call status updates
     */
    async handleCallStatus(req, res) {
        try {
            const { CallSid, CallStatus, Duration } = req.body;
            
            logger.logCall('status_update', CallSid, {
                status: CallStatus,
                duration: Duration
            });

            // End conversation session when call completes
            if (CallStatus === 'completed' || CallStatus === 'failed' || CallStatus === 'busy' || CallStatus === 'no-answer') {
                conversationManager.endSession(CallSid);
            }

            res.sendStatus(200);

        } catch (error) {
            logger.error('Error handling call status', {
                error: error.message,
                callSid: req.body.CallSid
            });
            
            res.sendStatus(500);
        }
    }

    /**
     * Generate simple AI response (temporary - will be replaced with OpenAI in Phase 3)
     */
    generateSimpleResponse(userInput) {
        const input = userInput.toLowerCase();
        
        // Simple pattern matching for demo purposes
        if (input.includes('hello') || input.includes('hi')) {
            return 'Hello! It\'s great to hear from you. How can I help you today?';
        }
        
        if (input.includes('how are you')) {
            return 'I\'m doing well, thank you for asking! I\'m here and ready to help. What\'s on your mind?';
        }
        
        if (input.includes('weather')) {
            return 'I don\'t have access to current weather data, but I\'d be happy to help you with other questions or have a conversation about something else.';
        }
        
        if (input.includes('time')) {
            const now = new Date();
            return `The current time is ${now.toLocaleTimeString()}. Is there anything else I can help you with?`;
        }
        
        if (input.includes('name')) {
            return 'I\'m your AI assistant! I\'m here to help answer questions and have conversations with you. What would you like to talk about?';
        }
        
        if (input.includes('bye') || input.includes('goodbye')) {
            return 'Thank you for calling! It was great talking with you. Have a wonderful day!';
        }
        
        // Default response
        return `I heard you say "${userInput}". That's interesting! I'm still learning, but I'm here to help. What else would you like to talk about?`;
    }

    /**
     * Get conversation statistics (for monitoring)
     */
    async getConversationStats(req, res) {
        try {
            const activeSessions = conversationManager.getActiveSessions();
            
            res.json({
                activeSessions: activeSessions.length,
                sessions: activeSessions
            });

        } catch (error) {
            logger.error('Error getting conversation stats', {
                error: error.message
            });
            
            res.status(500).json({
                error: 'Failed to get conversation statistics'
            });
        }
    }

    /**
     * Test endpoint to make an outbound call
     */
    async makeTestCall(req, res) {
        try {
            const { to } = req.body;
            
            if (!to) {
                return res.status(400).json({
                    error: 'Phone number (to) is required'
                });
            }

            const webhookUrl = `${config.twilio.webhookUrl || 'http://localhost:3000/webhook/voice'}`;
            const call = await twilioService.makeCall(to, webhookUrl);

            res.json({
                success: true,
                callSid: call.sid,
                to: call.to,
                from: call.from,
                status: call.status
            });

        } catch (error) {
            logger.error('Error making test call', {
                error: error.message,
                to: req.body.to
            });
            
            res.status(500).json({
                error: 'Failed to make test call',
                message: error.message
            });
        }
    }
}

module.exports = new VoiceController();
