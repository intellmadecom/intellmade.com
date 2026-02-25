// =============================================================
// STRIPE SERVICE — Credit-based payment system
// =============================================================
// All plans are ONE-TIME payments that add credits.
// Credits stack: 100 free + 600 personal = 700 total.
// Credits deduct on AI usage (images, videos, chat, etc.)
// =============================================================

import { stripe, PLAN_CONFIG, stripeWebhookSecret } from '../config/stripe';
import { supabaseAdmin } from '../config/supabase';
import { SubscriptionPlan, UserProfile } from '../types';
import { SupabaseService } from './supabaseService';
import Stripe from 'stripe';

export class StripeService {

    // ==========================================
    // CUSTOMER MANAGEMENT
    // ==========================================

    static async createCustomer(userId: string, email: string, name?: string): Promise<string | null> {
        try {
            const customer = await stripe.customers.create({
                email,
                name: name || undefined,
                metadata: { supabase_user_id: userId },
            });

            await supabaseAdmin
                .from('profiles')
                .update({ stripe_customer_id: customer.id })
                .eq('id', userId);

            return customer.id;
        } catch (error: any) {
            console.error('Error creating Stripe customer:', error.message);
            return null;
        }
    }

    static async getOrCreateCustomerId(user: UserProfile): Promise<string | null> {
        if (user.stripe_customer_id) {
            return user.stripe_customer_id;
        }
        return await this.createCustomer(user.id, user.email, user.full_name);
    }

    // ==========================================
    // CHECKOUT (one-time payments)
    // ==========================================

    static async createCheckoutSession(
        user: UserProfile,
        plan: SubscriptionPlan,
        successUrl: string,
        cancelUrl: string
    ): Promise<string | null> {
        try {
            const planConfig = PLAN_CONFIG[plan];

            if (!planConfig || !planConfig.stripePriceId) {
                console.error('No Stripe price ID for plan:', plan);
                return null;
            }

            const customerId = await this.getOrCreateCustomerId(user);
            if (!customerId) {
                console.error('Failed to get/create Stripe customer');
                return null;
            }

            const session = await stripe.checkout.sessions.create({
                customer: customerId,
                mode: 'payment',
                payment_method_types: ['card'],
                line_items: [
                    {
                        price: planConfig.stripePriceId,
                        quantity: 1,
                    },
                ],
                success_url: successUrl,
                cancel_url: cancelUrl,
                metadata: {
                    supabase_user_id: user.id,
                    plan_name: plan,
                },
                allow_promotion_codes: true,
            });

            return session.url;
        } catch (error: any) {
            console.error('Error creating checkout session:', error.message);
            return null;
        }
    }

    static async createBillingPortalSession(
        user: UserProfile,
        returnUrl: string
    ): Promise<string | null> {
        try {
            const customerId = await this.getOrCreateCustomerId(user);
            if (!customerId) return null;

            const session = await stripe.billingPortal.sessions.create({
                customer: customerId,
                return_url: returnUrl,
            });

            return session.url;
        } catch (error) {
            console.error('Error creating billing portal session:', error);
            return null;
        }
    }

    // ==========================================
    // CREDIT MANAGEMENT
    // ==========================================

    // Add credits to a user's account (stacks on top of existing)
    static async addCredits(userId: string, creditsToAdd: number, plan: string): Promise<boolean> {
        try {
            const { data: profile, error: fetchError } = await supabaseAdmin
                .from('profiles')
                .select('credits_remaining, subscription_plan')
                .eq('id', userId)
                .single();

            if (fetchError || !profile) {
                console.error('Failed to fetch user for credit update:', fetchError);
                return false;
            }

            // STACK credits on top of existing
            const newCredits = (profile.credits_remaining || 0) + creditsToAdd;

            const updateData: any = {
                credits_remaining: newCredits,
                updated_at: new Date().toISOString(),
            };

            // Upgrade plan label if new plan is higher tier
            const planOrder: Record<string, number> = { free: 0, flex: 0, personal: 1, creator: 2, studio: 3 };
            const currentPlanLevel = planOrder[profile.subscription_plan] || 0;
            const newPlanLevel = planOrder[plan] || 0;

            if (newPlanLevel > currentPlanLevel) {
                updateData.subscription_plan = plan;
                updateData.subscription_status = 'active';
            }

            const { error: updateError } = await supabaseAdmin
                .from('profiles')
                .update(updateData)
                .eq('id', userId);

            if (updateError) {
                console.error('Failed to update credits:', updateError);
                return false;
            }

            console.log(`Credits added: User ${userId} -> +${creditsToAdd} (total: ${newCredits}, plan: ${plan})`);
            return true;
        } catch (error) {
            console.error('Error adding credits:', error);
            return false;
        }
    }

    // Deduct credits from a user's account
    static async deductCredits(userId: string, creditsToDeduct: number, reason: string): Promise<{ success: boolean; remaining: number }> {
        try {
            const { data: profile, error: fetchError } = await supabaseAdmin
                .from('profiles')
                .select('credits_remaining')
                .eq('id', userId)
                .single();

            if (fetchError || !profile) {
                return { success: false, remaining: 0 };
            }

            if (profile.credits_remaining < creditsToDeduct) {
                console.log(`Not enough credits: User ${userId} has ${profile.credits_remaining}, needs ${creditsToDeduct} for ${reason}`);
                return { success: false, remaining: profile.credits_remaining };
            }

            const newCredits = profile.credits_remaining - creditsToDeduct;

            const { error: updateError } = await supabaseAdmin
                .from('profiles')
                .update({
                    credits_remaining: newCredits,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', userId);

            if (updateError) {
                console.error('Failed to deduct credits:', updateError);
                return { success: false, remaining: profile.credits_remaining };
            }

            console.log(`Credits deducted: User ${userId} -> -${creditsToDeduct} for ${reason} (remaining: ${newCredits})`);
            return { success: true, remaining: newCredits };
        } catch (error) {
            console.error('Error deducting credits:', error);
            return { success: false, remaining: 0 };
        }
    }

    // Check if user has enough credits
    static async checkCredits(userId: string, creditsNeeded: number): Promise<{ hasEnough: boolean; remaining: number }> {
        try {
            const { data: profile } = await supabaseAdmin
                .from('profiles')
                .select('credits_remaining')
                .eq('id', userId)
                .single();

            if (!profile) return { hasEnough: false, remaining: 0 };

            return {
                hasEnough: profile.credits_remaining >= creditsNeeded,
                remaining: profile.credits_remaining,
            };
        } catch (error) {
            return { hasEnough: false, remaining: 0 };
        }
    }

    // ==========================================
    // WEBHOOK HANDLING
    // ==========================================

    static constructWebhookEvent(payload: Buffer, signature: string): Stripe.Event | null {
        try {
            return stripe.webhooks.constructEvent(payload, signature, stripeWebhookSecret);
        } catch (error) {
            console.error('Webhook signature verification failed:', error);
            return null;
        }
    }

    static async handleWebhookEvent(event: Stripe.Event): Promise<void> {
        console.log(`Processing Stripe webhook: ${event.type}`);

        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object as Stripe.Checkout.Session;
                await this.handleCheckoutCompleted(session);
                break;
            }
            case 'payment_intent.succeeded': {
                const pi = event.data.object as Stripe.PaymentIntent;
                console.log(`Payment intent succeeded: ${pi.id}, amount: ${pi.amount}`);
                break;
            }
            case 'payment_intent.payment_failed': {
                const pi = event.data.object as Stripe.PaymentIntent;
                console.log(`Payment failed: ${pi.id}`);
                break;
            }
            default:
                console.log(`Unhandled webhook event: ${event.type}`);
        }
    }

    // Handle completed checkout — add credits to user
    private static async handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
        const userId = session.metadata?.supabase_user_id;
        const planName = session.metadata?.plan_name as SubscriptionPlan;

        if (!userId || !planName) {
            console.error('Missing metadata in checkout session:', { userId, planName });
            return;
        }

        const planConfig = PLAN_CONFIG[planName];
        if (!planConfig) {
            console.error('Unknown plan in checkout:', planName);
            return;
        }

        // Add credits (stacks on existing)
        const success = await this.addCredits(userId, planConfig.credits, planName);

        if (success) {
            console.log(`Checkout done: User ${userId} bought ${planName} -> +${planConfig.credits} credits`);

            // Save payment record
            try {
                await SupabaseService.savePayment(userId, {
                    stripePaymentIntentId: (session.payment_intent as string) || session.id,
                    stripeInvoiceId: session.id,
                    amountCents: session.amount_total || 0,
                    currency: session.currency || 'usd',
                    status: 'succeeded',
                    description: `${planConfig.name} - ${planConfig.credits} credits`,
                });
            } catch (err) {
                console.error('Failed to save payment record (credits still added):', err);
            }
        } else {
            console.error(`CRITICAL: Failed to add credits for user ${userId} after checkout!`);
        }
    }

    // ==========================================
    // PLAN INFORMATION
    // ==========================================

    static getPlans(): Record<string, {
        name: string;
        monthlyPrice: number;
        credits: number;
        features: string[];
    }> {
        const plans: any = {};
        for (const [key, config] of Object.entries(PLAN_CONFIG)) {
            plans[key] = {
                name: config.name,
                monthlyPrice: config.monthlyPrice,
                credits: config.credits,
                features: config.features,
            };
        }
        return plans;
    }
}

export default StripeService;