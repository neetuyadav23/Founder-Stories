// Authentication routes with role-based registration
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { authenticate } = require('../middleware/auth');

// Generate JWT Token
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

// @route   POST /api/auth/register
// @desc    Register a new user (founder/student/admin)
// @access  Public
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role, startup, university, course, adminKey } = req.body;

    // Validate required fields
    if (!name || !email || !password || !role) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please provide name, email, password, and role' 
      });
    }

    // Validate role
    if (!['founder', 'student', 'admin'].includes(role)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid role. Must be founder, student, or admin' 
      });
    }

    // Check admin registration key
    if (role === 'admin') {
      if (adminKey !== process.env.ADMIN_SECRET_KEY) {
        return res.status(403).json({ 
          success: false, 
          message: 'Invalid admin registration key' 
        });
      }
    }

    // Validate role-specific fields
    if (role === 'founder' && !startup) {
      return res.status(400).json({ 
        success: false, 
        message: 'Founders must provide startup name' 
      });
    }

    if (role === 'student' && !university) {
      return res.status(400).json({ 
        success: false, 
        message: 'Students must provide university name' 
      });
    }

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ 
        success: false, 
        message: 'User already exists with this email' 
      });
    }

    // Create new user
    const userData = {
      name,
      email,
      password,
      role
    };

    // Add role-specific data
    if (role === 'founder') {
      userData.startup = startup;
    } else if (role === 'student') {
      userData.university = university;
      userData.course = course;
    } else if (role === 'admin') {
      userData.adminLevel = req.body.adminLevel || 'moderator';
    }

    const user = await User.create(userData);

    // Generate token
    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      message: `${role.charAt(0).toUpperCase() + role.slice(1)} registered successfully`,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        ...(role === 'founder' && { startup: user.startup }),
        ...(role === 'student' && { university: user.university, course: user.course }),
        ...(role === 'admin' && { adminLevel: user.adminLevel })
      }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Registration failed', 
      error: error.message 
    });
  }
});

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please provide email and password' 
      });
    }

    // Find user and include password
    const user = await User.findOne({ email }).select('+password');
    
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid email or password' 
      });
    }

    // Check if account is active
    if (!user.isActive) {
      return res.status(403).json({ 
        success: false, 
        message: 'Account has been deactivated. Please contact admin.' 
      });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid email or password' 
      });
    }

    // Update last login
    user.lastLogin = Date.now();
    await user.save();

    // Generate token
    const token = generateToken(user._id);

    // Remove password from response
    user.password = undefined;

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        ...(user.role === 'founder' && { startup: user.startup, bio: user.bio }),
        ...(user.role === 'student' && { university: user.university, course: user.course }),
        ...(user.role === 'admin' && { adminLevel: user.adminLevel })
      }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Login failed', 
      error: error.message 
    });
  }
});

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    
    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        ...(user.role === 'founder' && { 
          startup: user.startup, 
          bio: user.bio,
          blogsWritten: user.blogsWritten 
        }),
        ...(user.role === 'student' && { 
          university: user.university, 
          course: user.course,
          commentsPosted: user.commentsPosted,
          likesGiven: user.likesGiven
        }),
        ...(user.role === 'admin' && { 
          adminLevel: user.adminLevel 
        }),
        createdAt: user.createdAt,
        lastLogin: user.lastLogin
      }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching user data', 
      error: error.message 
    });
  }
});

// @route   PUT /api/auth/update-profile
// @desc    Update user profile
// @access  Private
router.put('/update-profile', authenticate, async (req, res) => {
  try {
    const { name, bio, startup, university, course } = req.body;
    const user = await User.findById(req.user._id);

    // Update common fields
    if (name) user.name = name;
    if (bio) user.bio = bio;

    // Update role-specific fields
    if (user.role === 'founder' && startup) {
      user.startup = startup;
    }
    if (user.role === 'student') {
      if (university) user.university = university;
      if (course) user.course = course;
    }

    await user.save();

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error updating profile', 
      error: error.message 
    });
  }
});

// @route   GET /api/auth/check-role
// @desc    Check user role and permissions
// @access  Private
router.get('/check-role', authenticate, (req, res) => {
  res.json({
    success: true,
    role: req.user.role,
    permissions: {
      canWriteBlogs: req.user.role === 'founder' || req.user.role === 'admin',
      canComment: true,
      canLike: true,
      canManageAll: req.user.role === 'admin',
      canViewAnalytics: req.user.role === 'admin'
    }
  });
});

module.exports = router;