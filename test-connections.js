#!/usr/bin/env node

/**
 * Conversational AI - API Connection Test Script
 * 
 * This script tests all API connections to ensure credentials are working
 * and services are accessible before starting development.
 */

require('dotenv').config();
const https = require('https');
const http = require('http');
const querystring = require('querystring');

// Color codes for console output
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

// Test results tracking
const testResults = {
    twilio: { status: 'pending', details: null },
    retellAI: { status: 'pending', details: null },
    elevenLabs: { status: 'pending', details: null },
    openAI: { status: 'pending', details: null }
};

/**
 * Utility function to print colored console messages
 */
function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

/**
 * Print test header
 */
function printHeader() {
    log('\n' + '='.repeat(80), 'cyan');
    log('🚀 CONVERSATIONAL AI - API CONNECTION TESTS', 'bright');
    log('='.repeat(80), 'cyan');
    log('Testing all API connections with your credentials...\n', 'blue');
}

/**
 * Print test results summary
 */
function printSummary() {
    log('\n' + '='.repeat(80), 'cyan');
    log('📊 TEST RESULTS SUMMARY', 'bright');
    log('='.repeat(80), 'cyan');
    
    let allPassed = true;
    
    Object.entries(testResults).forEach(([service, result]) => {
        const status = result.status === 'passed' ? '✅' : result.status === 'failed' ? '❌' : '⏳';
        const color = result.status === 'passed' ? 'green' : result.status === 'failed' ? 'red' : 'yellow';
        
        log(`${status} ${service.toUpperCase()}: ${result.status.toUpperCase()}`, color);
        
        if (result.details) {
            log(`   Details: ${result.details}`, 'blue');
        }
        
        if (result.status !== 'passed') {
            allPassed = false;
        }
    });
    
    log('\n' + '-'.repeat(80), 'cyan');
    
    if (allPassed) {
        log('🎉 ALL TESTS PASSED! You\'re ready to start building!', 'green');
        log('✅ All API credentials are valid and services are accessible.', 'green');
    } else {
        log('⚠️  Some tests failed. Please check your credentials and try again.', 'yellow');
        log('📝 Review the details above and update your .env file as needed.', 'yellow');
    }
    
    log('='.repeat(80) + '\n', 'cyan');
}

/**
 * Test Twilio API connection
 */
async function testTwilio() {
    log('🔵 Testing Twilio Connection...', 'blue');
    
    try {
        const accountSid = process.env.TWILIO_ACCOUNT_SID;
        const authToken = process.env.TWILIO_AUTH_TOKEN;
        const phoneNumber = process.env.TWILIO_PHONE_NUMBER;
        
        if (!accountSid || !authToken || !phoneNumber) {
            throw new Error('Missing Twilio credentials in .env file');
        }
        
        const client = twilio(accountSid, authToken);
        
        // Test 1: Verify account information
        const account = await client.api.accounts(accountSid).fetch();
        log(`   ✅ Account verified: ${account.friendlyName}`, 'green');
        
        // Test 2: Verify phone number
        const phoneNumbers = await client.incomingPhoneNumbers.list({ limit: 20 });
        const myNumber = phoneNumbers.find(num => num.phoneNumber === phoneNumber);
        
        if (myNumber) {
            log(`   ✅ Phone number verified: ${phoneNumber}`, 'green');
        } else {
            log(`   ⚠️  Phone number ${phoneNumber} not found in account`, 'yellow');
        }
        
        // Test 3: Check SIP domain (if configured)
        const sipDomain = process.env.TWILIO_SIP_DOMAIN;
        if (sipDomain) {
            try {
                const domains = await client.sip.domains.list();
                const myDomain = domains.find(domain => domain.domainName === sipDomain);
                
                if (myDomain) {
                    log(`   ✅ SIP domain verified: ${sipDomain}`, 'green');
                } else {
                    log(`   ⚠️  SIP domain ${sipDomain} not found`, 'yellow');
                }
            } catch (sipError) {
                log(`   ⚠️  Could not verify SIP domain: ${sipError.message}`, 'yellow');
            }
        }
        
        testResults.twilio = {
            status: 'passed',
            details: `Account: ${account.friendlyName}, Phone: ${phoneNumber}`
        };
        
        log('   🎉 Twilio connection successful!\n', 'green');
        
    } catch (error) {
        testResults.twilio = {
            status: 'failed',
            details: error.message
        };
        log(`   ❌ Twilio connection failed: ${error.message}\n`, 'red');
    }
}

/**
 * Test Retell AI API connection
 */
async function testRetellAI() {
    log('🟣 Testing Retell AI Connection...', 'magenta');
    
    try {
        const apiKey = process.env.RETELL_API_KEY;
        const agentId = process.env.RETELL_AGENT_ID;
        
        if (!apiKey || !agentId) {
            throw new Error('Missing Retell AI credentials in .env file');
        }
        
        // Test 1: Verify API key by listing agents
        const response = await axios.get('https://api.retellai.com/v2/agent', {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            }
        });
        
        log(`   ✅ API key verified, found ${response.data.length} agents`, 'green');
        
        // Test 2: Verify specific agent
        const agentResponse = await axios.get(`https://api.retellai.com/v2/agent/${agentId}`, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            }
        });
        
        const agent = agentResponse.data;
        log(`   ✅ Agent verified: ${agent.agent_name || 'Unnamed Agent'}`, 'green');
        log(`   📋 Agent ID: ${agentId}`, 'blue');
        
        testResults.retellAI = {
            status: 'passed',
            details: `Agent: ${agent.agent_name || 'Unnamed'}, ID: ${agentId}`
        };
        
        log('   🎉 Retell AI connection successful!\n', 'green');
        
    } catch (error) {
        let errorMessage = error.message;
        
        if (error.response) {
            errorMessage = `HTTP ${error.response.status}: ${error.response.data?.message || error.response.statusText}`;
        }
        
        testResults.retellAI = {
            status: 'failed',
            details: errorMessage
        };
        log(`   ❌ Retell AI connection failed: ${errorMessage}\n`, 'red');
    }
}

/**
 * Test ElevenLabs API connection
 */
async function testElevenLabs() {
    log('🟡 Testing ElevenLabs Connection...', 'yellow');
    
    try {
        const apiKey = process.env.ELEVENLABS_API_KEY;
        const voiceId = process.env.ELEVENLABS_VOICE_ID;
        
        if (!apiKey) {
            throw new Error('Missing ElevenLabs API key in .env file');
        }
        
        // Test 1: Verify API key by getting user info
        const userResponse = await axios.get('https://api.elevenlabs.io/v1/user', {
            headers: {
                'xi-api-key': apiKey
            }
        });
        
        const user = userResponse.data;
        log(`   ✅ API key verified for user: ${user.first_name || 'User'}`, 'green');
        log(`   💰 Character count: ${user.subscription.character_count}/${user.subscription.character_limit}`, 'blue');
        
        // Test 2: List available voices
        const voicesResponse = await axios.get('https://api.elevenlabs.io/v1/voices', {
            headers: {
                'xi-api-key': apiKey
            }
        });
        
        const voices = voicesResponse.data.voices;
        log(`   ✅ Found ${voices.length} available voices`, 'green');
        
        // Test 3: Verify specific voice ID (if provided)
        if (voiceId) {
            const voice = voices.find(v => v.voice_id === voiceId);
            if (voice) {
                log(`   ✅ Voice verified: ${voice.name}`, 'green');
            } else {
                log(`   ⚠️  Voice ID ${voiceId} not found`, 'yellow');
            }
        }
        
        // Test 4: Test text-to-speech synthesis (small test)
        const testText = "Hello, this is a test of ElevenLabs voice synthesis.";
        const defaultVoice = voiceId || voices[0].voice_id;
        
        const synthesisResponse = await axios.post(
            `https://api.elevenlabs.io/v1/text-to-speech/${defaultVoice}`,
            {
                text: testText,
                model_id: "eleven_flash_v2_5",
                voice_settings: {
                    stability: 0.5,
                    similarity_boost: 0.8
                }
            },
            {
                headers: {
                    'Accept': 'audio/mpeg',
                    'Content-Type': 'application/json',
                    'xi-api-key': apiKey
                },
                responseType: 'arraybuffer'
            }
        );
        
        const audioSize = synthesisResponse.data.byteLength;
        log(`   ✅ Voice synthesis test successful (${audioSize} bytes)`, 'green');
        
        testResults.elevenLabs = {
            status: 'passed',
            details: `User: ${user.first_name || 'User'}, Voices: ${voices.length}, Test synthesis: ${audioSize} bytes`
        };
        
        log('   🎉 ElevenLabs connection successful!\n', 'green');
        
    } catch (error) {
        let errorMessage = error.message;
        
        if (error.response) {
            errorMessage = `HTTP ${error.response.status}: ${error.response.data?.detail?.message || error.response.statusText}`;
        }
        
        testResults.elevenLabs = {
            status: 'failed',
            details: errorMessage
        };
        log(`   ❌ ElevenLabs connection failed: ${errorMessage}\n`, 'red');
    }
}

/**
 * Test OpenAI API connection
 */
async function testOpenAI() {
    log('🟢 Testing OpenAI Connection...', 'green');
    
    try {
        const apiKey = process.env.OPENAI_API_KEY;
        
        if (!apiKey) {
            throw new Error('Missing OpenAI API key in .env file');
        }
        
        const openai = new OpenAI({
            apiKey: apiKey
        });
        
        // Test 1: List available models
        const models = await openai.models.list();
        const gpt4Models = models.data.filter(model => model.id.includes('gpt-4'));
        log(`   ✅ API key verified, found ${gpt4Models.length} GPT-4 models`, 'green');
        
        // Test 2: Test chat completion
        const testPrompt = "Say 'Hello, I am your AI assistant!' in exactly those words.";
        
        const completion = await openai.chat.completions.create({
            model: "gpt-4",
            messages: [
                {
                    role: "user",
                    content: testPrompt
                }
            ],
            max_tokens: 50,
            temperature: 0.7
        });
        
        const response = completion.choices[0].message.content;
        log(`   ✅ Chat completion test successful`, 'green');
        log(`   💬 Response: "${response}"`, 'blue');
        
        // Test 3: Check usage and limits
        log(`   📊 Tokens used: ${completion.usage.total_tokens}`, 'blue');
        
        testResults.openAI = {
            status: 'passed',
            details: `GPT-4 models: ${gpt4Models.length}, Test tokens: ${completion.usage.total_tokens}`
        };
        
        log('   🎉 OpenAI connection successful!\n', 'green');
        
    } catch (error) {
        let errorMessage = error.message;
        
        if (error.response) {
            errorMessage = `HTTP ${error.response.status}: ${error.response.data?.error?.message || error.response.statusText}`;
        }
        
        testResults.openAI = {
            status: 'failed',
            details: errorMessage
        };
        log(`   ❌ OpenAI connection failed: ${errorMessage}\n`, 'red');
    }
}

/**
 * Main test execution function
 */
async function runAllTests() {
    printHeader();
    
    // Run all tests sequentially
    await testTwilio();
    await testRetellAI();
    await testElevenLabs();
    await testOpenAI();
    
    // Print summary
    printSummary();
    
    // Exit with appropriate code
    const allPassed = Object.values(testResults).every(result => result.status === 'passed');
    process.exit(allPassed ? 0 : 1);
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    log(`❌ Unhandled Rejection at: ${promise}, reason: ${reason}`, 'red');
    process.exit(1);
});

// Run the tests
if (require.main === module) {
    runAllTests();
}

module.exports = {
    testTwilio,
    testRetellAI,
    testElevenLabs,
    testOpenAI,
    runAllTests
};
