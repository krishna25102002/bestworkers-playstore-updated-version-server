const mongoose = require('mongoose');

const ProfessionSchema = new mongoose.Schema({
  user: {
    type: String, // Changed to String to match AsyncStorage userID
    required: true
  },
  name: {
    type: String,
    required: [true, 'Please add a name']
  },
  email: {
    type: String,
    required: [true, 'Please add an email']
  },
  mobileNo: {
    type: String,
    required: [true, 'Please add a mobile number']
  },
  secondaryMobileNo: String,
  state: {
    type: String,
    required: [true, 'Please add a state']
  },
  district: {
    type: String,
    required: [true, 'Please add a district']
  },
  city: {
    type: String,
    required: [true, 'Please add a city']
  },
  serviceCategory: {
    type: String,
    required: [true, 'Please add a service category']
  },
  serviceName: {
    type: String,
    required: [true, 'Please add a service name']
  },
  designation: {
   type: String
  },
  experience: {
    type: String,
    required: [true, 'Please add experience level']
  },
  servicePrice: {
    type: Number,
    required: [true, 'Please add service price']
  },
  priceUnit: {
    type: String,
    default: 'per hour'
  },
  needSupport: {
    type: Boolean,
    default: false
  },
  professionDescription: String,
  status: {
    type: String,
    default: 'pending'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Profession', ProfessionSchema);