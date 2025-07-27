/**
 * Logging Utility
 * Provides structured logging for the application
 */

const config = require('../config');

class Logger {
    constructor() {
        this.logLevel = config.app.logLevel;
        this.enableLogging = config.app.enableLogging;
        
        // Log levels in order of severity
        this.levels = {
            error: 0,
            warn: 1,
            info: 2,
            debug: 3
        };
    }

    /**
     * Format log message with timestamp and level
     */
    formatMessage(level, message, meta = {}) {
        const timestamp = new Date().toISOString();
        const metaStr = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
        return `[${timestamp}] ${level.toUpperCase()}: ${message}${metaStr}`;
    }

    /**
     * Check if message should be logged based on level
     */
    shouldLog(level) {
        if (!this.enableLogging) return false;
        return this.levels[level] <= this.levels[this.logLevel];
    }

    /**
     * Log error messages
     */
    error(message, meta = {}) {
        if (this.shouldLog('error')) {
            console.error(this.formatMessage('error', message, meta));
        }
    }

    /**
     * Log warning messages
     */
    warn(message, meta = {}) {
        if (this.shouldLog('warn')) {
            console.warn(this.formatMessage('warn', message, meta));
        }
    }

    /**
     * Log info messages
     */
    info(message, meta = {}) {
        if (this.shouldLog('info')) {
            console.log(this.formatMessage('info', message, meta));
        }
    }

    /**
     * Log debug messages
     */
    debug(message, meta = {}) {
        if (this.shouldLog('debug')) {
            console.log(this.formatMessage('debug', message, meta));
        }
    }

    /**
     * Log call events with special formatting
     */
    logCall(event, callSid, data = {}) {
        this.info(`Call ${event}`, {
            callSid,
            ...data
        });
    }

    /**
     * Log conversation events
     */
    logConversation(event, callSid, message, data = {}) {
        this.info(`Conversation ${event}`, {
            callSid,
            message: message.substring(0, 100) + (message.length > 100 ? '...' : ''),
            ...data
        });
    }

    /**
     * Log API calls with timing
     */
    logApiCall(service, endpoint, duration, success, data = {}) {
        const level = success ? 'info' : 'error';
        this[level](`API Call: ${service}/${endpoint}`, {
            duration: `${duration}ms`,
            success,
            ...data
        });
    }
}

// Export singleton instance
module.exports = new Logger();
