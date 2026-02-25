// =============================================================
// ERROR HANDLING MIDDLEWARE
// =============================================================
// This file catches any errors that happen during request processing
// and sends back a clean, user-friendly error message instead of
// crashing the server.
// =============================================================

import { Request, Response, NextFunction } from 'express';

// Custom error class that includes an HTTP status code
export class AppError extends Error {
    statusCode: number;
    isOperational: boolean;

    constructor(message: string, statusCode: number = 500) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = true; // "Operational" means it's an expected error, not a bug
        Error.captureStackTrace(this, this.constructor);
    }
}

// Common error shortcuts
export class NotFoundError extends AppError {
    constructor(message: string = 'The requested resource was not found.') {
        super(message, 404);
    }
}

export class BadRequestError extends AppError {
    constructor(message: string = 'Invalid request. Please check your input.') {
        super(message, 400);
    }
}

export class UnauthorizedError extends AppError {
    constructor(message: string = 'You must be logged in to do this.') {
        super(message, 401);
    }
}

export class ForbiddenError extends AppError {
    constructor(message: string = 'You do not have permission to do this.') {
        super(message, 403);
    }
}

export class TooManyRequestsError extends AppError {
    constructor(message: string = 'Too many requests. Please slow down.') {
        super(message, 429);
    }
}

// The main error handling middleware
// This must be added LAST in your Express app (after all routes)
export function errorHandler(
    err: Error | AppError,
    req: Request,
    res: Response,
    _next: NextFunction
): void {
    // Log the error for debugging (only the full stack in development)
    if (process.env.NODE_ENV === 'development') {
        console.error('=== ERROR ===');
        console.error('Path:', req.method, req.path);
        console.error('Message:', err.message);
        console.error('Stack:', err.stack);
    } else {
        console.error(`[ERROR] ${req.method} ${req.path}: ${err.message}`);
    }

    // Determine the status code and message
    let statusCode = 500;
    let message = 'Something went wrong on our end. Please try again later.';

    if (err instanceof AppError) {
        statusCode = err.statusCode;
        message = err.message;
    } else if (err.message.includes('GEMINI') || err.message.includes('generativelanguage')) {
        statusCode = 502;
        message = 'The AI service is temporarily unavailable. Please try again in a moment.';
    } else if (err.message.includes('Stripe')) {
        statusCode = 502;
        message = 'Payment service error. Please try again or contact support.';
    } else if (err.message.includes('ECONNREFUSED') || err.message.includes('ETIMEDOUT')) {
        statusCode = 503;
        message = 'A service is temporarily unavailable. Please try again in a moment.';
    }

    // Send the error response
    res.status(statusCode).json({
        success: false,
        error: message,
        // Only include the stack trace in development mode
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
}

// Middleware to handle 404 errors (route not found)
export function notFoundHandler(req: Request, res: Response): void {
    res.status(404).json({
        success: false,
        error: `Route not found: ${req.method} ${req.path}`,
    });
}
