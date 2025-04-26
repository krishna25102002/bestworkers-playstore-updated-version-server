const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a name'],
  },
  email: {
    type: String,
    required: [true, 'Please add an email'],
    unique: true,
    trim: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Please add a valid email',
    ],
  },
  mobile: {
    type: String,
    required: [true, 'Please add a mobile number'],
    unique: true,
    match: [/^\d{10}$/, 'Please add a valid 10-digit mobile number'],
  },
  pin: {
    type: String,
    required: [true, 'Please set a 4-digit PIN'],
    minlength: 4,
    maxlength: 4,
    select: false,
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
  isProfession: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Hash PIN before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('pin')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.pin = await bcrypt.hash(String(this.pin), salt);
    next();
  } catch (err) {
    next(err);
  }
});

// Method to compare PIN
userSchema.methods.matchPin = async function(enteredPin) {
  return await bcrypt.compare(String(enteredPin), this.pin);
};

module.exports = mongoose.model('User', userSchema);