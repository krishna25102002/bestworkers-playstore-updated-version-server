const User = require('../models/User');
const Otp = require('../models/Otp');
const generateOtp = require('../utils/generateOtp');
const sendEmail = require('../utils/sendEmail');
const jwt =require('jsonwebtoken');
const bcrypt = require('bcryptjs');

exports.register = async (req, res, next) => {
  const { name, email, mobile, pin, confirmPin } = req.body;

  try {
    // Check if a *verified* user already exists with this email or mobile
    const existingVerifiedUser = await User.findOne({
      $or: [{ email }, { mobile }],
      isVerified: true, // Only consider verified users as truly "existing" for new registrations
    });

    if (existingVerifiedUser) {
      return res.status(400).json({
        success: false,
        error: 'A verified user already exists with this email or mobile number.',
      });
    }

    // Check if PINs match
    if (pin !== confirmPin) {
      return res.status(400).json({
        success: false,
        error: 'PINs do not match',
      });
    }

    // User is NOT created here.

    // Delete any previous unverified OTPs for this email to allow a fresh attempt
    await Otp.deleteMany({ email });

    // Generate OTP
    const otp = generateOtp();
    console.log("Generated OTP for registration:", otp, "for email:", email); // For debugging
    await Otp.create({ email, otp }); // Store OTP associated with the email

    // Send OTP email
    const message = `Your OTP for BestWorkers verification is ${otp}. It will expire in 5 minutes.`;
    await sendEmail(email, 'Verify Your BestWorkers Account', message);

    res.status(200).json({ // 200 OK as user is not created yet
      success: true,
      message: 'OTP sent to your email. Please verify to complete registration.',
      // No user data is sent back yet, only confirmation that OTP was sent
    });

  } catch (error) {
    console.error('Registration (OTP Send) error:', error);
    res.status(500).json({
      success: false,
      error: 'Server Error during OTP generation/sending.',
      message: error.message,
    });
  }
};

exports.verifyOtp = async (req, res) => {
  // Expecting name, mobile, pin from client along with email and otp
  const { name, email, mobile, pin, otp } = req.body;

  try {
    // Find the OTP record
    const otpRecord = await Otp.findOne({ email, otp });

    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        error: 'Invalid OTP or OTP has expired. Please try registering again or resend OTP.',
      });
    }

    // Check if a verified user already exists (should be rare due to register check, but good for robustness)
    let user = await User.findOne({ email, isVerified: true });
    if (user) {
      // This case means they somehow got to verify OTP for an already verified account.
      await Otp.deleteOne({ _id: otpRecord._id }); // Clean up OTP
      return res.status(400).json({ success: false, error: 'This email is already associated with a verified account. Please login.' });
    }
    
    // Create the user now that OTP is verified
    user = await User.create({
      name,
      email,
      mobile,
      pin, // The pin will be hashed by the pre-save hook in User model
      isVerified: true, // Set as verified upon creation
    });

    if (!user) {
      // This should not happen if User.create was successful, but as a safeguard
      await Otp.deleteOne({ _id: otpRecord._id }); // Clean up OTP if user creation failed
      return res.status(500).json({ // Changed to 500 as it's an unexpected server-side issue
        success: false,
        error: 'User could not be created after OTP verification. Please try again.',
      });
    }

    // Delete the OTP record as it's now used
    await Otp.deleteOne({ _id: otpRecord._id });

    // Create token
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRE,
    });

    res.status(201).json({ // 201 because a new user resource was created
      success: true,
      message: 'Account verified and created successfully!',
      token,
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        isProfession: user.isProfession, // Will be false by default from User model
      },
    });
  } catch (error) {
    console.error('OTP Verification and User Creation error:', error);
    // Handle potential duplicate key errors if somehow a user was created between checks
    if (error.code === 11000) { // MongoDB duplicate key error
        return res.status(400).json({
            success: false,
            error: 'An account with this email or mobile already exists. Please try logging in.',
        });
    }
    res.status(500).json({
      success: false,
      error: 'Server Error during OTP verification or account creation.',
      message: error.message,
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
        error: 'Invalid credentials. User not found.',
      });
    }

    // Compare PINs using the model's method
    const isMatch = await user.matchPin(String(pin)); 
    
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials. PIN incorrect.',
      });
    }

    if (!user.isVerified) {
      return res.status(401).json({
        success: false,
        error: 'Account not verified. Please verify your email first or try registering again.',
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
      error: 'Server Error during login.',
      message: error.message
    });
  }
};

exports.resendOtp = async (req, res, next) => {
  const { email } = req.body;

  try {
    // We don't strictly need to check if a user document exists for resending OTP,
    // as the OTP is tied to the email for verification.

    // Delete any existing OTP for this email to ensure only one active OTP
    await Otp.deleteMany({ email });

    // Generate new OTP
    const otp = generateOtp();
    console.log("Generated OTP for resend:", otp, "for email:", email); // For debugging
    await Otp.create({ email, otp });

    // Send OTP email
    const message = `Your new OTP for BestWorkers verification is ${otp}. It will expire in 5 minutes.`;
    await sendEmail(email, 'Verify Your BestWorkers Account', message);

    res.status(200).json({
      success: true,
      message: 'New OTP sent to your email.',
    });
  } catch (error) {
    console.error('Resend OTP error:', error);
    res.status(500).json({
        success: false,
        error: 'Server error while resending OTP.',
        message: error.message
    });
  }
};

exports.getMe = async (req, res, next) => {
  try {
    // Assuming JWT middleware has populated req.user
    if (!req.user || !req.user.id) {
        return res.status(401).json({ success: false, message: 'Not authorized, token failed or user ID missing' });
    }
    
    const baseUser = await User.findById(req.user.id).select('-pin').lean(); // Use .lean() for a plain JS object

    if (!baseUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    let profileData = { ...baseUser }; // Start with base user data

    if (baseUser.isProfession) {
      const Professional = require('../models/Profession'); // Adjust path if needed
      const professionalProfile = await Professional.findOne({ user: baseUser._id }).lean();
      
      if (professionalProfile) {
        // Merge professional details. Fields in professionalProfile will overwrite those in baseUser if names conflict.
        profileData = { ...profileData, ...professionalProfile };
        
        // Ensure the main '_id' is from the User model for consistency.
        profileData._id = baseUser._id; 

        // Clean up the 'user' field from professionalProfile if it's just a reference
        if (profileData.user && typeof profileData.user === 'object' && profileData.user._id) {
           // If user is populated, keep it, otherwise if it's just an ObjectId string, it might be redundant.
           // For simplicity, if it's the same as baseUser._id, we can remove it from the top level of profileData.
           if (profileData.user._id && profileData.user._id.toString() === baseUser._id.toString()) delete profileData.user;
           else if (profileData.user.toString() === baseUser._id.toString()) delete profileData.user;
        }
      }
    }


    res.status(200).json({
      success: true,
      // data: user,
      data: profileData, // Send the merged data
    });
  } catch (error) {
    console.error("Error in getMe:", error);
    res.status(500).json({
        success: false,
        error: 'Server error while fetching user profile.',
        message: error.message
    });
  }
};



// const User = require('../models/User');
// const Otp = require('../models/Otp');
// const generateOtp = require('../utils/generateOtp');
// const sendEmail = require('../utils/sendEmail');
// const jwt = require('jsonwebtoken');
// const bcrypt = require('bcryptjs');

// exports.register = async (req, res, next) => {
//   const { name, email, mobile, pin, confirmPin } = req.body;

//   try {
//     // Check if user already exists
//     const existingUser = await User.findOne({ $or: [{ email }, { mobile }] });
//     if (existingUser) {
//       return res.status(400).json({
//         success: false,
//         error: 'User already exists with this email or mobile number',
//       });
//     }

//     // Check if PINs match
//     if (pin !== confirmPin) {
//       return res.status(400).json({
//         success: false,
//         error: 'PINs do not match',
//       });
//     }

//     // Create user
//     const user = await User.create({
//       name,
//       email,
//       mobile,
//       pin,
//     });

//     // Generate OTP
//     const otp = generateOtp();
//     await Otp.create({ email, otp });

//     // Send OTP email
//     const message = `Your OTP for BestWorkers verification is ${otp}. It will expire in 5 minutes.`;
//     await sendEmail(email, 'Verify Your BestWorkers Account', message);

//     res.status(201).json({
//       success: true,
//       message: 'OTP sent to your email',
//       data: {
//         email: user.email,
//       },
//     });
//   } catch (error) {
//     console.error('Registration error:', error);
//     res.status(500).json({
//       success: false,
//       error: 'Server Error',
//       message: error.message
//     });
//   }
// };

// exports.verifyOtp = async (req, res) => {
//   const { email, otp } = req.body;
  
//   try {
//     // Find the OTP record
//     const otpRecord = await Otp.findOne({ email, otp });
    
//     if (!otpRecord) {
//       return res.status(400).json({
//         success: false,
//         error: 'Invalid OTP or OTP has expired',
//       });
//     }

//     // Find and verify user
//     const user = await User.findOneAndUpdate(
//       { email },
//       { isVerified: true },
//       { new: true, runValidators: true }
//     );
    
//     if (!user) {
//       return res.status(404).json({
//         success: false,
//         error: 'User not found',
//       });
//     }

//     // Delete the OTP record
//     await Otp.deleteOne({ _id: otpRecord._id });

//     // Create token
//     const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
//       expiresIn: process.env.JWT_EXPIRE,
//     });

//     res.status(200).json({
//       success: true,
//       token,
//       data: {
//         name: user.name,
//         email: user.email,
//         mobile: user.mobile,
//       },
//     });
//   } catch (error) {
//     console.error('OTP Verification error:', error);
//     res.status(500).json({
//       success: false,
//       error: 'Server Error',
//       message: error.message
//     });
//   }
// };
// exports.login = async (req, res, next) => {
//   const { email, pin } = req.body;

//   try {
//     // Find user with PIN selected
//     const user = await User.findOne({ email }).select('+pin');
    
//     if (!user) {
//       return res.status(401).json({
//         success: false,
//         error: 'Invalid credentials',
//       });
//     }

//     // Compare PINs
//     const isMatch = await bcrypt.compare(String(pin), user.pin);
    
//     if (!isMatch) {
//       return res.status(401).json({
//         success: false,
//         error: 'Invalid credentials',
//       });
//     }

//     if (!user.isVerified) {
//       return res.status(401).json({
//         success: false,
//         error: 'Account not verified. Please verify your email first.',
//       });
//     }

//     // Create token
//     const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
//       expiresIn: process.env.JWT_EXPIRE,
//     });

//     res.status(200).json({
//       success: true,
//       token,
//       data: {
//         id: user._id,
//         name: user.name,
//         email: user.email,
//         mobile: user.mobile,
//         isProfession: user.isProfession,
//       },
//     });
//   } catch (error) {
//     console.error('Login error:', error);
//     res.status(500).json({
//       success: false,
//       error: 'Server Error',
//       message: error.message
//     });
//   }
// };



// exports.resendOtp = async (req, res, next) => {
//   const { email } = req.body;

//   try {
//     // Check if user exists
//     const user = await User.findOne({ email });
//     if (!user) {
//       return res.status(404).json({
//         success: false,
//         error: 'User not found',
//       });
//     }

//     // Delete any existing OTP for this email
//     await Otp.deleteMany({ email });

//     // Generate new OTP
//     const otp = generateOtp();
//     await Otp.create({ email, otp });

//     // Send OTP email
//     const message = `Your new OTP for BestWorkers verification is ${otp}. It will expire in 5 minutes.`;
//     await sendEmail(email, 'Verify Your BestWorkers Account', message);

//     res.status(200).json({
//       success: true,
//       message: 'New OTP sent to your email',
//     });
//   } catch (error) {
//     next(error);
//   }
// };

// exports.getMe = async (req, res, next) => {
//   try {
//     const userId = req.query.userId;

//     if (!userId) {
//       return res.status(400).json({ success: false, message: 'User ID is required' });
//     }

//     const user = await User.findById(userId).select('-pin');

//     if (!user) {
//       return res.status(404).json({ success: false, message: 'User not found' });
//     }

//     res.status(200).json({
//       success: true,
//       data: user,
//     });
//   } catch (error) {
//     console.error("Error in getMe:", error); // <--- ADD THIS
//     next(error);
//   }
// };
