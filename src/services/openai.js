/**
 * OpenAI Service
 * Handles OpenAI API interactions for conversation logic
 */

const { OpenAI } = require('openai');
const config = require('../config');
const logger = require('../utils/logger');

class OpenAIService {
    constructor() {
        this.client = new OpenAI({
            apiKey: config.openai.apiKey
        });
        
        this.defaultModel = config.openai.model;
        this.maxTokens = config.openai.maxTokens;
        this.temperature = config.openai.temperature;
    }

    /**
     * Generate AI response from conversation history
     */
    async generateResponse(messages, options = {}) {
        const startTime = Date.now();
        
        try {
            const completion = await this.client.chat.completions.create({
                model: options.model || this.defaultModel,
                messages: messages,
                max_tokens: options.maxTokens || this.maxTokens,
                temperature: options.temperature || this.temperature,
                stream: false
            });

            const response = completion.choices[0].message.content;
            const duration = Date.now() - startTime;

            logger.logApiCall('openai', 'chat/completions', duration, true, {
                model: completion.model,
                tokens: completion.usage.total_tokens,
                promptTokens: completion.usage.prompt_tokens,
                completionTokens: completion.usage.completion_tokens
            });

            return {
                response,
                usage: completion.usage,
                model: completion.model,
                duration
            };

        } catch (error) {
            const duration = Date.now() - startTime;
            
            logger.logApiCall('openai', 'chat/completions', duration, false, {
                error: error.message
            });

            throw new Error(`OpenAI API error: ${error.message}`);
        }
    }

    /**
     * Generate streaming response (for future real-time implementation)
     */
    async generateStreamingResponse(messages, onChunk, options = {}) {
        const startTime = Date.now();
        
        try {
            const stream = await this.client.chat.completions.create({
                model: options.model || this.defaultModel,
                messages: messages,
                max_tokens: options.maxTokens || this.maxTokens,
                temperature: options.temperature || this.temperature,
                stream: true
            });

            let fullResponse = '';
            let totalTokens = 0;

            for await (const chunk of stream) {
                const content = chunk.choices[0]?.delta?.content || '';
                if (content) {
                    fullResponse += content;
                    onChunk(content);
                }
                
                if (chunk.usage) {
                    totalTokens = chunk.usage.total_tokens;
                }
            }

            const duration = Date.now() - startTime;

            logger.logApiCall('openai', 'chat/completions/stream', duration, true, {
                model: this.defaultModel,
                tokens: totalTokens,
                responseLength: fullResponse.length
            });

            return {
                response: fullResponse,
                duration,
                tokens: totalTokens
            };

        } catch (error) {
            const duration = Date.now() - startTime;
            
            logger.logApiCall('openai', 'chat/completions/stream', duration, false, {
                error: error.message
            });

            throw new Error(`OpenAI streaming error: ${error.message}`);
        }
    }

    /**
     * Analyze conversation context and extract insights
     */
    async analyzeConversation(messages) {
        try {
            const analysisPrompt = {
                role: 'system',
                content: `Analyze this conversation and extract key information in JSON format:
                {
                    "userName": "extracted name if mentioned, null otherwise",
                    "topic": "main topic of conversation",
                    "mood": "user's mood (positive, neutral, negative)",
                    "intent": "what the user seems to want",
                    "shouldEndCall": "true if conversation seems to be ending"
                }`
            };

            const analysisMessages = [analysisPrompt, ...messages.slice(-5)]; // Last 5 messages for context

            const result = await this.generateResponse(analysisMessages, {
                maxTokens: 150,
                temperature: 0.3
            });

            try {
                return JSON.parse(result.response);
            } catch (parseError) {
                logger.warn('Failed to parse conversation analysis', {
                    response: result.response,
                    error: parseError.message
                });
                
                return {
                    userName: null,
                    topic: 'general',
                    mood: 'neutral',
                    intent: 'conversation',
                    shouldEndCall: false
                };
            }

        } catch (error) {
            logger.error('Conversation analysis failed', {
                error: error.message
            });
            
            return {
                userName: null,
                topic: 'general',
                mood: 'neutral',
                intent: 'conversation',
                shouldEndCall: false
            };
        }
    }

    /**
     * Generate a phone-optimized response
     */
    async generatePhoneResponse(conversationHistory, userInput) {
        try {
            // Add the latest user input to conversation
            const messages = [
                ...conversationHistory,
                {
                    role: 'user',
                    content: userInput
                }
            ];

            // Generate AI response
            const result = await this.generateResponse(messages);

            // Analyze conversation for context updates
            const analysis = await this.analyzeConversation(messages);

            return {
                response: result.response,
                analysis,
                usage: result.usage,
                duration: result.duration
            };

        } catch (error) {
            logger.error('Failed to generate phone response', {
                error: error.message,
                userInput: userInput.substring(0, 100)
            });

            // Fallback response
            return {
                response: "I'm sorry, I'm having trouble processing that right now. Could you try asking in a different way?",
                analysis: {
                    userName: null,
                    topic: 'error',
                    mood: 'neutral',
                    intent: 'retry',
                    shouldEndCall: false
                },
                usage: null,
                duration: 0
            };
        }
    }

    /**
     * Test OpenAI connection
     */
    async testConnection() {
        try {
            const testMessages = [
                {
                    role: 'user',
                    content: 'Say "OpenAI connection test successful" exactly.'
                }
            ];

            const result = await this.generateResponse(testMessages, {
                maxTokens: 20,
                temperature: 0
            });

            return {
                success: true,
                response: result.response,
                model: result.model,
                duration: result.duration
            };

        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Get available models
     */
    async getAvailableModels() {
        try {
            const models = await this.client.models.list();
            
            // Filter for GPT models
            const gptModels = models.data
                .filter(model => model.id.includes('gpt'))
                .map(model => ({
                    id: model.id,
                    created: model.created,
                    owned_by: model.owned_by
                }))
                .sort((a, b) => b.created - a.created);

            return {
                success: true,
                models: gptModels,
                total: gptModels.length
            };

        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
}

module.exports = new OpenAIService();
