// Authentication & Role-based Authorization

const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Verify JWT Token
const authenticate = async (req, res, next) => {
  try {
    // Get token from header
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'No authentication token, access denied' 
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Find user
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user || !user.isActive) {
      return res.status(401).json({ 
        success: false, 
        message: 'User not found or inactive' 
      });
    }

    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ 
      success: false, 
      message: 'Token is invalid or expired' 
    });
  }
};

// Role-based authorization middleware
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Only ${roles.join(', ')} can perform this action.`
      });
    }

    next();
  };
};

// Check if user is founder
const isFounder = (req, res, next) => {
  if (req.user.role !== 'founder') {
    return res.status(403).json({
      success: false,
      message: 'Only founders can write blogs'
    });
  }
  next();
};

// Check if user is student
const isStudent = (req, res, next) => {
  if (req.user.role !== 'student') {
    return res.status(403).json({
      success: false,
      message: 'Only students can access this resource'
    });
  }
  next();
};

// Check if user is admin
const isAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Admin access required'
    });
  }
  next();
};

// Check if user owns the resource or is admin
const isOwnerOrAdmin = (Model) => {
  return async (req, res, next) => {
    try {
      const resourceId = req.params.id;
      const resource = await Model.findById(resourceId);

      if (!resource) {
        return res.status(404).json({
          success: false,
          message: 'Resource not found'
        });
      }

      // Admin can access anything
      if (req.user.role === 'admin') {
        return next();
      }

      // Check if user owns the resource
      if (resource.author && resource.author.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to modify this resource'
        });
      }

      next();
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error checking permissions',
        error: error.message
      });
    }
  };
};

// Optional authentication (for public routes with extra features for logged-in users)
const optionalAuth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId).select('-password');
      
      if (user && user.isActive) {
        req.user = user;
      }
    }
    
    next();
  } catch (error) {
    // Token invalid, but route is public so continue
    next();
  }
};

// Track user activity
const trackActivity = (action, targetType) => {
  return async (req, res, next) => {
    try {
      if (req.user) {
        const Activity = require('../models/Activity');
        await Activity.create({
          user: req.user._id,
          action,
          targetType,
          target: req.params.id || req.body.blogId,
          ipAddress: req.ip,
          userAgent: req.get('user-agent')
        });
      }
      next();
    } catch (error) {
      // Don't block request if activity logging fails
      console.error('Activity tracking error:', error);
      next();
    }
  };
};

module.exports = {
  authenticate,
  authorize,
  isFounder,
  isStudent,
  isAdmin,
  isOwnerOrAdmin,
  optionalAuth,
  trackActivity
};