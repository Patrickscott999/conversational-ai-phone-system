/**
 * ElevenLabs Service
 * Handles ElevenLabs API interactions for voice synthesis
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const config = require('../config');
const logger = require('../utils/logger');

class ElevenLabsService {
    constructor() {
        this.apiKey = config.elevenlabs.apiKey;
        this.voiceId = config.elevenlabs.voiceId;
        this.model = config.elevenlabs.model;
        this.baseUrl = 'https://api.elevenlabs.io';
        
        // Voice settings
        this.voiceSettings = {
            stability: config.elevenlabs.stability,
            similarity_boost: config.elevenlabs.similarityBoost,
            style: config.elevenlabs.style,
            use_speaker_boost: config.elevenlabs.useSpeakerBoost
        };

        // Create audio directory if it doesn't exist
        this.audioDir = path.join(process.cwd(), 'temp', 'audio');
        if (!fs.existsSync(this.audioDir)) {
            fs.mkdirSync(this.audioDir, { recursive: true });
        }
    }

    /**
     * Convert text to speech using ElevenLabs
     */
    async textToSpeech(text, options = {}) {
        const startTime = Date.now();
        
        try {
            const response = await axios.post(
                `${this.baseUrl}/v1/text-to-speech/${this.voiceId}`,
                {
                    text: text,
                    model_id: options.model || this.model,
                    voice_settings: {
                        ...this.voiceSettings,
                        ...options.voiceSettings
                    }
                },
                {
                    headers: {
                        'xi-api-key': this.apiKey,
                        'Content-Type': 'application/json'
                    },
                    responseType: 'arraybuffer'
                }
            );

            const duration = Date.now() - startTime;
            const audioBuffer = Buffer.from(response.data);

            logger.logApiCall('elevenlabs', 'text-to-speech', duration, true, {
                textLength: text.length,
                audioSize: audioBuffer.length,
                voiceId: this.voiceId,
                model: options.model || this.model
            });

            return {
                audioBuffer,
                duration,
                size: audioBuffer.length
            };

        } catch (error) {
            const duration = Date.now() - startTime;
            
            logger.logApiCall('elevenlabs', 'text-to-speech', duration, false, {
                error: error.message,
                textLength: text.length
            });

            throw new Error(`ElevenLabs TTS error: ${error.response?.data?.detail?.message || error.message}`);
        }
    }

    /**
     * Save audio buffer to file and return URL
     */
    async saveAudioFile(audioBuffer, callSid, messageIndex) {
        try {
            const filename = `${callSid}_${messageIndex}_${Date.now()}.mp3`;
            const filePath = path.join(this.audioDir, filename);
            
            fs.writeFileSync(filePath, audioBuffer);
            
            // Return URL that can be accessed by Twilio
            const audioUrl = `http://localhost:${config.server.port}/audio/${filename}`;
            
            logger.debug('Audio file saved', {
                filename,
                size: audioBuffer.length,
                url: audioUrl
            });

            return {
                filePath,
                audioUrl,
                filename
            };

        } catch (error) {
            logger.error('Failed to save audio file', {
                error: error.message,
                callSid,
                messageIndex
            });
            
            throw new Error(`Failed to save audio file: ${error.message}`);
        }
    }

    /**
     * Generate speech for phone conversation
     */
    async generatePhoneSpeech(text, callSid, messageIndex = 0) {
        try {
            // Optimize text for phone conversation
            const phoneOptimizedText = this.optimizeTextForPhone(text);
            
            // Generate speech
            const ttsResult = await this.textToSpeech(phoneOptimizedText, {
                model: 'eleven_flash_v2_5' // Use fastest model for phone calls
            });

            // Save audio file
            const audioFile = await this.saveAudioFile(ttsResult.audioBuffer, callSid, messageIndex);

            return {
                audioUrl: audioFile.audioUrl,
                filePath: audioFile.filePath,
                filename: audioFile.filename,
                originalText: text,
                optimizedText: phoneOptimizedText,
                duration: ttsResult.duration,
                audioSize: ttsResult.size
            };

        } catch (error) {
            logger.error('Failed to generate phone speech', {
                error: error.message,
                text: text.substring(0, 100),
                callSid
            });

            throw error;
        }
    }

    /**
     * Optimize text for phone conversation
     */
    optimizeTextForPhone(text) {
        return text
            // Remove excessive punctuation
            .replace(/[.]{2,}/g, '.')
            .replace(/[!]{2,}/g, '!')
            .replace(/[?]{2,}/g, '?')
            
            // Replace common abbreviations with full words for better pronunciation
            .replace(/\bDr\./g, 'Doctor')
            .replace(/\bMr\./g, 'Mister')
            .replace(/\bMrs\./g, 'Missus')
            .replace(/\bMs\./g, 'Miss')
            .replace(/\betc\./g, 'etcetera')
            .replace(/\bi\.e\./g, 'that is')
            .replace(/\be\.g\./g, 'for example')
            
            // Add pauses for better phone delivery
            .replace(/\. /g, '. ')
            .replace(/\! /g, '! ')
            .replace(/\? /g, '? ')
            
            // Ensure proper sentence ending
            .trim()
            .replace(/([^.!?])$/, '$1.');
    }

    /**
     * Get available voices
     */
    async getVoices() {
        try {
            const response = await axios.get(`${this.baseUrl}/v1/voices`, {
                headers: {
                    'xi-api-key': this.apiKey
                }
            });

            return {
                success: true,
                voices: response.data.voices,
                total: response.data.voices.length
            };

        } catch (error) {
            logger.error('Failed to get voices', {
                error: error.message
            });

            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Get user info and quota
     */
    async getUserInfo() {
        try {
            const response = await axios.get(`${this.baseUrl}/v1/user`, {
                headers: {
                    'xi-api-key': this.apiKey
                }
            });

            return {
                success: true,
                user: response.data
            };

        } catch (error) {
            logger.error('Failed to get user info', {
                error: error.message
            });

            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Test ElevenLabs connection
     */
    async testConnection() {
        try {
            const testText = "ElevenLabs connection test successful!";
            
            const result = await this.textToSpeech(testText);
            
            return {
                success: true,
                message: "ElevenLabs TTS working correctly",
                audioSize: result.size,
                duration: result.duration,
                voiceId: this.voiceId,
                model: this.model
            };

        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Clean up old audio files
     */
    cleanupOldAudioFiles(maxAgeHours = 2) {
        try {
            const files = fs.readdirSync(this.audioDir);
            const maxAge = maxAgeHours * 60 * 60 * 1000; // Convert to milliseconds
            const now = Date.now();
            let deletedCount = 0;

            files.forEach(file => {
                const filePath = path.join(this.audioDir, file);
                const stats = fs.statSync(filePath);
                
                if (now - stats.mtime.getTime() > maxAge) {
                    fs.unlinkSync(filePath);
                    deletedCount++;
                }
            });

            if (deletedCount > 0) {
                logger.info(`Cleaned up ${deletedCount} old audio files`);
            }

            return deletedCount;

        } catch (error) {
            logger.error('Failed to cleanup audio files', {
                error: error.message
            });
            
            return 0;
        }
    }
}

module.exports = new ElevenLabsService();
