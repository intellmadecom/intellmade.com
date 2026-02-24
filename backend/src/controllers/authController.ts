// =============================================================
// AUTH CONTROLLER
// =============================================================
// Handles user authentication operations:
//   - Sign up (create new account)
//   - Sign in (login)
//   - Sign out (logout)
//   - Get current user profile
//   - Update profile
//   - Password reset
// =============================================================

import { Request, Response } from 'express';
import { supabaseAdmin } from '../config/supabase';
import { AuthenticatedRequest } from '../types';
import { SupabaseService } from '../services/supabaseService';

export class AuthController {

    // Sign up a new user
    static async signUp(req: Request, res: Response): Promise<void> {
        try {
            const { email, password, fullName } = req.body;

            // Validate the input
            if (!email || !password) {
                res.status(400).json({
                    success: false,
                    error: 'Email and password are required.',
                });
                return;
            }

            if (password.length < 6) {
                res.status(400).json({
                    success: false,
                    error: 'Password must be at least 6 characters long.',
                });
                return;
            }

            // Create the user in Supabase Auth
            const { data, error } = await supabaseAdmin.auth.admin.createUser({
                email,
                password,
                email_confirm: true, // Auto-confirm email for now
                user_metadata: {
                    full_name: fullName || '',
                },
            });

            if (error) {
                res.status(400).json({
                    success: false,
                    error: error.message,
                });
                return;
            }

            // Generate a session token for the new user
            const { data: signInData, error: signInError } = await supabaseAdmin.auth.admin.generateLink({
                type: 'magiclink',
                email,
            });

            res.status(201).json({
                success: true,
                data: {
                    user: {
                        id: data.user.id,
                        email: data.user.email,
                        fullName: fullName || '',
                    },
                },
                message: 'Account created successfully! You can now sign in.',
            });
        } catch (error: any) {
            console.error('Sign up error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to create account. Please try again.',
            });
        }
    }

    // Sign in an existing user
    static async signIn(req: Request, res: Response): Promise<void> {
        try {
            const { email, password } = req.body;

            if (!email || !password) {
                res.status(400).json({
                    success: false,
                    error: 'Email and password are required.',
                });
                return;
            }

            // Attempt to sign in with Supabase Auth
            const { data, error } = await supabaseAdmin.auth.signInWithPassword({
                email,
                password,
            });

            if (error) {
                res.status(401).json({
                    success: false,
                    error: 'Invalid email or password.',
                });
                return;
            }

            // Get the user's profile
            const profile = await SupabaseService.getUserProfile(data.user.id);

            res.json({
                success: true,
                data: {
                    session: {
                        accessToken: data.session.access_token,
                        refreshToken: data.session.refresh_token,
                        expiresAt: data.session.expires_at,
                    },
                    user: profile,
                },
            });
        } catch (error: any) {
            console.error('Sign in error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to sign in. Please try again.',
            });
        }
    }

    // Refresh an expired session token
    static async refreshToken(req: Request, res: Response): Promise<void> {
        try {
            const { refreshToken } = req.body;

            if (!refreshToken) {
                res.status(400).json({
                    success: false,
                    error: 'Refresh token is required.',
                });
                return;
            }

            const { data, error } = await supabaseAdmin.auth.refreshSession({
                refresh_token: refreshToken,
            });

            if (error || !data.session) {
                res.status(401).json({
                    success: false,
                    error: 'Invalid or expired refresh token. Please sign in again.',
                });
                return;
            }

            res.json({
                success: true,
                data: {
                    session: {
                        accessToken: data.session.access_token,
                        refreshToken: data.session.refresh_token,
                        expiresAt: data.session.expires_at,
                    },
                },
            });
        } catch (error: any) {
            console.error('Token refresh error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to refresh session. Please sign in again.',
            });
        }
    }

    // Get the currently logged-in user's profile
    static async getProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            if (!req.user) {
                res.status(401).json({
                    success: false,
                    error: 'Not logged in.',
                });
                return;
            }

            res.json({
                success: true,
                data: {
                    user: req.user,
                },
            });
        } catch (error: any) {
            console.error('Get profile error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch profile.',
            });
        }
    }

    // Update the currently logged-in user's profile
    static async updateProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            if (!req.userId) {
                res.status(401).json({ success: false, error: 'Not logged in.' });
                return;
            }

            const { fullName, avatarUrl } = req.body;

            const updates: any = {};
            if (fullName !== undefined) updates.full_name = fullName;
            if (avatarUrl !== undefined) updates.avatar_url = avatarUrl;

            const updatedProfile = await SupabaseService.updateUserProfile(req.userId, updates);

            if (!updatedProfile) {
                res.status(500).json({
                    success: false,
                    error: 'Failed to update profile.',
                });
                return;
            }

            res.json({
                success: true,
                data: { user: updatedProfile },
                message: 'Profile updated successfully.',
            });
        } catch (error: any) {
            console.error('Update profile error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to update profile.',
            });
        }
    }

    // Request a password reset email
    static async resetPassword(req: Request, res: Response): Promise<void> {
        try {
            const { email } = req.body;

            if (!email) {
                res.status(400).json({
                    success: false,
                    error: 'Email is required.',
                });
                return;
            }

            const { error } = await supabaseAdmin.auth.resetPasswordForEmail(email, {
                redirectTo: `${process.env.FRONTEND_URL}/reset-password`,
            });

            if (error) {
                // Don't reveal whether the email exists or not (security best practice)
                console.error('Password reset error:', error);
            }

            // Always return success to prevent email enumeration attacks
            res.json({
                success: true,
                message: 'If an account exists with that email, a password reset link has been sent.',
            });
        } catch (error: any) {
            console.error('Password reset error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to send password reset email.',
            });
        }
    }

    // Save/update the user's personal Gemini API key
    static async saveApiKey(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            if (!req.userId) {
                res.status(401).json({ success: false, error: 'Not logged in.' });
                return;
            }

            const { apiKey } = req.body;

            if (!apiKey) {
                res.status(400).json({
                    success: false,
                    error: 'API key is required.',
                });
                return;
            }

            // In production, you should encrypt this key before storing it
            // For simplicity, we're storing it as-is, but please use proper encryption
            const saved = await SupabaseService.saveUserApiKey(req.userId, apiKey);

            if (!saved) {
                res.status(500).json({
                    success: false,
                    error: 'Failed to save API key.',
                });
                return;
            }

            res.json({
                success: true,
                message: 'API key saved successfully.',
            });
        } catch (error: any) {
            console.error('Save API key error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to save API key.',
            });
        }
    }
}

export default AuthController;
