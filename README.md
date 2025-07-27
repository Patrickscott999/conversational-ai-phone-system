# 🤖 Conversational AI Phone System

A production-ready conversational AI system that enables natural voice interactions over phone calls using **Twilio**, **OpenAI GPT-4.1**, and **ElevenLabs** voice synthesis.

## 🎯 Features

- **🧠 Intelligent Conversations**: Powered by OpenAI GPT-4.1 for natural, context-aware responses
- **🎵 High-Quality Voice**: ElevenLabs Flash v2.5 model with 75ms latency for natural speech synthesis
- **📞 Phone Integration**: Twilio programmable voice for seamless phone call handling
- **💭 Context Management**: Maintains conversation history and context throughout calls
- **⚡ Real-Time Processing**: ~2-3 second end-to-end response time
- **📊 Analytics**: Call tracking, conversation metrics, and performance monitoring

## 🚀 Quick Start

### Prerequisites

- Node.js 16+ installed
- Twilio account with phone number
- OpenAI API key
- ElevenLabs API key

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd ConversationalAI
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   
   Create a `.env` file in the root directory:
   ```env
   # Twilio Configuration
   TWILIO_ACCOUNT_SID=your_twilio_account_sid
   TWILIO_AUTH_TOKEN=your_twilio_auth_token
   TWILIO_PHONE_NUMBER=+1234567890

   # OpenAI Configuration
   OPENAI_API_KEY=your_openai_api_key
   OPENAI_MODEL=gpt-4.1
   OPENAI_MAX_TOKENS=1000

   # ElevenLabs Configuration
   ELEVENLABS_API_KEY=your_elevenlabs_api_key
   ELEVENLABS_VOICE_ID=your_voice_id
   ELEVENLABS_MODEL=eleven_flash_v2_5

   # Server Configuration
   PORT=3000
   NODE_ENV=development
   ```

4. **Start the server**
   ```bash
   npm start
   ```

5. **Test the system**
   ```bash
   # Test API connections
   node test-connections.js
   
   # Test conversation locally
   node test-conversation.js
   
   # Test webhook directly
   node test-webhook-direct.js
   ```

## 🌐 Deployment

### Railway (Recommended)

1. Push your code to GitHub
2. Connect your GitHub account to [Railway](https://railway.app)
3. Deploy your repository
4. Add environment variables in Railway dashboard
5. Update Twilio webhook URL to your Railway app URL

### Other Platforms

- **Render**: Deploy directly from GitHub
- **Heroku**: Use the included `Procfile`
- **Vercel**: Serverless deployment ready

## 📞 Phone System Setup

1. **Configure Twilio Webhook**
   ```bash
   # Update webhook URL after deployment
   node update-webhook.js
   ```

2. **Test Phone Calls**
   - Call your Twilio phone number
   - Speak naturally with the AI
   - Experience intelligent conversations

## 🧪 Testing

### Local Testing
```bash
# Test all API connections
npm run test:connections

# Test conversation flow
npm run test:conversation

# Test webhook simulation
npm run test:webhook
```

### Live Testing
```bash
# Update Twilio webhook
npm run update:webhook

# Monitor server logs
npm run logs
```

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│                 │    │                 │    │                 │
│     Twilio      │◄──►│  Express.js     │◄──►│    OpenAI       │
│   (Phone Calls) │    │   (Webhooks)    │    │   (GPT-4.1)     │
│                 │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │                 │
                       │   ElevenLabs    │
                       │ (Voice Synthesis)│
                       │                 │
                       └─────────────────┘
```

## 📁 Project Structure

```
ConversationalAI/
├── src/
│   ├── app.js              # Main Express application
│   ├── config/
│   │   └── index.js        # Configuration management
│   ├── controllers/
│   │   └── voice.js        # Voice webhook handlers
│   ├── services/
│   │   ├── twilio.js       # Twilio API integration
│   │   ├── openai.js       # OpenAI API integration
│   │   └── elevenlabs.js   # ElevenLabs API integration
│   └── utils/
│       ├── logger.js       # Structured logging
│       └── conversation.js # Conversation management
├── test-*.js               # Testing utilities
├── update-webhook.js       # Webhook configuration
└── package.json           # Dependencies and scripts
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `TWILIO_ACCOUNT_SID` | Twilio Account SID | ✅ |
| `TWILIO_AUTH_TOKEN` | Twilio Auth Token | ✅ |
| `TWILIO_PHONE_NUMBER` | Your Twilio phone number | ✅ |
| `OPENAI_API_KEY` | OpenAI API key | ✅ |
| `ELEVENLABS_API_KEY` | ElevenLabs API key | ✅ |
| `PORT` | Server port (default: 3000) | ❌ |

### Voice Configuration

- **OpenAI Model**: GPT-4.1 for intelligent responses
- **ElevenLabs Model**: Flash v2.5 for low-latency synthesis
- **Voice ID**: Configurable voice selection
- **Response Time**: Optimized for phone conversations

## 🚨 Troubleshooting

### Common Issues

1. **Phone calls not connecting**
   - Verify webhook URL is publicly accessible
   - Check Twilio webhook configuration
   - Ensure server is running and healthy

2. **AI responses are generic**
   - Verify OpenAI API key is valid
   - Check conversation flow logic
   - Review TwiML generation

3. **Voice synthesis fails**
   - Verify ElevenLabs API key
   - Check voice ID configuration
   - Monitor API usage limits

### Debug Commands

```bash
# Check server health
curl http://localhost:3000/health

# Test API connections
node test-connections.js

# Simulate webhook calls
node test-webhook-direct.js

# Check Twilio configuration
node test-twilio-direct.js
```

## 📊 Monitoring

The system includes comprehensive logging and monitoring:

- **Call Analytics**: Track call duration, success rates
- **Conversation Metrics**: Response times, token usage
- **Error Tracking**: Detailed error logging and reporting
- **Performance Monitoring**: API response times, system health

## 🔒 Security

- Environment variables for sensitive data
- Webhook signature verification (recommended)
- Rate limiting and input validation
- Secure API key management

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For issues and questions:
1. Check the troubleshooting section
2. Review the test utilities
3. Check server logs for errors
4. Verify API configurations

---

**Built with ❤️ using Twilio, OpenAI, and ElevenLabs**
