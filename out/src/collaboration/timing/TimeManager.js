/**
 * TimeManager - Handles time limits, timeouts, and warnings for collaborative sessions
 *
 * This class provides robust timing functionality with countdown warnings,
 * graceful timeout handling, and configurable time limits for different
 * collaboration scenarios.
 */
import { logger } from '../../utils/logger';
export class TimeManager {
    constructor() {
        this.timers = new Map();
        this.timerIdCounter = 0;
        // Warning thresholds as percentages of total time
        this.WARNING_THRESHOLDS = [0.75, 0.90]; // 75% and 90%
    }
    /**
     * Start a new timer with specified duration and callbacks
     */
    startTimer(duration, callbacks) {
        const timerId = `timer_${++this.timerIdCounter}_${Date.now()}`;
        const startTime = new Date();
        const timer = {
            id: timerId,
            startTime,
            duration,
            callbacks,
            warningsSent: new Array(this.WARNING_THRESHOLDS.length).fill(false),
            isActive: true,
            warningHandles: []
        };
        // Set up warning timers
        this.setupWarningTimers(timer);
        // Set up timeout timer
        timer.timeoutHandle = setTimeout(() => {
            this.handleTimeout(timerId);
        }, duration);
        this.timers.set(timerId, timer);
        logger.debug(`⏰ Timer ${timerId} started for ${duration}ms`);
        return timerId;
    }
    /**
     * Stop an active timer
     */
    stopTimer(timerId) {
        const timer = this.timers.get(timerId);
        if (!timer) {
            logger.warn(`Timer ${timerId} not found`);
            return;
        }
        timer.isActive = false;
        // Clear timeout
        if (timer.timeoutHandle) {
            clearTimeout(timer.timeoutHandle);
        }
        // Clear warning timers
        timer.warningHandles.forEach(handle => clearTimeout(handle));
        this.timers.delete(timerId);
        logger.debug(`⏰ Timer ${timerId} stopped`);
    }
    /**
     * Get remaining time for a timer in milliseconds
     */
    getRemainingTime(timerId) {
        const timer = this.timers.get(timerId);
        if (!timer || !timer.isActive) {
            return 0;
        }
        const elapsed = Date.now() - timer.startTime.getTime();
        const remaining = Math.max(0, timer.duration - elapsed);
        return remaining;
    }
    /**
     * Check if a timer has expired
     */
    isExpired(timerId) {
        const timer = this.timers.get(timerId);
        if (!timer) {
            return true; // Non-existent timers are considered expired
        }
        return !timer.isActive || this.getRemainingTime(timerId) <= 0;
    }
    /**
     * Get timer progress as percentage (0-100)
     */
    getProgress(timerId) {
        const timer = this.timers.get(timerId);
        if (!timer || !timer.isActive) {
            return 100; // Completed or non-existent
        }
        const elapsed = Date.now() - timer.startTime.getTime();
        const progress = Math.min(100, (elapsed / timer.duration) * 100);
        return progress;
    }
    /**
     * Extend a timer's duration
     */
    extendTimer(timerId, additionalTime) {
        const timer = this.timers.get(timerId);
        if (!timer || !timer.isActive) {
            return false;
        }
        // Clear existing timeout
        if (timer.timeoutHandle) {
            clearTimeout(timer.timeoutHandle);
        }
        // Clear existing warning timers
        timer.warningHandles.forEach(handle => clearTimeout(handle));
        timer.warningHandles = [];
        // Update duration
        timer.duration += additionalTime;
        // Reset warnings
        timer.warningsSent.fill(false);
        // Set up new timers
        this.setupWarningTimers(timer);
        timer.timeoutHandle = setTimeout(() => {
            this.handleTimeout(timerId);
        }, this.getRemainingTime(timerId));
        logger.debug(`⏰ Timer ${timerId} extended by ${additionalTime}ms`);
        return true;
    }
    /**
     * Get statistics for all active timers
     */
    getActiveTimerStats() {
        const activeTimers = Array.from(this.timers.values()).filter(t => t.isActive);
        return {
            count: activeTimers.length,
            timers: activeTimers.map(timer => ({
                id: timer.id,
                remaining: this.getRemainingTime(timer.id),
                progress: this.getProgress(timer.id)
            }))
        };
    }
    /**
     * Clean up expired timers
     */
    cleanup() {
        const expiredTimers = Array.from(this.timers.entries())
            .filter(([_, timer]) => !timer.isActive)
            .map(([id, _]) => id);
        expiredTimers.forEach(timerId => {
            this.timers.delete(timerId);
        });
        logger.debug(`⏰ Cleaned up ${expiredTimers.length} expired timers`);
    }
    /**
     * Set up warning timers based on thresholds
     */
    setupWarningTimers(timer) {
        if (!timer.callbacks?.onWarning) {
            return; // No warning callback provided
        }
        this.WARNING_THRESHOLDS.forEach((threshold, index) => {
            const warningTime = timer.duration * threshold;
            const warningHandle = setTimeout(() => {
                if (timer.isActive && !timer.warningsSent[index]) {
                    timer.warningsSent[index] = true;
                    const remainingTime = this.getRemainingTime(timer.id);
                    logger.warn(`⚠️ Timer ${timer.id} warning: ${remainingTime}ms remaining (${Math.round((1 - threshold) * 100)}% left)`);
                    try {
                        timer.callbacks.onWarning(remainingTime);
                    }
                    catch (error) {
                        logger.error(`Error in warning callback for timer ${timer.id}:`, error);
                    }
                }
            }, warningTime);
            timer.warningHandles.push(warningHandle);
        });
    }
    /**
     * Handle timer timeout
     */
    handleTimeout(timerId) {
        const timer = this.timers.get(timerId);
        if (!timer || !timer.isActive) {
            return;
        }
        timer.isActive = false;
        logger.warn(`⏰ Timer ${timerId} expired`);
        // Call timeout callback if provided
        if (timer.callbacks?.onTimeout) {
            try {
                timer.callbacks.onTimeout();
            }
            catch (error) {
                logger.error(`Error in timeout callback for timer ${timerId}:`, error);
            }
        }
        // Clean up warning timers
        timer.warningHandles.forEach(handle => clearTimeout(handle));
        timer.warningHandles = [];
    }
    /**
     * Create a timer for a collaboration round with standard settings
     */
    createRoundTimer(roundType, duration, onWarning, onTimeout) {
        const callbacks = {};
        if (onWarning) {
            callbacks.onWarning = (remaining) => {
                logger.warn(`⚠️ Round ${roundType} time warning: ${Math.round(remaining / 1000)}s remaining`);
                onWarning(remaining);
            };
        }
        if (onTimeout) {
            callbacks.onTimeout = () => {
                logger.warn(`⏰ Round ${roundType} timeout reached`);
                onTimeout();
            };
        }
        return this.startTimer(duration, callbacks);
    }
    /**
     * Create a timer for an entire collaboration session
     */
    createSessionTimer(sessionId, duration, onWarning, onTimeout) {
        const callbacks = {};
        if (onWarning) {
            callbacks.onWarning = (remaining) => {
                logger.warn(`⚠️ Session ${sessionId} time warning: ${Math.round(remaining / 1000)}s remaining`);
                onWarning(remaining);
            };
        }
        if (onTimeout) {
            callbacks.onTimeout = () => {
                logger.warn(`⏰ Session ${sessionId} timeout - forcing consensus`);
                onTimeout();
            };
        }
        return this.startTimer(duration, callbacks);
    }
    /**
     * Dispose of all timers and clean up resources
     */
    dispose() {
        logger.debug('⏰ TimeManager disposing all timers...');
        for (const [timerId] of this.timers) {
            this.stopTimer(timerId);
        }
        this.timers.clear();
        this.timerIdCounter = 0;
    }
}
/**
 * Singleton instance for global use
 */
export const timeManager = new TimeManager();
//# sourceMappingURL=TimeManager.js.map