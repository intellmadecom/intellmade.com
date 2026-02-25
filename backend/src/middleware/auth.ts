// =============================================================
// AUTHENTICATION MIDDLEWARE
// =============================================================
// This file checks if a user is logged in before allowing them
// to access protected API routes (like generating images, etc.)
//
// How it works:
// 1. The frontend sends a "token" in the request header
// 2. This middleware verifies the token using Supabase (not manual JWT)
// 3. If valid, it finds the user's profile and attaches it to the request
// 4. If invalid, it sends back a "401 Unauthorized" error
// =============================================================

import { Response, NextFunction } from 'express';
import { supabaseAdmin } from '../config/supabase';
import { AuthenticatedRequest, UserProfile } from '../types';

// Main authentication middleware
// Add this to any route that requires the user to be logged in
export async function requireAuth(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        // Step 1: Get the token from the "Authorization" header
        // The header looks like: "Bearer eyJhbGciOi..."
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.status(401).json({
                success: false,
                error: 'Not logged in. Please sign in to use this feature.',
            });
            return;
        }

        // Remove "Bearer " from the beginning to get just the token
        const token = authHeader.replace('Bearer ', '');

        // Step 2: Verify the token using Supabase
        // This works with both HS256 and ECC (P-256) JWT keys
        let userId: string;
        try {
            const { data: { user: authUser }, error: authError } = await supabaseAdmin.auth.getUser(token);

            if (authError || !authUser) {
                res.status(401).json({
                    success: false,
                    error: 'Your session has expired. Please sign in again.',
                });
                return;
            }
            userId = authUser.id;
        } catch (authErr) {
            console.error('Token verification failed:', authErr);
            res.status(401).json({
                success: false,
                error: 'Your session has expired. Please sign in again.',
            });
            return;
        }

        // Step 3: Get the user's profile from the database
        const { data: profile, error } = await supabaseAdmin
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

        if (error || !profile) {
            res.status(401).json({
                success: false,
                error: 'User account not found. Please sign up.',
            });
            return;
        }

        // Step 4: Attach the user info to the request so other code can use it
        req.user = profile as UserProfile;
        req.userId = userId;

        // Continue to the next middleware or route handler
        next();
    } catch (error) {
        console.error('Authentication error:', error);
        res.status(500).json({
            success: false,
            error: 'Something went wrong while checking your login. Please try again.',
        });
    }
}

// Optional authentication middleware
// Use this for routes that work for both logged-in and anonymous users
// (e.g., viewing public images)
export async function optionalAuth(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const authHeader = req.headers.authorization;

        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.replace('Bearer ', '');
            try {
                const { data: { user: authUser }, error: authError } = await supabaseAdmin.auth.getUser(token);

                if (!authError && authUser) {
                    const { data: profile } = await supabaseAdmin
                        .from('profiles')
                        .select('*')
                        .eq('id', authUser.id)
                        .single();

                    if (profile) {
                        req.user = profile as UserProfile;
                        req.userId = authUser.id;
                    }
                }
            } catch {
                // Token is invalid, but that's OK - just continue without auth
            }
        }

        next();
    } catch {
        next();
    }
}

// Middleware to check if user has enough credits
export async function requireCredits(creditsNeeded: number) {
    return async (
        req: AuthenticatedRequest,
        res: Response,
        next: NextFunction
    ): Promise<void> => {
        if (!req.user) {
            res.status(401).json({
                success: false,
                error: 'Not logged in.',
            });
            return;
        }

        if (req.user.credits_remaining < creditsNeeded) {
            res.status(403).json({
                success: false,
                error: `Not enough credits. You need ${creditsNeeded} credits but only have ${req.user.credits_remaining}. Please upgrade your plan.`,
            });
            return;
        }

        next();
    };
}

// Middleware to check if user has a specific subscription plan or higher
export function requirePlan(minimumPlan: 'basic' | 'pro' | 'enterprise') {
    const planOrder = { free: 0, basic: 1, pro: 2, enterprise: 3 };

    return (
        req: AuthenticatedRequest,
        res: Response,
        next: NextFunction
    ): void => {
        if (!req.user) {
            res.status(401).json({
                success: false,
                error: 'Not logged in.',
            });
            return;
        }

        const userPlanLevel = planOrder[req.user.subscription_plan] || 0;
        const requiredPlanLevel = planOrder[minimumPlan];

        if (userPlanLevel < requiredPlanLevel) {
            res.status(403).json({
                success: false,
                error: `This feature requires the ${minimumPlan} plan or higher. Your current plan is "${req.user.subscription_plan}".`,
            });
            return;
        }

        if (req.user.subscription_status !== 'active' && req.user.subscription_status !== 'trialing') {
            res.status(403).json({
                success: false,
                error: 'Your subscription is not active. Please update your payment method.',
            });
            return;
        }

        next();
    };
}