// =============================================================
// PRICING PAGE — Credit-based system (one-time payments)
// =============================================================
// After Stripe checkout, user returns here.
// Pricing.tsx calls /functions/v1/verify-payment to add credits.
// Credits STACK: 100 free + 600 personal = 700 total.
// =============================================================

import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

// ✅ FIXED: correct Supabase function names (match your deployed edge function folder names)
const API_URL = import.meta.env.VITE_SUPABASE_URL
  ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`
  : 'http://localhost:4000';

const CHECKOUT_URL  = `${API_URL}/create-checkout`;
const VERIFY_URL    = `${API_URL}/verify-payment`;

const Pricing: React.FC = () => {
  const { isLoggedIn, requireAuth, user, refreshCredits } = useAuth(); // ✅ pull user + refreshCredits
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [paymentMessage, setPaymentMessage] = useState<string | null>(null);

  useEffect(() => {
    // ✅ FIXED: read from window.location.search (params are before # now)
    const urlParams = new URLSearchParams(window.location.search);
    const payment   = urlParams.get('payment');
    const plan      = urlParams.get('plan');
    const sessionId = urlParams.get('session_id');

    if (payment === 'success' && plan && sessionId) {
      verifyAndAddCredits(sessionId, plan);
      // Clean URL after a short delay
      setTimeout(() => {
        window.history.replaceState(null, '', window.location.pathname + window.location.hash.split('?')[0]);
      }, 1000);
    } else if (payment === 'canceled') {
      setPaymentMessage('Payment was canceled. No charges were made.');
      setTimeout(() => {
        setPaymentMessage(null);
        window.history.replaceState(null, '', window.location.pathname + window.location.hash.split('?')[0]);
      }, 4000);
    }
  }, []);

  const verifyAndAddCredits = async (sessionId: string, plan: string) => {
    try {
      setPaymentMessage('Verifying your payment...');
      const token = localStorage.getItem('access_token');

      const response = await fetch(VERIFY_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY || '', // ✅ required by Supabase edge functions
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ sessionId }),
      });

      const data = await response.json();

      if (data.success) {
        const creditsAdded  = data.data.added    || 0;
        const totalCredits  = data.data.credits  || 0;

        if (data.data.alreadyCredited) {
          setPaymentMessage(`Payment already processed! You have ${totalCredits} credits.`);
        } else {
          setPaymentMessage(`Payment successful! +${creditsAdded} credits added. Total: ${totalCredits} credits.`);
        }

        // ✅ Refresh the credits badge in the header via AuthContext
        await refreshCredits();

        // Also fire legacy event for any other listeners
        window.dispatchEvent(new CustomEvent('credits-updated', {
          detail: { credits: totalCredits, plan: data.data.plan }
        }));
      } else {
        setPaymentMessage(data.error || 'Failed to verify payment. Please contact support.');
      }
    } catch (error) {
      console.error('Verify payment error:', error);
      setPaymentMessage('Failed to verify payment. Your credits will be added shortly.');
    }

    setTimeout(() => setPaymentMessage(null), 8000);
  };

  // ✅ Unified checkout handler — no duplication
  const startCheckout = async (planId: string) => {
    if (!requireAuth(planId)) return;
    if (planId === 'free') {
      alert('You already have 100 free credits! Go try the tools.');
      return;
    }

    try {
      setLoadingPlan(planId);
      const token = localStorage.getItem('access_token');

      const response = await fetch(CHECKOUT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY || '', // ✅ required by Supabase
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          plan: planId,
          email: user?.email, // ✅ pre-fills Stripe checkout form
        }),
      });

      const data = await response.json();

      if (data.success && data.data?.checkoutUrl) {
        window.location.href = data.data.checkoutUrl;
      } else {
        alert(data.error || 'Failed to start checkout. Please try again.');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      alert('Something went wrong. Please check your connection and try again.');
    } finally {
      setLoadingPlan(null);
    }
  };

  const pricingTiers = [
    {
      name: '🆓 TRIAL',
      planId: 'free',
      price: '$0',
      credits: '100 credits',
      features: [
        'Text / Chat / Logic',
        'Image generation & edit',
        '❌ No video generation'
      ],
      button: 'Start for Free',
      color: 'border-white/10 hover:border-white/20'
    },
    {
      name: '🔹 PERSONAL',
      planId: 'personal',
      price: '$22',
      credits: '600 credits',
      features: [
        'Text, image & voice tools',
        'Image generation & editing',
        'Limited short video access',
        'Standard rendering speed'
      ],
      button: 'Upgrade Now',
      color: 'border-blue-500/30 hover:border-blue-500/50 bg-blue-500/5'
    },
    {
      name: '⭐ CREATOR',
      planId: 'creator',
      price: '$49',
      credits: '1800 credits',
      features: [
        'Full video generation',
        'Faster rendering',
        'Batch processing',
        'Priority queue',
        'Commercial use'
      ],
      button: 'Most Popular',
      color: 'border-purple-500/30 hover:border-purple-500/50 bg-purple-500/5',
      featured: true
    },
    {
      name: '🏢 STUDIO',
      planId: 'studio',
      price: '$99',
      credits: '5000 credits',
      features: [
        'Team access',
        'White-label exports',
        'Unlimited cloud history',
        'Highest priority & early access',
        '⚡ Videos cost 45cr each (up to 111 videos)',
        '🖼 Images cost 12cr each (up to 416 images)',
        'Best value for mixed workloads'
      ],
      button: 'Scale Big',
      color: 'border-emerald-500/30 hover:border-emerald-500/50 bg-emerald-500/5'
    }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-4 animate-fadeIn">
      {/* Payment status message */}
      {paymentMessage && (
        <div className={`mb-6 p-4 rounded-2xl text-center font-bold text-sm ${
          paymentMessage.includes('successful') || paymentMessage.includes('added') || paymentMessage.includes('processed')
            ? 'bg-green-500/20 border border-green-500/40 text-green-400'
            : paymentMessage.includes('Verifying')
            ? 'bg-blue-500/20 border border-blue-500/40 text-blue-400 animate-pulse'
            : 'bg-red-500/20 border border-red-500/40 text-red-400'
        }`}>
          {paymentMessage}
        </div>
      )}

      <div className="text-center mb-10">
        <h2 className="text-4xl md:text-5xl font-outfit font-extrabold mb-3 tracking-tight">Choice of Power</h2>
        <p className="text-gray-400 text-sm max-w-xl mx-auto uppercase tracking-widest font-black opacity-60">
          Scalable intelligence for the global production house.
        </p>
      </div>

      {/* 4 Pricing Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10 items-stretch">
        {pricingTiers.map((tier, idx) => (
          <div
            key={idx}
            className={`glass p-6 rounded-[2.5rem] border-2 flex flex-col h-full transition-all duration-500 relative ${tier.color} ${tier.featured ? 'lg:scale-[1.03] z-20 shadow-[0_0_50px_rgba(168,85,247,0.1)]' : ''}`}
          >
            {tier.featured && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-purple-500 to-indigo-500 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-[0.2em] text-white whitespace-nowrap shadow-lg">
                Recommended
              </div>
            )}
            <div className="mb-6">
              <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3">{tier.name}</h3>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-outfit font-extrabold">{tier.price}</span>
              </div>
              <p className="text-blue-400 text-[10px] font-bold mt-1 uppercase tracking-widest">{tier.credits}</p>
            </div>

            <ul className="space-y-3 mb-8 flex-grow">
              {tier.features.map((feature, fIdx) => (
                <li key={fIdx} className="flex items-start gap-2 text-[11px] text-gray-400 leading-snug">
                  <i className={`fas ${
                    feature.includes('❌') ? 'fa-times text-red-500' :
                    feature.includes('⚡') || feature.includes('🖼') ? 'fa-info-circle text-amber-500' :
                    'fa-check text-blue-500'
                  } text-[9px] mt-1 shrink-0`}></i>
                  <span>{feature.replace('❌ ', '').replace('⚡ ', '').replace('🖼 ', '')}</span>
                </li>
              ))}
            </ul>

            <button
              onClick={() => startCheckout(tier.planId)}
              disabled={loadingPlan === tier.planId}
              className={`w-full py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all cursor-pointer ${
                tier.featured
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-xl shadow-purple-900/30 hover:brightness-110 active:scale-95'
                  : 'bg-white/5 hover:bg-white/10 text-white border border-white/10'
              } ${loadingPlan === tier.planId ? 'opacity-50 cursor-wait' : ''}`}
            >
              {loadingPlan === tier.planId ? 'Processing...' : tier.button}
            </button>
          </div>
        ))}
      </div>

      {/* Flex Credit Section */}
      <div className="relative glass p-8 rounded-[3rem] border-2 border-amber-500/40 bg-gradient-to-br from-amber-500/10 via-black/60 to-amber-900/10 transition-all duration-300 shadow-2xl overflow-hidden group blink-attention">
        <div className="absolute inset-0 bg-amber-400/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 blur-[50px] pointer-events-none"></div>

        <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-8">
          <div className="flex flex-col items-center lg:items-start text-center lg:text-left gap-2 shrink-0">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[10px] font-black uppercase tracking-widest mb-1">
              On-Demand Power
            </div>
            <h3 className="text-4xl font-outfit font-black text-white tracking-tighter">
              Flex Credit <span className="text-amber-500">$10</span>
            </h3>
            <p className="text-gray-400 text-[11px] max-w-[280px] font-bold uppercase tracking-tight opacity-70">
              Instant activation for high-spike production needs.
            </p>
          </div>

          <div className="flex-1 w-full max-w-lg">
            <div className="grid grid-cols-4 gap-2">
              {[
                { val: '8',  unit: 'Images' },
                { val: '2',  unit: 'Videos' },
                { val: '12', unit: 'Edits' },
                { val: '50', unit: 'Chats' }
              ].map((item, i) => (
                <div key={i} className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white/5 border border-white/5 transition-all">
                  <span className="text-xl font-black text-amber-500">{item.val}</span>
                  <span className="text-[8px] text-gray-500 font-black uppercase tracking-widest">{item.unit}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="shrink-0 w-full lg:w-auto">
            <button
              onClick={() => startCheckout('flex')}
              disabled={loadingPlan === 'flex'}
              className={`w-full lg:w-auto px-10 py-5 bg-amber-500 hover:bg-amber-400 text-black rounded-3xl font-black text-xs uppercase tracking-[0.2em] transition-all shadow-2xl shadow-amber-900/30 active:scale-95 flex items-center justify-center gap-3 cursor-pointer ${
                loadingPlan === 'flex' ? 'opacity-50 cursor-wait' : ''
              }`}
            >
              <i className="fas fa-bolt"></i>
              <span>{loadingPlan === 'flex' ? 'Processing...' : 'Buy Flex'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-12 text-center max-w-2xl mx-auto border-t border-white/5 pt-8 pb-12">
        <p className="text-[10px] text-gray-600 font-black uppercase tracking-widest leading-relaxed">
          Credits roll over for 90 days. Custom SLA and multi-seat licensing available for enterprise.
        </p>
      </div>

      <style>{`
        @keyframes blinker {
          0%, 80%, 100% { border-color: rgba(245, 158, 11, 0.4); }
          85%, 95% { border-color: rgba(245, 158, 11, 1); box-shadow: 0 0 30px rgba(245, 158, 11, 0.3); }
        }
        .blink-attention {
          animation: blinker 4s infinite ease-in-out;
        }
      `}</style>
    </div>
  );
};

export default Pricing;