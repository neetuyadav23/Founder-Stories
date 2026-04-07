// Three roles: founder, student, admin
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: 6,
    select: false  // Don't return password by default
  },
  role: {
    type: String,
    enum: ['founder', 'student', 'admin'],
    required: [true, 'User role is required'],
    default: 'student'
  },
  avatar: {
    type: String,
    default: function() {
      return `https://api.dicebear.com/7.x/avataaars/svg?seed=${this.name}`;
    }
  },
  // Founder-specific fields
  startup: {
    type: String,
    trim: true,
    required: function() {
      return this.role === 'founder';
    }
  },
  bio: {
    type: String,
    maxlength: 500
  },
  // Student-specific fields
  university: {
    type: String,
    trim: true,
    required: function() {
      return this.role === 'student';
    }
  },
  course: {
    type: String,
    trim: true
  },
  // Admin-specific fields
  adminLevel: {
    type: String,
    enum: ['super', 'moderator'],
    default: 'moderator',
    required: function() {
      return this.role === 'admin';
    }
  },
  // Activity tracking
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date
  },
  // Statistics
  blogsWritten: {
    type: Number,
    default: 0
  },
  commentsPosted: {
    type: Number,
    default: 0
  },
  likesGiven: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Hash password before saving
// Hash password before saving
userSchema.pre('save', async function() {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 12);
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Check if user has permission
userSchema.methods.hasPermission = function(action) {
  const permissions = {
    founder: ['createBlog', 'editOwnBlog', 'deleteOwnBlog', 'like', 'comment'],
    student: ['readBlog', 'like', 'comment'],
    admin: ['all']
  };
  
  if (this.role === 'admin') return true;
  return permissions[this.role]?.includes(action) || false;
};

module.exports = mongoose.model('User', userSchema);