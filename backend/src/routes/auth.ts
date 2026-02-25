// =============================================================
// AUTH ROUTES
// =============================================================
// These routes handle user registration, login, and profile management.
//
// PUBLIC ROUTES (no login required):
//   POST /api/auth/signup         - Create a new account
//   POST /api/auth/signin         - Log in to existing account
//   POST /api/auth/refresh        - Refresh an expired session
//   POST /api/auth/reset-password - Request a password reset email
//
// PROTECTED ROUTES (login required):
//   GET  /api/auth/profile        - Get your profile
//   PUT  /api/auth/profile        - Update your profile
//   POST /api/auth/api-key        - Save your Gemini API key
// =============================================================

import { Router } from 'express';
import { AuthController } from '../controllers/authController';
import { requireAuth } from '../middleware/auth';
import { authRateLimit } from '../middleware/rateLimit';

const router = Router();

// ----- PUBLIC ROUTES -----

// Create a new account
router.post('/signup', authRateLimit, AuthController.signUp);

// Log in to existing account
router.post('/signin', authRateLimit, AuthController.signIn);

// Refresh an expired session token
router.post('/refresh', AuthController.refreshToken);

// Request a password reset email
router.post('/reset-password', authRateLimit, AuthController.resetPassword);

// ----- PROTECTED ROUTES (must be logged in) -----

// Get your profile
router.get('/profile', requireAuth, AuthController.getProfile);

// Update your profile (name, avatar, etc.)
router.put('/profile', requireAuth, AuthController.updateProfile);

// Save your personal Gemini API key
router.post('/api-key', requireAuth, AuthController.saveApiKey);

export default router;
