const express = require("express");
const Razorpay = require('razorpay');
const CryptoJS = require('crypto-js');
const Payment = require("./models/paymentModel");
const User = require("./models/userModel");

const app = express();
const PORT = 8000;

const RAZORPAY_SUBSCRIPTION_PLAN_ID = "plan_NfPU48dijLvW9G"
const RAZORPAY_SUBSCRIPTION_API_KEY = "rzp_live_KsxB9mILdGLLj3"
const RAZORPAY_SUBSCRIPTION_SECRET_KEY = "KYlU5W0hGJSDrP6OyI12Vc41"

const instance = new Razorpay({
    key_id: RAZORPAY_SUBSCRIPTION_API_KEY,
    key_secret: RAZORPAY_SUBSCRIPTION_SECRET_KEY,
});

// Middleware to parse JSON bodies
app.use(express.json());

// Default route
app.use("/", function (req, res) {
    res.json({ message: "Service is live" });
});

// Controller to create a subscription
app.post('/create-subscription', async function (req, res) {
    try {
        const options = {
            plan_id: RAZORPAY_SUBSCRIPTION_PLAN_ID,
            customer_notify: 1,
            total_count: 60,
            start_at: Math.floor(Date.now() / 1000) + (15 * 60)
        };
        const newSubscription = await instance.subscriptions.create(options);
        res.status(201).json({
            success: true,
            subscription_id: newSubscription.id,
        });
    } catch (error) {
        console.error("Error creating subscription:", error);
        res.status(400).json({
            success: false,
            error: error.message,
        });
    }
});

// Function to generate signature for payment verification
function generateSignature(razorpay_payment_id, razorpay_subscription_id, key_secret) {
    const data = `${razorpay_payment_id}|${razorpay_subscription_id}`;
    const signature = CryptoJS.HmacSHA256(data, key_secret).toString(CryptoJS.enc.Hex);
    return signature;
}

// Controller for payment verification
app.post('/payment-verification', async function (req, res) {
    try {
        const { razorpay_payment_id, razorpay_signature, razorpay_subscription_id, userData } = req.body;
        const user = await User.create(userData);
        const generated_signature = generateSignature(razorpay_payment_id, razorpay_subscription_id, process.env.RAZORPAY_SUBSCRIPTION_SECRET_KEY);
        const isAuthentic = generated_signature === razorpay_signature;
        if (!isAuthentic) {
            await User.findByIdAndDelete(user._id);
            res.status(400).json({
                success: false,
                error: "Not authentic payment",
            });
            return;
        }
        await Payment.create({ razorpay_payment_id, razorpay_signature, razorpay_subscription_id });
        await user.save();
        res.status(200).json({
            success: true,
            message: "Welcome !!",
        });
    } catch (error) {
        console.error("Error verifying payment:", error);
        res.status(500).json({
            success: false,
            error: "Internal server error",
        });
    }
});


// Start server
app.listen(PORT, function () {
    console.log(`Server is running on port ${PORT}`);
});
