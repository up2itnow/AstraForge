/**
 * Core type definitions for the True Multi-LLM Collaboration System
 *
 * This file defines all interfaces, types, and enums used throughout
 * the collaboration system to ensure type safety and consistency.
 */
/**
 * Error types specific to collaboration system
 */
export class CollaborationError extends Error {
    constructor(message, code, sessionId, roundId) {
        super(message);
        this.code = code;
        this.sessionId = sessionId;
        this.roundId = roundId;
        this.name = 'CollaborationError';
    }
}
//# sourceMappingURL=collaborationTypes.js.map