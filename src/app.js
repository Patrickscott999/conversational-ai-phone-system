/**
 * Main Express Application
 * Conversational AI Server with Twilio + ElevenLabs + OpenAI
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const bodyParser = require('body-parser');

const config = require('./config');
const logger = require('./utils/logger');

// Initialize Express app
const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Request logging middleware
app.use((req, res, next) => {
    logger.info(`${req.method} ${req.path}`, {
        ip: req.ip,
        userAgent: req.get('User-Agent')
    });
    next();
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        services: {
            twilio: !!config.twilio.accountSid,
            openai: !!config.openai.apiKey,
            elevenlabs: !!config.elevenlabs.apiKey
        }
    });
});

// Root endpoint
app.get('/', (req, res) => {
    res.json({
        message: 'Conversational AI Server',
        status: 'running',
        endpoints: {
            health: '/health',
            voice: '/webhook/voice',
            status: '/webhook/status'
        }
    });
});

// Import voice controller
const voiceController = require('./controllers/voice');

// Voice webhook endpoints
app.post('/webhook/voice', voiceController.handleIncomingCall.bind(voiceController));
app.post('/webhook/process-speech', voiceController.processSpeech.bind(voiceController));
app.post('/webhook/status', voiceController.handleCallStatus.bind(voiceController));

// Import services for testing
const openaiService = require('./services/openai');
const elevenLabsService = require('./services/elevenlabs');
const path = require('path');

// API endpoints for monitoring and testing
app.get('/api/conversations', voiceController.getConversationStats.bind(voiceController));
app.post('/api/test-call', voiceController.makeTestCall.bind(voiceController));

// Serve audio files for Twilio
app.use('/audio', express.static(path.join(process.cwd(), 'temp', 'audio')));

// OpenAI test endpoint
app.get('/api/test-openai', async (req, res) => {
    try {
        const result = await openaiService.testConnection();
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ElevenLabs test endpoint
app.get('/api/test-elevenlabs', async (req, res) => {
    try {
        const result = await elevenLabsService.testConnection();
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Error handling middleware
app.use((error, req, res, next) => {
    logger.error('Unhandled error', {
        error: error.message,
        stack: error.stack,
        path: req.path,
        method: req.method
    });
    
    res.status(500).json({
        error: 'Internal server error',
        message: config.server.environment === 'development' ? error.message : 'Something went wrong'
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: 'Not found',
        message: `Endpoint ${req.method} ${req.path} not found`
    });
});

/**
 * Start the server
 */
function startServer() {
    try {
        // Validate configuration
        config.validateConfig();
        
        // Start listening
        const server = app.listen(config.server.port, config.server.host, () => {
            logger.info(`🚀 Conversational AI Server started`, {
                host: config.server.host,
                port: config.server.port,
                environment: config.server.environment,
                endpoints: {
                    health: `http://${config.server.host}:${config.server.port}/health`,
                    voice: `http://${config.server.host}:${config.server.port}/webhook/voice`
                }
            });
            
            logger.info('📋 Configuration Summary', {
                twilio: {
                    phone: config.twilio.phoneNumber,
                    webhookUrl: config.twilio.webhookUrl
                },
                openai: {
                    model: config.openai.model,
                    maxTokens: config.openai.maxTokens
                },
                elevenlabs: {
                    model: config.elevenlabs.model,
                    voiceId: config.elevenlabs.voiceId
                }
            });
        });
        
        // Graceful shutdown
        process.on('SIGTERM', () => {
            logger.info('SIGTERM received, shutting down gracefully');
            server.close(() => {
                logger.info('Server closed');
                process.exit(0);
            });
        });
        
        process.on('SIGINT', () => {
            logger.info('SIGINT received, shutting down gracefully');
            server.close(() => {
                logger.info('Server closed');
                process.exit(0);
            });
        });
        
        return server;
        
    } catch (error) {
        logger.error('Failed to start server', { error: error.message });
        process.exit(1);
    }
}

// Start server if this file is run directly
if (require.main === module) {
    startServer();
}

module.exports = { app, startServer };
