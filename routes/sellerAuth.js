const express = require('express');
const Seller = require('../models/seller');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/stores/');
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: function (req, file, cb) {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed!'), false);
        }
    }
});

// Helper function to generate unique slug
const generateUniqueSlug = async (storeName) => {
    let baseSlug = storeName
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '') // Remove special characters except spaces and hyphens
        .replace(/\s+/g, '-') // Replace spaces with hyphens
        .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
        .trim('-'); // Remove leading/trailing hyphens

    let slug = baseSlug;
    let counter = 1;

    // Check if slug exists and increment counter until unique
    while (await Seller.findOne({ storeSlug: slug })) {
        slug = `${baseSlug}-${counter}`;
        counter++;
    }

    return slug;
};

// Middleware to verify JWT token for step 2
const verifyToken = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Access denied. No token provided.'
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        const seller = await Seller.findById(decoded.sellerId);
        
        if (!seller) {
            return res.status(401).json({
                success: false,
                message: 'Invalid token. Seller not found.'
            });
        }

        req.seller = seller;
        next();
    } catch (error) {
        res.status(401).json({
            success: false,
            message: 'Invalid token.'
        });
    }
};

// @route   POST /api/seller/signup/step1
// @desc    Register seller - Step 1 (Personal Information)
// @access  Public
router.post('/signup/step1', async (req, res) => {
    try {
        const { fullName, email, phoneNumber, password, confirmPassword } = req.body;

        // Validation
        if (!fullName || !email || !phoneNumber || !password || !confirmPassword) {
            return res.status(400).json({
                success: false,
                message: 'Please provide all required fields'
            });
        }

        // Check if passwords match
        if (password !== confirmPassword) {
            return res.status(400).json({
                success: false,
                message: 'Passwords do not match'
            });
        }

        // Password length validation
        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 6 characters long'
            });
        }

        // Email format validation
        const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: 'Please enter a valid email address'
            });
        }

        // Pakistani phone number validation
        const phoneRegex = /^\+92\d{10}$/;
        if (!phoneRegex.test(phoneNumber)) {
            return res.status(400).json({
                success: false,
                message: 'Please enter a valid Pakistani phone number (+92xxxxxxxxxx)'
            });
        }

        // Check if seller already exists with this email
        const existingSeller = await Seller.findOne({ email: email.toLowerCase() });
        if (existingSeller) {
            return res.status(400).json({
                success: false,
                message: 'A seller account with this email already exists'
            });
        }

        // Check if seller already exists with this phone number
        const existingPhone = await Seller.findOne({ phoneNumber });
        if (existingPhone) {
            return res.status(400).json({
                success: false,
                message: 'A seller account with this phone number already exists'
            });
        }

        // Create new seller
        const seller = new Seller({
            fullName: fullName.trim(),
            email: email.toLowerCase().trim(),
            phoneNumber: phoneNumber.trim(),
            password,
            registrationStep: 1
        });

        // Save seller to database
        await seller.save();

        // Generate token for step 2
        const token = jwt.sign(
            { sellerId: seller._id },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '1h' } // Token expires in 1 hour
        );

        res.status(201).json({
            success: true,
            message: 'Seller account created successfully! Proceed to store setup.',
            token,
            seller: {
                id: seller._id,
                fullName: seller.fullName,
                email: seller.email,
                phoneNumber: seller.phoneNumber,
                registrationStep: seller.registrationStep,
                accountStatus: seller.accountStatus,
                createdAt: seller.createdAt
            }
        });

    } catch (error) {
        console.error('Seller signup error:', error);
        
        // Handle mongoose validation errors
        if (error.name === 'ValidationError') {
            const errors = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors
            });
        }

        // Handle duplicate key error
        if (error.code === 11000) {
            const duplicateField = Object.keys(error.keyValue)[0];
            const duplicateValue = error.keyValue[duplicateField];
            
            let message;
            switch (duplicateField) {
                case 'email':
                    message = `A seller account with this email (${duplicateValue}) already exists`;
                    break;
                case 'phoneNumber':
                    message = `A seller account with this phone number (${duplicateValue}) already exists`;
                    break;
                default:
                    message = `A seller account with this ${duplicateField} already exists`;
            }
            
            return res.status(400).json({
                success: false,
                message
            });
        }

        res.status(500).json({
            success: false,
            message: 'Server error during registration. Please try again.',
            ...(process.env.NODE_ENV === 'development' && { error: error.message })
        });
    }
});

// @route   POST /api/seller/signup/step2
// @desc    Register seller - Step 2 (Store Information)
// @access  Private (requires token from step 1)
router.post('/signup/step2', verifyToken, upload.fields([
    { name: 'storeLogo', maxCount: 1 },
    { name: 'storeBanner', maxCount: 1 }
]), async (req, res) => {
    try {
        const { storeName, storeCategory, storeDescription } = req.body;
        const seller = req.seller;

        // Check if seller has completed step 1
        if (seller.registrationStep !== 1) {
            return res.status(400).json({
                success: false,
                message: 'Please complete registration step 1 first'
            });
        }

        // Validation
        if (!storeName || !storeCategory || !storeDescription) {
            return res.status(400).json({
                success: false,
                message: 'Please provide all required store information'
            });
        }

        if (storeDescription.length < 20) {
            return res.status(400).json({
                success: false,
                message: 'Store description must be at least 20 characters long'
            });
        }

        // Generate unique slug from store name
        const storeSlug = await generateUniqueSlug(storeName);

        // Update seller with store information
        seller.storeName = storeName.trim();
        seller.storeCategory = storeCategory;
        seller.storeDescription = storeDescription.trim();
        seller.storeSlug = storeSlug;
        seller.registrationStep = 2;
        seller.accountStatus = 'active'; // Activate account after completing both steps

        // Handle file uploads
        if (req.files) {
            if (req.files.storeLogo) {
                seller.storeLogo = req.files.storeLogo[0].filename;
            }
            if (req.files.storeBanner) {
                seller.storeBanner = req.files.storeBanner[0].filename;
            }
        }

        await seller.save();

        // Generate new token for complete registration
        const token = jwt.sign(
            { 
                sellerId: seller._id,
                role: 'seller'
            },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '7d' } // Longer token for logged-in user
        );

        res.status(200).json({
            success: true,
            message: 'Store setup completed successfully! Welcome to MarketHub.',
            token,
            seller: {
                id: seller._id,
                fullName: seller.fullName,
                email: seller.email,
                phoneNumber: seller.phoneNumber,
                storeName: seller.storeName,
                storeSlug: seller.storeSlug,
                storeCategory: seller.storeCategory,
                storeDescription: seller.storeDescription,
                storeLogo: seller.storeLogo,
                storeBanner: seller.storeBanner,
                registrationStep: seller.registrationStep,
                accountStatus: seller.accountStatus,
                isVerified: seller.isVerified,
                createdAt: seller.createdAt
            }
        });

    } catch (error) {
        console.error('Store setup error:', error);
        
        // Handle mongoose validation errors
        if (error.name === 'ValidationError') {
            const errors = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors
            });
        }

        // Handle duplicate key error (should not happen with unique slug generation, but just in case)
        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: 'A store with this name already exists. Please choose a different store name.'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Server error during store setup. Please try again.',
            ...(process.env.NODE_ENV === 'development' && { error: error.message })
        });
    }
});

// @route   POST /api/seller/login
// @desc    Login seller
// @access  Public
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validation
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Please provide email and password'
            });
        }

        // Find seller by email
        const seller = await Seller.findOne({ email: email.toLowerCase() }).select('+password');
        if (!seller) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        // Check password
        const isPasswordValid = await seller.comparePassword(password);
        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        // Check if account is active
        if (!seller.isActive) {
            return res.status(401).json({
                success: false,
                message: 'Your account has been deactivated. Please contact support.'
            });
        }

        // Check account status
        if (seller.accountStatus === 'suspended') {
            return res.status(401).json({
                success: false,
                message: 'Your account has been suspended. Please contact support.'
            });
        }

        if (seller.accountStatus === 'rejected') {
            return res.status(401).json({
                success: false,
                message: 'Your seller application has been rejected. Please contact support.'
            });
        }

        // Generate token
        const token = jwt.sign(
            { 
                sellerId: seller._id,
                role: 'seller'
            },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '7d' }
        );

        res.status(200).json({
            success: true,
            message: 'Login successful',
            token,
            seller: {
                id: seller._id,
                fullName: seller.fullName,
                email: seller.email,
                phoneNumber: seller.phoneNumber,
                storeName: seller.storeName,
                storeSlug: seller.storeSlug,
                storeCategory: seller.storeCategory,
                registrationStep: seller.registrationStep,
                accountStatus: seller.accountStatus,
                isVerified: seller.isVerified,
                createdAt: seller.createdAt
            }
        });

    } catch (error) {
        console.error('Seller login error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during login. Please try again.',
            ...(process.env.NODE_ENV === 'development' && { error: error.message })
        });
    }
});

// @route   GET /api/categories
// @desc    Get store categories
// @access  Public
router.get('/categories', (req, res) => {
    const categories = [
        "Fashion & Clothing",
        "Electronics & Gadgets", 
        "Home & Garden",
        "Beauty & Personal Care",
        "Sports & Outdoors",
        "Books & Media",
        "Toys & Games",
        "Food & Beverages",
        "Health & Wellness",
        "Art & Crafts",
        "Automotive",
        "Pet Supplies",
        "Office Supplies",
        "Jewelry & Accessories",
        "Other"
    ];

    res.status(200).json({
        success: true,
        categories
    });
});

module.exports = router;