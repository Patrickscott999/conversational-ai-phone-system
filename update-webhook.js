#!/usr/bin/env node

/**
 * Update Twilio Webhook URL
 * Updates your Twilio phone number to use the ngrok webhook URL
 */

require('dotenv').config();
const twilio = require('twilio');

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const phoneNumber = process.env.TWILIO_PHONE_NUMBER;

// Your tunnel URL (LocalTunnel - more stable than ngrok free)
const TUNNEL_URL = 'https://rotten-roses-chew.loca.lt';
const WEBHOOK_URL = `${TUNNEL_URL}/webhook/voice`;
const STATUS_CALLBACK_URL = `${TUNNEL_URL}/webhook/status`;

const client = twilio(accountSid, authToken);

async function updateWebhook() {
    try {
        console.log('🔧 Updating Twilio webhook...');
        console.log(`📞 Phone Number: ${phoneNumber}`);
        console.log(`🌐 Webhook URL: ${WEBHOOK_URL}`);
        console.log(`📊 Status Callback: ${STATUS_CALLBACK_URL}`);
        
        // Find the phone number resource
        const phoneNumbers = await client.incomingPhoneNumbers.list({
            phoneNumber: phoneNumber
        });
        
        if (phoneNumbers.length === 0) {
            throw new Error(`Phone number ${phoneNumber} not found in your Twilio account`);
        }
        
        const phoneNumberSid = phoneNumbers[0].sid;
        console.log(`📋 Phone Number SID: ${phoneNumberSid}`);
        
        // Update the webhook URL
        const updatedNumber = await client.incomingPhoneNumbers(phoneNumberSid)
            .update({
                voiceUrl: WEBHOOK_URL,
                voiceMethod: 'POST',
                statusCallback: STATUS_CALLBACK_URL,
                statusCallbackMethod: 'POST'
            });
        
        console.log('✅ Webhook updated successfully!');
        console.log(`📞 Voice URL: ${updatedNumber.voiceUrl}`);
        console.log(`📊 Status Callback: ${updatedNumber.statusCallback}`);
        console.log('');
        console.log('🎉 Your conversational AI is now ready for phone testing!');
        console.log(`📞 Call ${phoneNumber} to test your AI system!`);
        
    } catch (error) {
        console.error('❌ Failed to update webhook:', error.message);
        
        if (error.code === 20003) {
            console.error('   Authentication failed. Check your Twilio credentials.');
        } else if (error.code === 20404) {
            console.error('   Phone number not found. Check your TWILIO_PHONE_NUMBER.');
        }
        
        console.log('');
        console.log('🔧 Manual Setup Instructions:');
        console.log('1. Go to https://console.twilio.com/');
        console.log('2. Navigate to Phone Numbers → Manage → Active numbers');
        console.log(`3. Click on ${phoneNumber}`);
        console.log(`4. Set Voice webhook to: ${WEBHOOK_URL}`);
        console.log('5. Set HTTP method to POST');
        console.log('6. Save the configuration');
    }
}

// Run the update
updateWebhook();
