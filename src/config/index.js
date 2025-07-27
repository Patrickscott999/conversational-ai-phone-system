/**
 * Configuration Management
 * Loads and validates environment variables
 */

require('dotenv').config();

const config = {
    // Server Configuration
    server: {
        port: process.env.PORT || 3000,
        host: process.env.HOST || 'localhost',
        environment: process.env.NODE_ENV || 'development'
    },

    // Twilio Configuration
    twilio: {
        accountSid: process.env.TWILIO_ACCOUNT_SID,
        authToken: process.env.TWILIO_AUTH_TOKEN,
        phoneNumber: process.env.TWILIO_PHONE_NUMBER,
        webhookUrl: process.env.TWILIO_WEBHOOK_URL || 'http://localhost:3000/webhook/voice'
    },

    // OpenAI Configuration
    openai: {
        apiKey: process.env.OPENAI_API_KEY,
        model: process.env.OPENAI_MODEL || 'gpt-4',
        maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS) || 150,
        temperature: parseFloat(process.env.OPENAI_TEMPERATURE) || 0.7
    },

    // ElevenLabs Configuration
    elevenlabs: {
        apiKey: process.env.ELEVENLABS_API_KEY,
        voiceId: process.env.ELEVENLABS_VOICE_ID,
        model: process.env.ELEVENLABS_MODEL || 'eleven_flash_v2_5',
        stability: parseFloat(process.env.ELEVENLABS_STABILITY) || 0.5,
        similarityBoost: parseFloat(process.env.ELEVENLABS_SIMILARITY_BOOST) || 0.8,
        style: parseFloat(process.env.ELEVENLABS_STYLE) || 0.0,
        useSpeakerBoost: process.env.ELEVENLABS_USE_SPEAKER_BOOST === 'true'
    },

    // Application Settings
    app: {
        maxConversationLength: parseInt(process.env.MAX_CONVERSATION_LENGTH) || 10,
        responseTimeout: parseInt(process.env.RESPONSE_TIMEOUT) || 30000,
        enableLogging: process.env.ENABLE_LOGGING !== 'false',
        logLevel: process.env.LOG_LEVEL || 'info'
    }
};

/**
 * Validate required configuration
 */
function validateConfig() {
    const required = [
        'twilio.accountSid',
        'twilio.authToken',
        'twilio.phoneNumber',
        'openai.apiKey',
        'elevenlabs.apiKey',
        'elevenlabs.voiceId'
    ];

    const missing = [];

    required.forEach(key => {
        const value = key.split('.').reduce((obj, prop) => obj && obj[prop], config);
        if (!value) {
            missing.push(key);
        }
    });

    if (missing.length > 0) {
        throw new Error(`Missing required configuration: ${missing.join(', ')}`);
    }

    console.log('✅ Configuration validated successfully');
    return true;
}

module.exports = {
    ...config,
    validateConfig
};
