#!/usr/bin/env node

/**
 * Local Conversation Test
 * Simulates a phone conversation to test the AI system locally
 */

const axios = require('axios');
const readline = require('readline');

const SERVER_URL = 'http://localhost:3000';

// Create readline interface for user input
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

/**
 * Simulate processing speech input
 */
async function processSpeechInput(text, callSid) {
    try {
        log(`\n🎤 You said: "${text}"`, 'cyan');
        log('🤖 AI is thinking...', 'yellow');
        
        const response = await axios.post(`${SERVER_URL}/webhook/process-speech`, {
            CallSid: callSid,
            SpeechResult: text,
            Confidence: '0.95'
        }, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        // Parse TwiML response to extract what the AI said
        const twimlResponse = response.data;
        
        // Simple regex to extract text from TwiML <Say> or <Play> tags
        const sayMatch = twimlResponse.match(/<Say[^>]*>(.*?)<\/Say>/i);
        const playMatch = twimlResponse.match(/<Play>(.*?)<\/Play>/i);
        
        if (sayMatch) {
            log(`🤖 AI responds: "${sayMatch[1]}"`, 'green');
        } else if (playMatch) {
            log(`🎵 AI generated voice file: ${playMatch[1]}`, 'green');
            log(`🤖 AI is speaking with ElevenLabs voice synthesis!`, 'green');
        } else {
            log(`🤖 AI sent TwiML response (raw): ${twimlResponse.substring(0, 200)}...`, 'green');
        }

        return true;

    } catch (error) {
        log(`❌ Error processing speech: ${error.message}`, 'red');
        if (error.response) {
            log(`   Server response: ${error.response.status} ${error.response.statusText}`, 'red');
        }
        return false;
    }
}

/**
 * Start a simulated phone conversation
 */
async function startConversation() {
    const callSid = `test_call_${Date.now()}`;
    
    log('\n' + '='.repeat(80), 'cyan');
    log('📞 CONVERSATIONAL AI - LOCAL TEST', 'bright');
    log('='.repeat(80), 'cyan');
    log('Simulating a phone conversation with your AI system...', 'blue');
    log(`Call ID: ${callSid}`, 'blue');
    log('\nType your messages and press Enter. Type "bye" or "quit" to end.\n', 'yellow');

    // Simulate incoming call
    try {
        log('📞 Simulating incoming call...', 'blue');
        const response = await axios.post(`${SERVER_URL}/webhook/voice`, {
            CallSid: callSid,
            From: '+1234567890',
            To: '+15075166292'
        });
        
        log('✅ Call connected! AI is ready to talk.', 'green');
        
    } catch (error) {
        log(`❌ Failed to simulate incoming call: ${error.message}`, 'red');
        return;
    }

    // Start conversation loop
    const askQuestion = () => {
        rl.question('You: ', async (input) => {
            if (input.toLowerCase() === 'bye' || input.toLowerCase() === 'quit') {
                log('\n👋 Ending conversation...', 'yellow');
                
                // Simulate call end
                try {
                    await axios.post(`${SERVER_URL}/webhook/status`, {
                        CallSid: callSid,
                        CallStatus: 'completed',
                        Duration: '120'
                    });
                    log('📞 Call ended successfully!', 'green');
                } catch (error) {
                    log(`⚠️  Warning: Could not properly end call: ${error.message}`, 'yellow');
                }
                
                rl.close();
                return;
            }

            if (input.trim()) {
                const success = await processSpeechInput(input.trim(), callSid);
                if (success) {
                    log(''); // Add spacing
                    askQuestion(); // Continue conversation
                } else {
                    log('❌ Conversation failed. Ending...', 'red');
                    rl.close();
                }
            } else {
                askQuestion(); // Ask again if empty input
            }
        });
    };

    askQuestion();
}

/**
 * Check if server is running
 */
async function checkServer() {
    try {
        const response = await axios.get(`${SERVER_URL}/health`);
        log('✅ Server is running and healthy!', 'green');
        log(`   Status: ${response.data.status}`, 'blue');
        log(`   Services: Twilio: ${response.data.services.twilio}, OpenAI: ${response.data.services.openai}, ElevenLabs: ${response.data.services.elevenlabs}`, 'blue');
        return true;
    } catch (error) {
        log('❌ Server is not running or not accessible!', 'red');
        log('   Make sure your server is running on localhost:3000', 'red');
        log('   Run: npm start', 'red');
        return false;
    }
}

/**
 * Main function
 */
async function main() {
    log('🔍 Checking server status...', 'blue');
    
    const serverRunning = await checkServer();
    if (!serverRunning) {
        process.exit(1);
    }

    await startConversation();
}

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
    log('\n\n👋 Goodbye!', 'yellow');
    process.exit(0);
});

// Run the test
if (require.main === module) {
    main().catch(error => {
        log(`❌ Test failed: ${error.message}`, 'red');
        process.exit(1);
    });
}
