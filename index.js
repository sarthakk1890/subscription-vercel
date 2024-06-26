const express = require("express");
const Razorpay = require('razorpay');
const CryptoJS = require('crypto-js');
const Payment = require("./models/paymentModel");
const User = require("./models/userModel");
const mongoose = require("mongoose");
const cors = require("cors")

const app = express();
const PORT = 8000;

const MONGO_URI1 = "mongodb+srv://cuteuserapplication:6pJZF7O378xMZf9A@cluster0.pwy7y3n.mongodb.net/?retryWrites=true&w=majority"
const MONGO_URI= "mongodb+srv://passwordisSArthak:passwordisSArthak@cluster0.b8muydt.mongodb.net/?retryWrites=true&w=majority"


const connectDatabase = () => {
    mongoose.set("strictQuery", false);

    mongoose
        .connect(MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        })
        .then((data) => {
            console.log(`Mongodb connected with server : ${data.connection.host}`);
        });
};
connectDatabase();

// const RAZORPAY_SUBSCRIPTION_PLAN_ID = "plan_NfPU48dijLvW9G"
const RAZORPAY_SUBSCRIPTION_API_KEY = "rzp_live_POHLs0RPzMbrP9"
const RAZORPAY_SUBSCRIPTION_SECRET_KEY = "gxofUCaHaTZywAaTT3LgRsE4"


const instance = new Razorpay({
    key_id: RAZORPAY_SUBSCRIPTION_API_KEY,
    key_secret: RAZORPAY_SUBSCRIPTION_SECRET_KEY,
});


const corsOptions = {
    origin: "*", // Allow requests from any origin
    credentials: true,
    methods: "GET,PUT,POST,DELETE,OPTIONS",
    allowedHeaders: "Content-Type, Authorization, Content-Length, X-Requested-With",
};
app.use(cors(corsOptions));
// Middleware to parse JSON bodies
app.use(express.json());

// Controller to create a subscription
app.post('/create-subscription', async function (req, res) {
    try {
        const RAZORPAY_SUBSCRIPTION_PLAN_ID = req.body.plan_id;

        const options = {
            plan_id: RAZORPAY_SUBSCRIPTION_PLAN_ID,
            customer_notify: 1,
            total_count: 12,
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
        const generated_signature = generateSignature(razorpay_payment_id, razorpay_subscription_id, RAZORPAY_SUBSCRIPTION_SECRET_KEY);
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

// Default route
app.use("/", function (req, res) {
    res.json({ message: "Service is live" });
});

// Start server
app.listen(PORT, function () {
    console.log(`Server is running on port ${PORT}`);
});
