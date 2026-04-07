// Track all user activities for admin dashboard

const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  action: {
    type: String,
    enum: ['login', 'logout', 'createBlog', 'editBlog', 'deleteBlog', 'likeBlog', 'unlikeBlog', 'comment', 'deleteComment', 'viewBlog'],
    required: true
  },
  targetType: {
    type: String,
    enum: ['Blog', 'Comment', 'User'],
    required: true
  },
  target: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'targetType'
  },
  ipAddress: {
    type: String
  },
  userAgent: {
    type: String
  }
}, {
  timestamps: true
});

// Index for admin analytics
activitySchema.index({ user: 1, createdAt: -1 });
activitySchema.index({ action: 1, createdAt: -1 });

module.exports = mongoose.model('Activity', activitySchema);