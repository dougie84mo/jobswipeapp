const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const { Subscription, SubscriptionTransaction, User, Company } = require('../models');
const auth = require('../middleware/auth');

// @route   GET api/subscriptions/plans
// @desc    Get available subscription plans
// @access  Public
router.get('/plans', (req, res) => {
  // Define subscription plans
  const plans = {
    jobseeker: {
      free: {
        name: 'Free',
        price: 0,
        currency: 'USD',
        interval: null,
        features: [
          'Limited swipes per day (20)',
          'Basic profile',
          'Standard matching algorithm'
        ]
      },
      basic: {
        name: 'Basic',
        price: 9.99,
        currency: 'USD',
        interval: 'monthly',
        features: [
          'Increased swipes per day (50)',
          'Enhanced profile visibility',
          'See who liked your profile',
          'Advanced matching algorithm'
        ]
      },
      premium: {
        name: 'Premium',
        price: 19.99,
        currency: 'USD',
        interval: 'monthly',
        features: [
          'Unlimited swipes',
          'Priority profile placement',
          'See who liked your profile',
          'Advanced matching algorithm',
          'Message read receipts',
          'Profile analytics'
        ]
      }
    },
    recruiter: {
      free: {
        name: 'Free',
        price: 0,
        currency: 'USD',
        interval: null,
        features: [
          'Limited job postings (1)',
          'Basic company profile',
          'Standard matching algorithm',
          'Limited candidate views'
        ]
      },
      basic: {
        name: 'Basic',
        price: 49.99,
        currency: 'USD',
        interval: 'monthly',
        features: [
          'Multiple job postings (5)',
          'Enhanced company profile',
          'Advanced matching algorithm',
          'Candidate analytics',
          'Priority support'
        ]
      },
      premium: {
        name: 'Premium',
        price: 99.99,
        currency: 'USD',
        interval: 'monthly',
        features: [
          'Unlimited job postings',
          'Featured company profile',
          'Advanced matching algorithm',
          'Comprehensive candidate analytics',
          'Priority support',
          'Dedicated account manager'
        ]
      },
      enterprise: {
        name: 'Enterprise',
        price: 299.99,
        currency: 'USD',
        interval: 'monthly',
        features: [
          'Unlimited job postings',
          'Featured company profile',
          'Custom matching algorithm',
          'Advanced analytics dashboard',
          'Priority support',
          'Dedicated account manager',
          'API access',
          'Custom integrations'
        ]
      }
    }
  };

  res.json(plans);
});

// @route   GET api/subscriptions/current
// @desc    Get current user's subscription
// @access  Private
router.get('/current', auth, async (req, res) => {
  try {
    // Find active subscription for user
    const subscription = await Subscription.findOne({
      where: {
        userId: req.user.id,
        isActive: true
      }
    });

    if (!subscription) {
      return res.json({ subscription: null, tier: 'free' });
    }

    // Get recent transactions
    const transactions = await SubscriptionTransaction.findAll({
      where: {
        subscriptionId: subscription.id
      },
      order: [['transactionDate', 'DESC']],
      limit: 5
    });

    res.json({
      subscription,
      transactions
    });
  } catch (err) {
    console.error('Get current subscription error:', err);
    res.status(500).send('Server error');
  }
});

// @route   POST api/subscriptions
// @desc    Create a new subscription
// @access  Private
router.post(
  '/',
  [
    auth,
    [
      check('planType', 'Plan type is required').isIn(['jobseeker', 'recruiter', 'company']),
      check('tier', 'Tier is required').isIn(['free', 'basic', 'premium', 'enterprise']),
      check('paymentMethod', 'Payment method is required for paid tiers').custom((value, { req }) => {
        if (req.body.tier !== 'free' && !value) {
          throw new Error('Payment method is required for paid tiers');
        }
        return true;
      })
    ]
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { planType, tier, paymentMethod, paymentId, companyId, interval = 'monthly' } = req.body;

    try {
      // Check if user already has an active subscription
      const existingSubscription = await Subscription.findOne({
        where: {
          userId: req.user.id,
          isActive: true
        }
      });

      if (existingSubscription) {
        return res.status(400).json({ msg: 'User already has an active subscription' });
      }

      // Validate plan type matches user type
      if (planType === 'jobseeker' && req.user.userType !== 'jobseeker') {
        return res.status(400).json({ msg: 'Invalid plan type for user' });
      }

      if ((planType === 'recruiter' || planType === 'company') && req.user.userType !== 'recruiter') {
        return res.status(400).json({ msg: 'Invalid plan type for user' });
      }

      // Get plan details
      const plans = {
        jobseeker: {
          free: { price: 0 },
          basic: { price: 9.99 },
          premium: { price: 19.99 }
        },
        recruiter: {
          free: { price: 0 },
          basic: { price: 49.99 },
          premium: { price: 99.99 },
          enterprise: { price: 299.99 }
        },
        company: {
          free: { price: 0 },
          basic: { price: 99.99 },
          premium: { price: 199.99 },
          enterprise: { price: 499.99 }
        }
      };

      const planPrice = plans[planType][tier].price;

      // Calculate end date (1 month from now for monthly, 1 year for yearly)
      const startDate = new Date();
      const endDate = new Date();
      if (interval === 'monthly') {
        endDate.setMonth(endDate.getMonth() + 1);
      } else if (interval === 'yearly') {
        endDate.setFullYear(endDate.getFullYear() + 1);
      }

      // Create subscription
      const subscription = await Subscription.create({
        userId: req.user.id,
        companyId: planType === 'company' ? companyId : null,
        planType,
        tier,
        startDate,
        endDate,
        isActive: true,
        autoRenew: tier !== 'free',
        paymentMethod: tier === 'free' ? null : paymentMethod,
        paymentId: tier === 'free' ? null : paymentId,
        amount: planPrice,
        currency: 'USD',
        interval: tier === 'free' ? null : interval,
        status: 'active',
        features: {} // This would be populated based on the tier
      });

      // Create transaction record for paid subscriptions
      if (tier !== 'free') {
        await SubscriptionTransaction.create({
          subscriptionId: subscription.id,
          transactionDate: new Date(),
          amount: planPrice,
          currency: 'USD',
          paymentMethod,
          paymentId,
          status: 'completed',
          type: 'subscription',
          description: `Initial payment for ${planType} ${tier} subscription`
        });
      }

      // Update user's subscription tier
      await User.update(
        {
          subscriptionTier: tier,
          subscriptionExpiresAt: endDate
        },
        {
          where: { id: req.user.id }
        }
      );

      // If company subscription, update company as well
      if (planType === 'company' && companyId) {
        await Company.update(
          {
            subscriptionTier: tier,
            subscriptionExpiresAt: endDate
          },
          {
            where: { id: companyId }
          }
        );
      }

      res.json(subscription);
    } catch (err) {
      console.error('Create subscription error:', err);
      res.status(500).send('Server error');
    }
  }
);

// @route   PUT api/subscriptions/:id
// @desc    Update subscription (cancel, change tier, etc.)
// @access  Private
router.put('/:id', auth, async (req, res) => {
  try {
    const subscription = await Subscription.findByPk(req.params.id);

    if (!subscription) {
      return res.status(404).json({ msg: 'Subscription not found' });
    }

    // Check if user owns this subscription
    if (subscription.userId !== req.user.id) {
      return res.status(403).json({ msg: 'Not authorized to update this subscription' });
    }

    const { autoRenew, status, tier } = req.body;

    const updateData = {};
    
    // Handle cancellation
    if (status === 'canceled') {
      updateData.status = 'canceled';
      updateData.autoRenew = false;
      updateData.canceledAt = new Date();
      updateData.cancelReason = req.body.cancelReason || null;
    } 
    // Handle tier change
    else if (tier && tier !== subscription.tier) {
      // This would typically involve payment processing logic
      // For now, just update the tier
      updateData.tier = tier;
      
      // Get plan details
      const plans = {
        jobseeker: {
          free: { price: 0 },
          basic: { price: 9.99 },
          premium: { price: 19.99 }
        },
        recruiter: {
          free: { price: 0 },
          basic: { price: 49.99 },
          premium: { price: 99.99 },
          enterprise: { price: 299.99 }
        },
        company: {
          free: { price: 0 },
          basic: { price: 99.99 },
          premium: { price: 199.99 },
          enterprise: { price: 499.99 }
        }
      };
      
      updateData.amount = plans[subscription.planType][tier].price;
      
      // Create transaction for tier change
      if (tier !== 'free') {
        await SubscriptionTransaction.create({
          subscriptionId: subscription.id,
          transactionDate: new Date(),
          amount: updateData.amount,
          currency: 'USD',
          paymentMethod: subscription.paymentMethod,
          paymentId: req.body.paymentId || subscription.paymentId,
          status: 'completed',
          type: 'subscription',
          description: `Subscription tier change to ${tier}`
        });
      }
      
      // Update user's subscription tier
      await User.update(
        { subscriptionTier: tier },
        { where: { id: req.user.id } }
      );
      
      // If company subscription, update company as well
      if (subscription.companyId) {
        await Company.update(
          { subscriptionTier: tier },
          { where: { id: subscription.companyId } }
        );
      }
    }
    
    // Handle auto-renew toggle
    if (autoRenew !== undefined && autoRenew !== subscription.autoRenew) {
      updateData.autoRenew = autoRenew;
    }

    // Update subscription
    if (Object.keys(updateData).length > 0) {
      await subscription.update(updateData);
    }

    res.json(await Subscription.findByPk(req.params.id));
  } catch (err) {
    console.error('Update subscription error:', err);
    res.status(500).send('Server error');
  }
});

// @route   POST api/subscriptions/webhook
// @desc    Handle payment provider webhooks (e.g., Stripe)
// @access  Public (but secured by webhook signature)
router.post('/webhook', async (req, res) => {
  try {
    // This would typically verify the webhook signature from the payment provider
    // For now, just log the event
    console.log('Webhook received:', req.body);

    // Handle different event types
    const event = req.body;

    switch (event.type) {
      case 'payment_succeeded':
        // Handle successful payment
        // Update subscription status, extend end date, etc.
        break;
      case 'payment_failed':
        // Handle failed payment
        // Update subscription status, send notification, etc.
        break;
      case 'subscription_canceled':
        // Handle subscription cancellation
        // Update subscription status, etc.
        break;
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (err) {
    console.error('Webhook error:', err);
    res.status(400).send(`Webhook Error: ${err.message}`);
  }
});

// @route   GET api/subscriptions/transactions
// @desc    Get user's subscription transactions
// @access  Private
router.get('/transactions', auth, async (req, res) => {
  try {
    // Get user's subscriptions
    const subscriptions = await Subscription.findAll({
      where: { userId: req.user.id }
    });

    const subscriptionIds = subscriptions.map(sub => sub.id);

    // Get transactions for these subscriptions
    const transactions = await SubscriptionTransaction.findAll({
      where: {
        subscriptionId: subscriptionIds
      },
      include: [
        {
          model: Subscription,
          as: 'subscription',
          attributes: ['planType', 'tier']
        }
      ],
      order: [['transactionDate', 'DESC']]
    });

    res.json(transactions);
  } catch (err) {
    console.error('Get transactions error:', err);
    res.status(500).send('Server error');
  }
});

module.exports = router; 