const Profession = require('../models/Profession');
const User = require('../models/User');

exports.addProfession = async (req, res) => {
  console.log("Hiii", req.body);
  console.log("Authenticated user (from token):", req.user ? req.user.id : "No user in req.user");

  try {
    const {
      // userId is no longer taken from req.body for security
      name,
      email,
      mobileNo,
      secondaryMobileNo,
      state,
      district,
      city,
      serviceCategory,
      serviceName,
      designation,
      experience,
      servicePrice,
      priceUnit,
      needSupport,
      professionDescription
    } = req.body;

    if (!req.user || !req.user.id) {
      return res.status(401).json({ success: false, error: 'User not authenticated to add profession.' });
    }

    // Create new profession
    const profession = await Profession.create({
      user: req.user.id, // Use the ID from the authenticated user
      name,
      email,
      mobileNo,
      secondaryMobileNo,
      state,
      district,
      city,
      serviceCategory,
      serviceName,
      designation,
      experience,
      servicePrice: Number(servicePrice),
      priceUnit,
      needSupport,
      professionDescription
    });

    // Update user's isProfession flag to true
    await User.findByIdAndUpdate(req.user.id, { isProfession: true });

    res.status(201).json({ success: true, data: profession });

  } catch (err) {
    console.error("Error while saving profession:", err);
    res.status(400).json({ success: false, error: err.message });
  }
};

exports.getProfessionalsByService = async (req, res) => {
  
  try {
    const { serviceName } = req.query;

    if (!serviceName) {
      return res.status(400).json({
        success: false,
        error: 'Service name is required'
      });
    }

    const professions = await Profession.find({
      serviceName: { $regex: serviceName, $options: 'i' }, 
    }).select('-__v'); 

    res.status(200).json({
      success: true,
      data: professions
    });
  } catch (err) {
    console.error("Error while fetching professionals:", err);
    res.status(500).json({
      success: false,
      error: 'Server error while fetching professionals',
      details: err.message
    });
  }
};