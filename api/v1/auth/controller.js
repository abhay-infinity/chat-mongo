const User = require('../../../model/User.model');
const OTP = require('../../../model/OTP.model');
const jwt = require('jsonwebtoken');
const { JWT_SECRET, JWT_EXPIRE, OTP_EXPIRE_MINUTES } = require('../../../config/constants');
const { setCache, getCache, deleteCache } = require('../../../config/redis');

// Generate JWT Token
const generateToken = (userId) => {
    return jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRE });
};

// Generate OTP
const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

// Guest Login (Silent Login) - No registration needed
exports.guestLogin = async (req, res) => {
    try {
        const { deviceId } = req.body;

        if (!deviceId) {
            return res.status(400).json({
                success: false,
                message: 'Device ID is required'
            });
        }

        // Check if guest user exists in cache
        const cachedGuest = await getCache(`guest:${deviceId}`);
        if (cachedGuest) {
            return res.json({
                success: true,
                message: 'Guest login successful',
                data: {
                    user: cachedGuest.user,
                    token: cachedGuest.token,
                    isGuest: true
                }
            });
        }

        // Create guest user
        const guestUsername = `User${Math.floor(1000 + Math.random() * 9000)}`;
        const user = new User({
            username: guestUsername,
            isGuest: true,
            coins: 50
        });

        await user.save();

        // Generate token
        const token = generateToken(user._id);

        // Cache guest user for 30 days
        const guestData = {
            user: user.toJSON(),
            token
        };
        await setCache(`guest:${deviceId}`, guestData, 30 * 24 * 60 * 60);
        await setCache(`user:${user._id}`, user.toJSON(), 30 * 24 * 60 * 60);

        res.status(201).json({
            success: true,
            message: 'Guest login successful. You can upgrade to full account anytime!',
            data: {
                user: user.toJSON(),
                token,
                isGuest: true
            }
        });
    } catch (error) {
        console.error('Guest login error:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating guest account',
            error: error.message
        });
    }
};

// Register User (Upgrade from guest or new user)
exports.register = async (req, res) => {
    try {
        const { username, email, phone, password, gender, age, referralCode, upgradeFromGuest } = req.body;

        // Check if user already exists
        const existingUser = await User.findOne({
            $or: [{ email }, { phone }, { username }]
        });

        if (existingUser && !existingUser.isGuest) {
            return res.status(400).json({
                success: false,
                message: 'User already exists with this email, phone, or username'
            });
        }

        // Handle Referral Logic
        let referredByUser = null;
        if (referralCode) {
            referredByUser = await User.findOne({ referralCode: referralCode.toUpperCase() });
            if (!referredByUser) {
                return res.status(400).json({ success: false, message: 'Invalid referral code' });
            }
        }

        let user;

        // Upgrade guest to full user
        if (upgradeFromGuest && req.userId) {
            user = await User.findById(req.userId);
            if (user && user.isGuest) {
                user.username = username;
                user.email = email;
                user.phone = phone;
                user.password = password;
                user.gender = gender || user.gender;
                user.age = age || user.age;
                user.isGuest = false;
                user.coins += 50; // Bonus coins for upgrading

                if (referredByUser) {
                    user.referredBy = referredByUser._id;
                    await referredByUser.addCoins(25, `Referral reward for ${username}`, 'earn');
                }

                await user.save();
            }
        } else {
            // Create new user
            user = new User({
                username,
                email,
                phone,
                password,
                gender: gender || 'unknown',
                age: age,
                coins: 150, // Welcome bonus
                referredBy: referredByUser ? referredByUser._id : undefined
            });
            await user.save();

            if (referredByUser) {
                await referredByUser.addCoins(25, `Referral reward for ${username}`, 'earn');
            }
        }

        // Generate OTP for email verification
        const otp = generateOTP();
        const otpDoc = new OTP({
            identifier: email,
            otp,
            type: 'email',
            purpose: 'registration',
            expiresAt: new Date(Date.now() + OTP_EXPIRE_MINUTES * 60 * 1000)
        });
        await otpDoc.save();

        // TODO: Send OTP via email
        console.log(`OTP for ${email}: ${otp}`);

        // Generate token
        const token = generateToken(user._id);

        // Cache user data in Redis for fast access
        await setCache(`user:${user._id}`, user.toJSON(), 24 * 60 * 60);

        res.status(201).json({
            success: true,
            message: 'User registered successfully. Please verify your email.',
            data: {
                user: user.toJSON(),
                token
            }
        });
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({
            success: false,
            message: 'Error registering user',
            error: error.message
        });
    }
};

// Login User
exports.login = async (req, res) => {
    try {
        const { identifier, password } = req.body;

        // Check cache first
        const cacheKey = `login:${identifier}`;
        const cachedUser = await getCache(cacheKey);

        let user;
        if (cachedUser) {
            user = await User.findById(cachedUser._id);
        } else {
            // Find user by email, phone, or username
            user = await User.findOne({
                $or: [
                    { email: identifier },
                    { phone: identifier },
                    { username: identifier }
                ]
            });
        }

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        // Check password
        const isPasswordValid = await user.comparePassword(password);

        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        // Update last seen
        user.lastSeen = new Date();
        await user.save();

        // Generate token
        const token = generateToken(user._id);

        // Cache user data for fast access
        await setCache(`user:${user._id}`, user.toJSON(), 24 * 60 * 60);
        await setCache(cacheKey, { _id: user._id }, 24 * 60 * 60);

        res.json({
            success: true,
            message: 'Login successful',
            data: {
                user: user.toJSON(),
                token
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Error logging in',
            error: error.message
        });
    }
};

// Send OTP
exports.sendOTP = async (req, res) => {
    try {
        const { identifier, type, purpose } = req.body;

        // Generate OTP
        const otp = generateOTP();

        // Delete any existing OTPs for this identifier
        await OTP.deleteMany({ identifier, type, purpose });

        // Create new OTP
        const otpDoc = new OTP({
            identifier,
            otp,
            type,
            purpose,
            expiresAt: new Date(Date.now() + OTP_EXPIRE_MINUTES * 60 * 1000)
        });

        await otpDoc.save();

        // Cache OTP for fast verification
        await setCache(`otp:${identifier}:${type}:${purpose}`, otp, OTP_EXPIRE_MINUTES * 60);

        // TODO: Send OTP via email or SMS
        console.log(`OTP for ${identifier}: ${otp}`);

        res.json({
            success: true,
            message: `OTP sent to ${identifier}`,
            data: {
                expiresIn: OTP_EXPIRE_MINUTES
            }
        });
    } catch (error) {
        console.error('Send OTP error:', error);
        res.status(500).json({
            success: false,
            message: 'Error sending OTP',
            error: error.message
        });
    }
};

// Verify OTP
exports.verifyOTP = async (req, res) => {
    try {
        const { identifier, otp, type, purpose } = req.body;

        // Check cache first for fast verification
        const cachedOTP = await getCache(`otp:${identifier}:${type}:${purpose}`);

        if (cachedOTP && cachedOTP === otp) {
            // Update user verification status
            if (type === 'email') {
                await User.updateOne({ email: identifier }, { isEmailVerified: true });
            } else if (type === 'phone') {
                await User.updateOne({ phone: identifier }, { isPhoneVerified: true });
            }

            // Delete OTP from cache
            await deleteCache(`otp:${identifier}:${type}:${purpose}`);

            return res.json({
                success: true,
                message: 'OTP verified successfully'
            });
        }

        // Fallback to database
        const otpDoc = await OTP.findOne({
            identifier,
            type,
            purpose,
            verified: false,
            expiresAt: { $gt: new Date() }
        }).sort({ createdAt: -1 });

        if (!otpDoc) {
            return res.status(400).json({
                success: false,
                message: 'Invalid or expired OTP'
            });
        }

        if (otpDoc.attempts >= 5) {
            return res.status(400).json({
                success: false,
                message: 'Too many attempts. Please request a new OTP.'
            });
        }

        if (otpDoc.otp !== otp) {
            otpDoc.attempts += 1;
            await otpDoc.save();

            return res.status(400).json({
                success: false,
                message: 'Invalid OTP',
                attemptsLeft: 5 - otpDoc.attempts
            });
        }

        // Mark as verified
        otpDoc.verified = true;
        await otpDoc.save();

        // Update user verification status
        if (type === 'email') {
            await User.updateOne({ email: identifier }, { isEmailVerified: true });
        } else if (type === 'phone') {
            await User.updateOne({ phone: identifier }, { isPhoneVerified: true });
        }

        res.json({
            success: true,
            message: 'OTP verified successfully'
        });
    } catch (error) {
        console.error('Verify OTP error:', error);
        res.status(500).json({
            success: false,
            message: 'Error verifying OTP',
            error: error.message
        });
    }
};

// Get Current User (from cache first)
exports.getCurrentUser = async (req, res) => {
    try {
        // Check cache first
        let user = await getCache(`user:${req.userId}`);

        if (!user) {
            // Fallback to database
            user = await User.findById(req.userId).select('-password');

            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }

            // Cache for next time
            await setCache(`user:${req.userId}`, user.toJSON(), 24 * 60 * 60);
        }

        res.json({
            success: true,
            data: { user }
        });
    } catch (error) {
        console.error('Get current user error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching user',
            error: error.message
        });
    }
};

// Logout
exports.logout = async (req, res) => {
    try {
        // Update user status
        await User.findByIdAndUpdate(req.userId, {
            isOnline: false,
            lastSeen: new Date()
        });

        // Clear cache
        await deleteCache(`user:${req.userId}`);

        res.json({
            success: true,
            message: 'Logged out successfully'
        });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({
            success: false,
            message: 'Error logging out',
            error: error.message
        });
    }
};
