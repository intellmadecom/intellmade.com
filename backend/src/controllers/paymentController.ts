// =============================================================
// PAYMENT CONTROLLER — Credit-based system
// =============================================================

import { Request, Response } from 'express';
import { AuthenticatedRequest, SubscriptionPlan } from '../types';
import { StripeService } from '../services/stripeService';
import { SupabaseService } from '../services/supabaseService';
import { stripe, PLAN_CONFIG } from '../config/stripe';
import { supabaseAdmin } from '../config/supabase';

export class PaymentController {

    static async getPlans(req: Request, res: Response): Promise<void> {
        try {
            const plans = StripeService.getPlans();
            res.json({ success: true, data: { plans } });
        } catch (error: any) {
            console.error('Get plans error:', error);
            res.status(500).json({ success: false, error: 'Failed to fetch pricing plans.' });
        }
    }

    static async createCheckout(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            if (!req.user) {
                res.status(401).json({ success: false, error: 'Not logged in.' });
                return;
            }

            const { plan } = req.body;
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

            // Stripe redirects here after payment
            // Use query params (not hash) so Stripe can pass session_id
            const successUrl = `${frontendUrl}/?payment=success&plan=${plan}&session_id={CHECKOUT_SESSION_ID}`;
            const cancelUrl = `${frontendUrl}/?payment=canceled`;

            const validPlans: string[] = ['personal', 'creator', 'studio', 'flex'];

            if (!plan || !validPlans.includes(plan)) {
                res.status(400).json({
                    success: false,
                    error: `Invalid plan. Choose one of: ${validPlans.join(', ')}`,
                });
                return;
            }

            const planConfig = PLAN_CONFIG[plan as SubscriptionPlan];
            if (!planConfig || !planConfig.stripePriceId) {
                res.status(500).json({ success: false, error: `${plan} not configured.` });
                return;
            }

            const customerId = await StripeService.getOrCreateCustomerId(req.user);
            if (!customerId) {
                res.status(500).json({ success: false, error: 'Failed to create customer.' });
                return;
            }

            const session = await stripe.checkout.sessions.create({
                customer: customerId,
                mode: 'payment',
                payment_method_types: ['card'],
                line_items: [{
                    price: planConfig.stripePriceId,
                    quantity: 1,
                }],
                success_url: successUrl,
                cancel_url: cancelUrl,
                metadata: {
                    supabase_user_id: req.user.id,
                    plan_name: plan,
                },
                allow_promotion_codes: true,
            });

            res.json({ success: true, data: { checkoutUrl: session.url } });
        } catch (error: any) {
            console.error('Create checkout error:', error.message);
            res.status(500).json({ success: false, error: 'Failed to start checkout. Please try again.' });
        }
    }

    // =============================================================
    // VERIFY PAYMENT & ADD CREDITS
    // Called when user returns from Stripe checkout
    // This replaces webhooks for localhost development
    // =============================================================
    static async verifyPayment(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            if (!req.user) {
                res.status(401).json({ success: false, error: 'Not logged in.' });
                return;
            }

            const { sessionId } = req.body;

            if (!sessionId) {
                res.status(400).json({ success: false, error: 'Missing session ID.' });
                return;
            }

            // Retrieve the checkout session from Stripe
            let session;
            try {
                session = await stripe.checkout.sessions.retrieve(sessionId);
            } catch (err: any) {
                console.error('Failed to retrieve session:', err.message);
                res.status(400).json({ success: false, error: 'Invalid session.' });
                return;
            }

            // Verify payment was successful
            if (session.payment_status !== 'paid') {
                res.status(400).json({ success: false, error: 'Payment not completed.' });
                return;
            }

            // Verify this session belongs to this user
            if (session.metadata?.supabase_user_id !== req.user.id) {
                res.status(403).json({ success: false, error: 'Session does not belong to you.' });
                return;
            }

            const planName = session.metadata?.plan_name as SubscriptionPlan;
            const planConfig = PLAN_CONFIG[planName];

            if (!planConfig) {
                res.status(400).json({ success: false, error: 'Unknown plan.' });
                return;
            }

            // Check if we already credited this session (prevent double-credit)
            const { data: existingRecord } = await supabaseAdmin
                .from('transactions')
                .select('id')
                .eq('stripe_invoice_id', sessionId)
                .maybeSingle();

            if (existingRecord) {
                // Already credited — return current credits
                const { data: profile } = await supabaseAdmin
                    .from('profiles')
                    .select('credits_remaining, subscription_plan')
                    .eq('id', req.user.id)
                    .single();

                res.json({
                    success: true,
                    data: {
                        credits: profile?.credits_remaining || 0,
                        plan: profile?.subscription_plan || 'free',
                        alreadyCredited: true,
                    },
                });
                return;
            }

            // Add credits (stacks on existing)
            const added = await StripeService.addCredits(req.user.id, planConfig.credits, planName);

            if (!added) {
                res.status(500).json({ success: false, error: 'Failed to add credits.' });
                return;
            }

            // Save payment record to prevent double-crediting
            try {
                await SupabaseService.savePayment(req.user.id, {
                    stripePaymentIntentId: (session.payment_intent as string) || session.id,
                    stripeInvoiceId: sessionId,
                    amountCents: session.amount_total || 0,
                    currency: session.currency || 'usd',
                    status: 'succeeded',
                    description: `${planConfig.name} - ${planConfig.credits} credits`,
                });
            } catch (err) {
                console.error('Failed to save payment record (credits still added):', err);
            }

            // Get updated credits
            const { data: updated } = await supabaseAdmin
                .from('profiles')
                .select('credits_remaining, subscription_plan')
                .eq('id', req.user.id)
                .single();

            console.log(`Payment verified: User ${req.user.id} -> +${planConfig.credits} credits for ${planName}`);

            res.json({
                success: true,
                data: {
                    credits: updated?.credits_remaining || 0,
                    plan: updated?.subscription_plan || 'free',
                    added: planConfig.credits,
                },
            });
        } catch (error: any) {
            console.error('Verify payment error:', error.message);
            res.status(500).json({ success: false, error: 'Failed to verify payment.' });
        }
    }

    // Get user's current credits
    static async getCredits(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            if (!req.user) {
                res.status(401).json({ success: false, error: 'Not logged in.' });
                return;
            }

            res.json({
                success: true,
                data: {
                    credits: req.user.credits_remaining,
                    plan: req.user.subscription_plan,
                },
            });
        } catch (error: any) {
            console.error('Get credits error:', error);
            res.status(500).json({ success: false, error: 'Failed to fetch credits.' });
        }
    }

    static async createBillingPortal(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            if (!req.user) {
                res.status(401).json({ success: false, error: 'Not logged in.' });
                return;
            }

            if (!req.user.stripe_customer_id) {
                res.status(400).json({ success: false, error: 'No billing account found.' });
                return;
            }

            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
            const portalUrl = await StripeService.createBillingPortalSession(req.user, frontendUrl);

            if (!portalUrl) {
                res.status(500).json({ success: false, error: 'Failed to open billing portal.' });
                return;
            }

            res.json({ success: true, data: { portalUrl } });
        } catch (error: any) {
            console.error('Billing portal error:', error);
            res.status(500).json({ success: false, error: 'Failed to open billing portal.' });
        }
    }

    static async getPaymentHistory(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            if (!req.userId) {
                res.status(401).json({ success: false, error: 'Not logged in.' });
                return;
            }

            const payments = await SupabaseService.getPaymentHistory(req.userId);
            res.json({ success: true, data: { payments } });
        } catch (error: any) {
            console.error('Payment history error:', error);
            res.status(500).json({ success: false, error: 'Failed to fetch payment history.' });
        }
    }

    static async handleWebhook(req: Request, res: Response): Promise<void> {
        try {
            const signature = req.headers['stripe-signature'] as string;

            if (!signature) {
                res.status(400).json({ success: false, error: 'Missing Stripe signature.' });
                return;
            }

            const event = StripeService.constructWebhookEvent(req.body, signature);

            if (!event) {
                res.status(400).json({ success: false, error: 'Invalid webhook signature.' });
                return;
            }

            await StripeService.handleWebhookEvent(event);
            res.status(200).json({ received: true });
        } catch (error: any) {
            console.error('Webhook error:', error);
            res.status(500).json({ success: false, error: 'Webhook processing failed.' });
        }
    }
}

export default PaymentController;