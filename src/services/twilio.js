/**
 * Twilio Service
 * Handles Twilio API interactions and TwiML generation
 */

const twilio = require('twilio');
const config = require('../config');
const logger = require('../utils/logger');

class TwilioService {
    constructor() {
        this.client = twilio(config.twilio.accountSid, config.twilio.authToken);
        this.VoiceResponse = twilio.twiml.VoiceResponse;
    }

    /**
     * Generate TwiML for initial call greeting
     */
    generateGreeting() {
        const twiml = new this.VoiceResponse();
        
        twiml.say({
            voice: 'alice'
        }, 'Hello! I\'m your AI assistant. Please speak after the tone, and I\'ll respond to you.');
        
        // Gather speech input
        const gather = twiml.gather({
            input: 'speech',
            timeout: 10,
            speechTimeout: 'auto',
            action: 'https://web-production-cb494.up.railway.app/webhook/process-speech',
            method: 'POST'
        });
        
        // If no speech detected, prompt again
        twiml.say({
            voice: 'alice'
        }, 'I didn\'t hear anything. Please try speaking again.');
        
        twiml.redirect('https://web-production-cb494.up.railway.app/webhook/voice');
        
        return twiml.toString();
    }

    /**
     * Generate TwiML to play AI response audio
     */
    generateAudioResponse(audioUrl) {
        const twiml = new this.VoiceResponse();
        
        // Play the AI-generated audio
        twiml.play(audioUrl);
        
        // After playing, gather next input
        const gather = twiml.gather({
            input: 'speech',
            timeout: 10,
            speechTimeout: 'auto',
            action: 'https://web-production-cb494.up.railway.app/webhook/process-speech',
            method: 'POST'
        });
        
        // If no response, prompt for more input instead of ending
        twiml.say({
            voice: 'alice'
        }, 'I didn\'t hear anything. Please speak again or say goodbye if you\'d like to end the call.');
        
        // Redirect back to continue conversation instead of hanging up
        twiml.redirect('https://web-production-cb494.up.railway.app/webhook/process-speech');
        
        return twiml.toString();
    }

    /**
     * Generate TwiML for conversation continuation
     */
    generateContinueConversation() {
        const twiml = new this.VoiceResponse();
        
        // Gather next speech input
        const gather = twiml.gather({
            input: 'speech',
            timeout: 10,
            speechTimeout: 'auto',
            action: 'https://web-production-cb494.up.railway.app/webhook/process-speech',
            method: 'POST'
        });
        
        // If no input, end conversation
        twiml.say({
            voice: 'alice'
        }, 'I didn\'t hear a response. Thank you for calling!');
        
        twiml.hangup();
        
        return twiml.toString();
    }

    /**
     * Generate TwiML for error scenarios
     */
    generateError(message = 'I\'m sorry, something went wrong. Please try again later.') {
        const twiml = new this.VoiceResponse();
        
        twiml.say({
            voice: 'alice'
        }, message);
        
        twiml.hangup();
        
        return twiml.toString();
    }

    /**
     * Generate TwiML to say text directly (fallback)
     */
    generateTextResponse(text) {
        const twiml = new this.VoiceResponse();
        
        // Say the text directly using Twilio's TTS
        twiml.say({
            voice: 'alice'
        }, text);
        
        // Continue conversation
        const gather = twiml.gather({
            input: 'speech',
            timeout: 10,
            speechTimeout: 'auto',
            action: '/webhook/process-speech',
            method: 'POST'
        });
        
        // If no response, prompt for more input
        twiml.say({
            voice: 'alice'
        }, 'Is there anything else I can help you with?');
        
        // Redirect to continue conversation instead of hanging up
        twiml.redirect('/webhook/process-speech');
        
        return twiml.toString();
    }

    /**
     * Make an outbound call (for testing)
     */
    async makeCall(to, webhookUrl) {
        try {
            const call = await this.client.calls.create({
                url: webhookUrl,
                to: to,
                from: config.twilio.phoneNumber,
                statusCallback: '/webhook/status',
                statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
                statusCallbackMethod: 'POST'
            });

            logger.logCall('outbound_initiated', call.sid, {
                to,
                from: config.twilio.phoneNumber
            });

            return call;
        } catch (error) {
            logger.error('Failed to make outbound call', {
                error: error.message,
                to,
                from: config.twilio.phoneNumber
            });
            throw error;
        }
    }

    /**
     * Get call details
     */
    async getCall(callSid) {
        try {
            const call = await this.client.calls(callSid).fetch();
            return call;
        } catch (error) {
            logger.error('Failed to fetch call details', {
                error: error.message,
                callSid
            });
            throw error;
        }
    }

    /**
     * Validate webhook signature (security)
     */
    validateSignature(signature, url, params) {
        return twilio.validateRequest(
            config.twilio.authToken,
            signature,
            url,
            params
        );
    }
}

module.exports = new TwilioService();
