// =============================================================
// CREDIT DEDUCTION ROUTES
// POST /api/credits/deduct  — called by frontend after each AI generation
// GET  /api/credits/balance — get current balance
// =============================================================
// Pricing basis: Personal plan $22 = 600 credits → $0.0367 per credit
// All costs validated against Google Gemini/Veo API pricing (Feb 2026)
// =============================================================

import { Router, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { AuthenticatedRequest } from '../types';
import { StripeService } from '../services/stripeService';
import { supabaseAdmin } from '../config/supabase';

const router = Router();

// Credit costs per tool — based on real API costs with ~2x profit margin
// API costs (Feb 2026):
//   gemini-3-pro text:        ~$0.009/call
//   gemini-3-flash text:      ~$0.002/call
//   gemini-3-pro-image 4K:    ~$0.240/image
//   gemini-2.5-flash-image:   ~$0.134/image
//   veo-3.1-fast 8s video:    ~$1.20/video  ($0.15/sec × 8sec)
//   veo-3.1 8s video:         ~$3.20/video  ($0.40/sec × 8sec)
const TOOL_COSTS: Record<string, number> = {
  general_intelligence:  2,   // API ~$0.009  → 2cr = $0.073  | margin 87.7%
  image_analyzer:        2,   // API ~$0.009  → 2cr = $0.073  | margin 87.7%
  video_analyzer:        2,   // API ~$0.009  → 2cr = $0.073  | margin 87.7%
  audio_transcriber:     2,   // API ~$0.002  → 2cr = $0.073  | margin 97.3%
  voice_chat:            2,   // API ~$0.002  → 2cr = $0.073  | margin 97.3%
  image_editor:          8,   // API ~$0.134  → 8cr = $0.293  | margin 54.3%
  image_cloner:          8,   // API ~$0.134  → 8cr = $0.293  | margin 54.3%
  image_creator:         12,  // API ~$0.240  → 12cr = $0.440 | margin 45.5%
  photo_animator:        45,  // API ~$1.200  → 45cr = $1.650 | margin 27.3%
  prompt_video:          45,  // API ~$1.200  → 45cr = $1.650 | margin 27.3%
};

// POST /api/credits/deduct
router.post('/deduct', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not logged in.' });
      return;
    }

    const { tool } = req.body;

    if (!tool || TOOL_COSTS[tool] === undefined) {
      res.status(400).json({ success: false, error: `Unknown tool: ${tool}` });
      return;
    }

    const cost = TOOL_COSTS[tool];

    if (req.user.credits_remaining < cost) {
      res.status(403).json({
        success: false,
        error: `Not enough credits. Need ${cost}, have ${req.user.credits_remaining}. Please top up.`,
        remaining: req.user.credits_remaining,
      });
      return;
    }

    const result = await StripeService.deductCredits(req.user.id, cost, tool);

    if (!result.success) {
      res.status(500).json({ success: false, error: 'Failed to deduct credits.' });
      return;
    }

    // Log to credit_transactions for history (non-fatal if fails)
    try {
      await supabaseAdmin.from('credit_transactions').insert({
        email: req.user.email,
        amount: -cost,
        type: 'usage',
        description: `Used: ${tool}`,
      });
    } catch (e) {
      console.error('Failed to log credit transaction:', e);
    }

    res.json({
      success: true,
      data: {
        deducted: cost,
        remaining: result.remaining,
        tool,
      },
    });
  } catch (error: any) {
    console.error('Credit deduction error:', error);
    res.status(500).json({ success: false, error: 'Failed to deduct credits.' });
  }
});

// GET /api/credits/balance
router.get('/balance', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not logged in.' });
      return;
    }

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('credits_remaining, subscription_plan')
      .eq('id', req.user.id)
      .single();

    res.json({
      success: true,
      data: {
        credits: profile?.credits_remaining ?? 0,
        plan: profile?.subscription_plan ?? 'free',
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to fetch balance.' });
  }
});

export default router;