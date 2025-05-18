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

exports.updateUserProfessionalProfile = async (req, res) => {
  try {
    const userId = req.user.id; // From 'protect' auth middleware
    const {
      // Destructure all fields from req.body that can be updated
      // Note: name, email, and primary mobileNo are part of the User model
      // and should be updated via a different endpoint (e.g., /api/users/update)
      // if they are intended to change the core user details.
      // Here, we assume these might be specific to the professional listing if your Professional model has them.
      name, // If Professional model has its own name field
      email, // If Professional model has its own email field
      mobileNo, // If Professional model has its own mobileNo field
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
      professionDescription,
    } = req.body;

    let professionalProfile = await Profession.findOne({ user: userId });

    if (!professionalProfile) {
      // If the profile doesn't exist, you might want to return an error
      // or create one if your logic allows (upsert-like behavior).
      // For an update, it's common to expect the profile to exist.
      return res.status(404).json({ success: false, error: 'Professional profile not found. Please add one first.' });
    }

    // Update fields that are part of the Professional model
    if (name !== undefined) professionalProfile.name = name; // Only if Professional model has 'name'
    if (email !== undefined) professionalProfile.email = email; // Only if Professional model has 'email'
    if (mobileNo !== undefined) professionalProfile.mobileNo = mobileNo; // Only if Professional model has 'mobileNo'
    if (secondaryMobileNo !== undefined) professionalProfile.secondaryMobileNo = secondaryMobileNo;
    if (state) professionalProfile.state = state;
    if (district) professionalProfile.district = district;
    if (city) professionalProfile.city = city;
    if (serviceCategory) professionalProfile.serviceCategory = serviceCategory;
    if (serviceName) professionalProfile.serviceName = serviceName;
    professionalProfile.designation = designation; // Can be empty
    if (experience) professionalProfile.experience = experience;
    if (servicePrice !== undefined) professionalProfile.servicePrice = Number(servicePrice);
    if (priceUnit) professionalProfile.priceUnit = priceUnit;
    if (needSupport !== undefined) professionalProfile.needSupport = needSupport;
    if (professionDescription !== undefined) professionalProfile.professionDescription = professionDescription;

    await professionalProfile.save();

    res.json({ success: true, message: 'Professional profile updated successfully', data: professionalProfile });
  } catch (err) {
    console.error('Error updating professional profile:', err.message);
    res.status(500).json({ success: false, error: 'Server error while updating profile', details: err.message });
  }
};
