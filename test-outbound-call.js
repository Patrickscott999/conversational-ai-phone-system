#!/usr/bin/env node

/**
 * Test Outbound Call - Verify Twilio phone number works
 * This will make a test call TO your phone number to verify it's working
 */

require('dotenv').config();
const twilio = require('twilio');

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_PHONE_NUMBER;

const client = twilio(accountSid, authToken);

async function testOutboundCall() {
    console.log('🔍 Testing if Twilio can make outbound calls...');
    console.log(`📞 From: ${fromNumber}`);
    
    // Ask user for their phone number to test
    console.log('\n📱 To test your phone number, we need to call YOUR personal phone.');
    console.log('⚠️  WARNING: This will use Twilio credits and make an actual call!');
    console.log('');
    console.log('If you want to proceed:');
    console.log('1. Uncomment the line below and add your personal phone number');
    console.log('2. Run this script again');
    console.log('');
    console.log('// const toNumber = "+1234567890"; // Replace with YOUR phone number');
    console.log('');
    
    // Uncomment and modify this line to test:
    // const toNumber = "+1234567890"; // Replace with YOUR phone number
    
    const toNumber = null; // Set to null to prevent accidental calls
    
    if (!toNumber) {
        console.log('🛑 Test call not configured. See instructions above.');
        return;
    }
    
    try {
        console.log(`📞 Making test call from ${fromNumber} to ${toNumber}...`);
        
        const call = await client.calls.create({
            from: fromNumber,
            to: toNumber,
            twiml: `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="alice">
        Hello! This is a test call from your Twilio number ${fromNumber}. 
        Your phone system is working correctly! 
        This confirms that your Twilio account and phone number are functional.
        Goodbye!
    </Say>
    <Hangup/>
</Response>`
        });
        
        console.log('✅ Test call initiated successfully!');
        console.log(`📋 Call SID: ${call.sid}`);
        console.log(`📞 Status: ${call.status}`);
        console.log('');
        console.log('🎯 If you receive this call, it means:');
        console.log('   - Your Twilio account is working');
        console.log('   - Your phone number can make calls');
        console.log('   - The issue is with INBOUND call routing');
        console.log('');
        console.log('🔍 If you DON\'T receive the call, it means:');
        console.log('   - There\'s an issue with your Twilio account');
        console.log('   - Your phone number might have restrictions');
        console.log('   - Your account might need verification');
        
    } catch (error) {
        console.log('❌ Test call failed:', error.message);
        
        if (error.message.includes('trial')) {
            console.log('');
            console.log('🔍 TRIAL ACCOUNT DETECTED:');
            console.log('   - Twilio trial accounts can only call verified numbers');
            console.log('   - You need to verify your personal phone number in Twilio Console');
            console.log('   - Go to: https://console.twilio.com/us1/develop/phone-numbers/verified-caller-ids');
            console.log('   - Add and verify your phone number');
            console.log('   - Then try calling your Twilio number again');
        }
        
        if (error.message.includes('permissions') || error.message.includes('forbidden')) {
            console.log('');
            console.log('🔍 PERMISSIONS ISSUE:');
            console.log('   - Your Twilio account might have restrictions');
            console.log('   - Check your account status in Twilio Console');
            console.log('   - Verify your account if needed');
        }
    }
}

async function checkAccountLimitations() {
    console.log('\n🔍 Checking Twilio account limitations...');
    
    try {
        // Check if this is a trial account
        const account = await client.accounts(accountSid).fetch();
        console.log(`📊 Account Type: ${account.type}`);
        console.log(`📊 Account Status: ${account.status}`);
        
        if (account.type === 'Trial') {
            console.log('');
            console.log('⚠️  TRIAL ACCOUNT LIMITATIONS:');
            console.log('   - Can only call/text verified phone numbers');
            console.log('   - Calls have Twilio trial message prefix');
            console.log('   - Limited functionality until upgraded');
            console.log('');
            console.log('🎯 SOLUTION:');
            console.log('   1. Verify your personal phone number in Twilio Console');
            console.log('   2. OR upgrade to a paid account');
            console.log('   3. Then test calling +15075166292 again');
        }
        
    } catch (error) {
        console.log('❌ Could not check account details:', error.message);
    }
}

async function main() {
    console.log('🚀 TWILIO OUTBOUND CALL TEST');
    console.log('='.repeat(40));
    
    await checkAccountLimitations();
    await testOutboundCall();
    
    console.log('\n📞 NEXT STEPS:');
    console.log('1. If this is a trial account, verify your phone number in Twilio Console');
    console.log('2. Try calling +15075166292 from your verified phone number');
    console.log('3. If still no answer, check Twilio Console for call logs');
}

main().catch(console.error);
