const User = require('../models/User');

// @desc    Update user details
// @route   PUT /api/users/update
// @access  Private
exports.updateUser = async (req, res, next) => {
  try {
    const fieldsToUpdate = {
      name: req.body.name,
      email: req.body.email,
      mobile: req.body.mobile,
    };

    const user = await User.findByIdAndUpdate(req.user.id, fieldsToUpdate, {
      new: true,
      runValidators: true,
    }).select('-pin');

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Change PIN
// @route   PUT /api/users/change-pin
// @access  Private
exports.changePin = async (req, res, next) => {
  try {
    const { currentPin, newPin } = req.body;

    // Get user with PIN field
    const user = await User.findById(req.user.id).select('+pin');

    // Check current PIN
    const isMatch = await user.matchPin(currentPin);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Current PIN is incorrect',
      });
    }

    // Update PIN
    user.pin = newPin;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'PIN changed successfully',
    });
  } catch (error) {
    next(error);
  }
};