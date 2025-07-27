#!/usr/bin/env node

/**
 * Simple API Connection Test - No External Dependencies
 * Tests all API connections using only built-in Node.js modules
 */

require('dotenv').config();
const https = require('https');
const http = require('http');

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

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

/**
 * Make HTTPS request helper
 */
function makeRequest(options, postData = null) {
    return new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                try {
                    const jsonData = JSON.parse(data);
                    resolve({ status: res.statusCode, data: jsonData });
                } catch (e) {
                    resolve({ status: res.statusCode, data: data });
                }
            });
        });
        
        req.on('error', (error) => {
            reject(error);
        });
        
        if (postData) {
            req.write(postData);
        }
        
        req.end();
    });
}

/**
 * Test Twilio API
 */
async function testTwilio() {
    log('🔵 Testing Twilio Connection...', 'blue');
    
    try {
        const accountSid = process.env.TWILIO_ACCOUNT_SID;
        const authToken = process.env.TWILIO_AUTH_TOKEN;
        
        if (!accountSid || !authToken) {
            throw new Error('Missing Twilio credentials');
        }
        
        const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
        
        const options = {
            hostname: 'api.twilio.com',
            port: 443,
            path: `/2010-04-01/Accounts/${accountSid}.json`,
            method: 'GET',
            headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/json'
            }
        };
        
        const response = await makeRequest(options);
        
        if (response.status === 200) {
            log(`   ✅ Twilio API connected successfully!`, 'green');
            log(`   📋 Account: ${response.data.friendly_name}`, 'blue');
            log(`   📞 Phone: ${process.env.TWILIO_PHONE_NUMBER}`, 'blue');
            return true;
        } else {
            throw new Error(`HTTP ${response.status}: ${response.data.message || 'Unknown error'}`);
        }
        
    } catch (error) {
        log(`   ❌ Twilio test failed: ${error.message}`, 'red');
        return false;
    }
}

/**
 * Test Retell AI API
 */
async function testRetellAI() {
    log('🟣 Testing Retell AI Connection...', 'magenta');
    
    try {
        const apiKey = process.env.RETELL_API_KEY;
        const agentId = process.env.RETELL_AGENT_ID;
        
        if (!apiKey || !agentId) {
            throw new Error('Missing Retell AI credentials');
        }
        
        const options = {
            hostname: 'api.retellai.com',
            port: 443,
            path: `/v2/agent/${agentId}`,
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            }
        };
        
        const response = await makeRequest(options);
        
        if (response.status === 200) {
            log(`   ✅ Retell AI connected successfully!`, 'green');
            log(`   🤖 Agent: ${response.data.agent_name || 'Unnamed Agent'}`, 'blue');
            log(`   🆔 Agent ID: ${agentId}`, 'blue');
            return true;
        } else {
            throw new Error(`HTTP ${response.status}: ${response.data.message || 'Unknown error'}`);
        }
        
    } catch (error) {
        log(`   ❌ Retell AI test failed: ${error.message}`, 'red');
        return false;
    }
}

/**
 * Test ElevenLabs API
 */
async function testElevenLabs() {
    log('🟡 Testing ElevenLabs Connection...', 'yellow');
    
    try {
        const apiKey = process.env.ELEVENLABS_API_KEY;
        
        if (!apiKey) {
            throw new Error('Missing ElevenLabs API key');
        }
        
        const options = {
            hostname: 'api.elevenlabs.io',
            port: 443,
            path: '/v1/user',
            method: 'GET',
            headers: {
                'xi-api-key': apiKey,
                'Content-Type': 'application/json'
            }
        };
        
        const response = await makeRequest(options);
        
        if (response.status === 200) {
            log(`   ✅ ElevenLabs connected successfully!`, 'green');
            log(`   👤 User: ${response.data.first_name || 'User'}`, 'blue');
            log(`   💰 Characters: ${response.data.subscription.character_count}/${response.data.subscription.character_limit}`, 'blue');
            
            // Test voice list
            const voiceOptions = {
                hostname: 'api.elevenlabs.io',
                port: 443,
                path: '/v1/voices',
                method: 'GET',
                headers: {
                    'xi-api-key': apiKey
                }
            };
            
            const voiceResponse = await makeRequest(voiceOptions);
            if (voiceResponse.status === 200) {
                log(`   🎤 Available voices: ${voiceResponse.data.voices.length}`, 'blue');
            }
            
            return true;
        } else {
            throw new Error(`HTTP ${response.status}: ${response.data.detail?.message || 'Unknown error'}`);
        }
        
    } catch (error) {
        log(`   ❌ ElevenLabs test failed: ${error.message}`, 'red');
        return false;
    }
}

/**
 * Test OpenAI API
 */
async function testOpenAI() {
    log('🟢 Testing OpenAI Connection...', 'green');
    
    try {
        const apiKey = process.env.OPENAI_API_KEY;
        
        if (!apiKey) {
            throw new Error('Missing OpenAI API key');
        }
        
        const options = {
            hostname: 'api.openai.com',
            port: 443,
            path: '/v1/models',
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            }
        };
        
        const response = await makeRequest(options);
        
        if (response.status === 200) {
            const gpt4Models = response.data.data.filter(model => model.id.includes('gpt-4'));
            log(`   ✅ OpenAI connected successfully!`, 'green');
            log(`   🧠 GPT-4 models available: ${gpt4Models.length}`, 'blue');
            
            // Test a simple chat completion
            const chatData = JSON.stringify({
                model: "gpt-4",
                messages: [
                    {
                        role: "user",
                        content: "Say 'Connection test successful!' in exactly those words."
                    }
                ],
                max_tokens: 20,
                temperature: 0
            });
            
            const chatOptions = {
                hostname: 'api.openai.com',
                port: 443,
                path: '/v1/chat/completions',
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(chatData)
                }
            };
            
            const chatResponse = await makeRequest(chatOptions, chatData);
            if (chatResponse.status === 200) {
                const message = chatResponse.data.choices[0].message.content;
                log(`   💬 Test response: "${message}"`, 'blue');
            }
            
            return true;
        } else {
            throw new Error(`HTTP ${response.status}: ${response.data.error?.message || 'Unknown error'}`);
        }
        
    } catch (error) {
        log(`   ❌ OpenAI test failed: ${error.message}`, 'red');
        return false;
    }
}

/**
 * Main test function
 */
async function runTests() {
    log('\n' + '='.repeat(80), 'cyan');
    log('🚀 CONVERSATIONAL AI - API CONNECTION TESTS', 'bright');
    log('='.repeat(80), 'cyan');
    log('Testing all API connections with your credentials...\n', 'blue');
    
    const results = {
        twilio: await testTwilio(),
        retellAI: await testRetellAI(),
        elevenLabs: await testElevenLabs(),
        openAI: await testOpenAI()
    };
    
    log('\n' + '='.repeat(80), 'cyan');
    log('📊 TEST RESULTS SUMMARY', 'bright');
    log('='.repeat(80), 'cyan');
    
    let allPassed = true;
    
    Object.entries(results).forEach(([service, passed]) => {
        const status = passed ? '✅ PASSED' : '❌ FAILED';
        const color = passed ? 'green' : 'red';
        log(`${status} ${service.toUpperCase()}`, color);
        
        if (!passed) {
            allPassed = false;
        }
    });
    
    log('\n' + '-'.repeat(80), 'cyan');
    
    if (allPassed) {
        log('🎉 ALL TESTS PASSED! You\'re ready to start building!', 'green');
        log('✅ All API credentials are valid and services are accessible.', 'green');
        log('🚀 You can now proceed with Phase 1 of the development plan!', 'green');
    } else {
        log('⚠️  Some tests failed. Please check your credentials and try again.', 'yellow');
        log('📝 Review the error messages above and update your .env file as needed.', 'yellow');
    }
    
    log('='.repeat(80) + '\n', 'cyan');
    
    return allPassed;
}

// Run the tests
if (require.main === module) {
    runTests().then(success => {
        process.exit(success ? 0 : 1);
    }).catch(error => {
        log(`❌ Test execution failed: ${error.message}`, 'red');
        process.exit(1);
    });
}

module.exports = { runTests };
