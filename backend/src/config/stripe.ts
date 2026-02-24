// =============================================================
// STRIPE CONFIGURATION
// =============================================================

import Stripe from 'stripe';
import dotenv from 'dotenv';
import { PlanDetails, SubscriptionPlan } from '../types';

dotenv.config();

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

if (!stripeSecretKey) {
    console.error('========================================');
    console.error('ERROR: Missing STRIPE_SECRET_KEY in .env file!');
    console.error('Get it from: https://dashboard.stripe.com/apikeys');
    console.error('========================================');
    process.exit(1);
}

export const stripe = new Stripe(stripeSecretKey, {
    apiVersion: '2024-06-20' as Stripe.LatestApiVersion,
    typescript: true,
});

export const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

// ----- PLAN CONFIGURATION -----
// These match the pricing page exactly

export const PLAN_CONFIG: Record<SubscriptionPlan, PlanDetails> = {
    free: {
        name: 'Trial',
        stripePriceId: null,
        monthlyPrice: 0,
        credits: 100,
        features: [
            '100 credits',
            'Text / Chat / Logic',
            'Image generation & edit',
            'No video generation',
        ],
    },
    personal: {
        name: 'Personal',
        stripePriceId: process.env.STRIPE_PRICE_PERSONAL || '',
        monthlyPrice: 22,
        credits: 600,
        features: [
            '600 credits',
            'Text, image & voice tools',
            'Image generation & editing',
            'Limited short video access',
            'Standard rendering speed',
        ],
    },
    creator: {
        name: 'Creator',
        stripePriceId: process.env.STRIPE_PRICE_CREATOR || '',
        monthlyPrice: 49,
        credits: 1800,
        features: [
            '1,800 credits',
            'Full video generation',
            'Faster rendering',
            'Batch processing',
            'Priority queue',
            'Commercial use',
        ],
    },
    studio: {
        name: 'Studio',
        stripePriceId: process.env.STRIPE_PRICE_STUDIO || '',
        monthlyPrice: 99,
        credits: 5000,
        features: [
            '5,000 credits',
            'Team access',
            'White-label exports',
            'Unlimited cloud history',
            'Highest priority',
            'Early access tools',
        ],
    },
    flex: {
        name: 'Flex Credit',
        stripePriceId: process.env.STRIPE_PRICE_FLEX || '',
        monthlyPrice: 10,
        credits: 100,
        features: [
            '~17 Images',
            '~7 Videos',
            '~35 Chats',
            'One-time purchase',
        ],
    },
};

export default stripe;