import { Router } from 'express';
import { PaymentController } from '../controllers/paymentController';
import { requireAuth } from '../middleware/auth';
import { webhookRateLimit } from '../middleware/rateLimit';

const router = Router();

// PUBLIC
router.get('/plans', PaymentController.getPlans);
router.post('/webhook', webhookRateLimit, PaymentController.handleWebhook);

// PROTECTED
router.post('/checkout', requireAuth, PaymentController.createCheckout);
router.post('/verify-payment', requireAuth, PaymentController.verifyPayment);
router.post('/billing-portal', requireAuth, PaymentController.createBillingPortal);
router.get('/credits', requireAuth, PaymentController.getCredits);
router.get('/history', requireAuth, PaymentController.getPaymentHistory);

export default router;