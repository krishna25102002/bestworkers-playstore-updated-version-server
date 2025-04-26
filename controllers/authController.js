const User = require('../models/User');
const Otp = require('../models/Otp');
const generateOtp = require('../utils/generateOtp');
const sendEmail = require('../utils/sendEmail');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

exports.register = async (req, res, next) => {
  const { name, email, mobile, pin, confirmPin } = req.body;

  try {
    // Check if user already exists
    const existingUser = await User.findOne({ $or: [{ email }, { mobile }] });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'User already exists with this email or mobile number',
      });
    }

    // Check if PINs match
    if (pin !== confirmPin) {
      return res.status(400).json({
        success: false,
        error: 'PINs do not match',
      });
    }

    // Create user
    const user = await User.create({
      name,
      email,
      mobile,
      pin,
    });

    // Generate OTP
    const otp = generateOtp();
    await Otp.create({ email, otp });

    // Send OTP email
    const message = `Your OTP for BestWorkers verification is ${otp}. It will expire in 5 minutes.`;
    await sendEmail(email, 'Verify Your BestWorkers Account', message);

    res.status(201).json({
      success: true,
      message: 'OTP sent to your email',
      data: {
        email: user.email,
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      error: 'Server Error',
      message: error.message
    });
  }
};

exports.verifyOtp = async (req, res) => {
  const { email, otp } = req.body;
  
  try {
    // Find the OTP record
    const otpRecord = await Otp.findOne({ email, otp });
    
    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        error: 'Invalid OTP or OTP has expired',
      });
    }

    // Find and verify user
    const user = await User.findOneAndUpdate(
      { email },
      { isVerified: true },
      { new: true, runValidators: true }
    );
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    // Delete the OTP record
    await Otp.deleteOne({ _id: otpRecord._id });

    // Create token
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRE,
    });

    res.status(200).json({
      success: true,
      token,
      data: {
        name: user.name,
        email: user.email,
        mobile: user.mobile,
      },
    });
  } catch (error) {
    console.error('OTP Verification error:', error);
    res.status(500).json({
      success: false,
      error: 'Server Error',
      message: error.message
    });
  }
};
exports.login = async (req, res, next) => {
  const { email, pin } = req.body;

  try {
    // Find user with PIN selected
    const user = await User.findOne({ email }).select('+pin');
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials',
      });
    }

    // Compare PINs
    const isMatch = await bcrypt.compare(String(pin), user.pin);
    
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials',
      });
    }

    if (!user.isVerified) {
      return res.status(401).json({
        success: false,
        error: 'Account not verified. Please verify your email first.',
      });
    }

    // Create token
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRE,
    });

    res.status(200).json({
      success: true,
      token,
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        isProfession: user.isProfession,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Server Error',
      message: error.message
    });
  }
};



exports.resendOtp = async (req, res, next) => {
  const { email } = req.body;

  try {
    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    // Delete any existing OTP for this email
    await Otp.deleteMany({ email });

    // Generate new OTP
    const otp = generateOtp();
    await Otp.create({ email, otp });

    // Send OTP email
    const message = `Your new OTP for BestWorkers verification is ${otp}. It will expire in 5 minutes.`;
    await sendEmail(email, 'Verify Your BestWorkers Account', message);

    res.status(200).json({
      success: true,
      message: 'New OTP sent to your email',
    });
  } catch (error) {
    next(error);
  }
};

exports.getMe = async (req, res, next) => {
  try {
    const userId = req.query.userId;

    if (!userId) {
      return res.status(400).json({ success: false, message: 'User ID is required' });
    }

    const user = await User.findById(userId).select('-pin');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error("Error in getMe:", error); // <--- ADD THIS
    next(error);
  }
};
