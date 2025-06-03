
const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const paypal = require('paypal-rest-sdk');
const { authenticate } = require('../middleware/auth');
const db = require('../config/database');

const router = express.Router();

// Configure PayPal
paypal.configure({
  mode: process.env.PAYPAL_MODE || 'sandbox',
  client_id: process.env.PAYPAL_CLIENT_ID,
  client_secret: process.env.PAYPAL_CLIENT_SECRET
});

// Initiate payment
router.post('/initiate', authenticate, async (req, res) => {
  try {
    const { listingId, amount, currency = 'XOF', paymentGateway } = req.body;

    // Validate listing
    const listingResult = await db.query(
      'SELECT id, user_id, title, price FROM listings WHERE id = $1 AND status = $2',
      [listingId, 'ACTIVE']
    );

    if (listingResult.rows.length === 0) {
      return res.status(404).json({ message: 'Listing not found' });
    }

    const listing = listingResult.rows[0];

    // Create transaction record
    const transactionResult = await db.query(`
      INSERT INTO transactions (listing_id, buyer_id, seller_id, amount, currency, payment_gateway, status)
      VALUES ($1, $2, $3, $4, $5, $6, 'PENDING')
      RETURNING id
    `, [listingId, req.user.id, listing.user_id, amount, currency, paymentGateway]);

    const transactionId = transactionResult.rows[0].id;

    if (paymentGateway === 'STRIPE') {
      // Create Stripe checkout session
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [{
          price_data: {
            currency: currency.toLowerCase(),
            product_data: {
              name: listing.title,
            },
            unit_amount: Math.round(amount * 100), // Stripe expects cents
          },
          quantity: 1,
        }],
        mode: 'payment',
        success_url: `${process.env.FRONTEND_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}&transaction_id=${transactionId}`,
        cancel_url: `${process.env.FRONTEND_URL}/payment/cancel?transaction_id=${transactionId}`,
        metadata: {
          transaction_id: transactionId,
          listing_id: listingId
        }
      });

      // Update transaction with Stripe session ID
      await db.query(
        'UPDATE transactions SET payment_gateway_transaction_id = $1 WHERE id = $2',
        [session.id, transactionId]
      );

      res.json({ 
        url: session.url,
        sessionId: session.id,
        transactionId 
      });

    } else if (paymentGateway === 'PAYPAL') {
      // Create PayPal payment
      const create_payment_json = {
        intent: 'sale',
        payer: { payment_method: 'paypal' },
        redirect_urls: {
          return_url: `${process.env.FRONTEND_URL}/payment/paypal/success?transaction_id=${transactionId}`,
          cancel_url: `${process.env.FRONTEND_URL}/payment/cancel?transaction_id=${transactionId}`
        },
        transactions: [{
          item_list: {
            items: [{
              name: listing.title,
              sku: listingId,
              price: amount.toString(),
              currency: currency,
              quantity: 1
            }]
          },
          amount: {
            currency: currency,
            total: amount.toString()
          },
          description: `Payment for ${listing.title}`
        }]
      };

      paypal.payment.create(create_payment_json, async (error, payment) => {
        if (error) {
          console.error('PayPal error:', error);
          return res.status(500).json({ message: 'PayPal payment creation failed' });
        }

        // Update transaction with PayPal payment ID
        await db.query(
          'UPDATE transactions SET payment_gateway_transaction_id = $1 WHERE id = $2',
          [payment.id, transactionId]
        );

        const approvalUrl = payment.links.find(link => link.rel === 'approval_url').href;
        res.json({ 
          url: approvalUrl,
          paymentId: payment.id,
          transactionId 
        });
      });

    } else if (paymentGateway === 'PAYDUNYA') {
      // PayDunya integration (implement based on their API)
      res.json({ 
        message: 'PayDunya integration not implemented yet',
        transactionId 
      });
    } else {
      return res.status(400).json({ message: 'Invalid payment gateway' });
    }

  } catch (error) {
    console.error('Payment initiation error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Stripe webhook
router.post('/stripe/webhook', express.raw({type: 'application/json'}), async (req, res) => {
  const sig = req.headers['stripe-signature'];

  try {
    const event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const transactionId = session.metadata.transaction_id;

      await db.query(
        'UPDATE transactions SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        ['PAID', transactionId]
      );

      // Create notification for seller
      const transactionDetails = await db.query(
        'SELECT seller_id, listing_id FROM transactions WHERE id = $1',
        [transactionId]
      );

      if (transactionDetails.rows.length > 0) {
        await db.query(`
          INSERT INTO notifications (user_id, type, title, content, link)
          VALUES ($1, 'PAYMENT_RECEIVED', 'Payment Received', 
                  'You have received a payment for your listing', 
                  '/listings/${transactionDetails.rows[0].listing_id}')
        `, [transactionDetails.rows[0].seller_id]);
      }
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Stripe webhook error:', error);
    res.status(400).json({ message: 'Webhook error' });
  }
});

// PayPal success callback
router.get('/paypal/success', async (req, res) => {
  try {
    const { paymentId, PayerID, transaction_id } = req.query;

    const execute_payment_json = {
      payer_id: PayerID
    };

    paypal.payment.execute(paymentId, execute_payment_json, async (error, payment) => {
      if (error) {
        console.error('PayPal execution error:', error);
        return res.status(500).json({ message: 'Payment execution failed' });
      }

      if (payment.state === 'approved') {
        await db.query(
          'UPDATE transactions SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
          ['PAID', transaction_id]
        );

        res.redirect(`${process.env.FRONTEND_URL}/payment/success?transaction_id=${transaction_id}`);
      } else {
        res.redirect(`${process.env.FRONTEND_URL}/payment/failed?transaction_id=${transaction_id}`);
      }
    });
  } catch (error) {
    console.error('PayPal success error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get payment status
router.get('/status/:transactionId', authenticate, async (req, res) => {
  try {
    const { transactionId } = req.params;

    const result = await db.query(`
      SELECT t.*, l.title as listing_title
      FROM transactions t
      JOIN listings l ON t.listing_id = l.id
      WHERE t.id = $1 AND (t.buyer_id = $2 OR t.seller_id = $2)
    `, [transactionId, req.user.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    res.json({ transaction: result.rows[0] });
  } catch (error) {
    console.error('Get payment status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
