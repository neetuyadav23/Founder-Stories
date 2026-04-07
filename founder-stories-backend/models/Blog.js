// Blogs with author validation and trending
const mongoose = require('mongoose');

const blogSchema = new mongoose.Schema({
  title: {
    type: String,
    required: function() {
      return this.status === 'published';  // Only required when publishing
    },
    trim: true,
    maxlength: 200
  },
  excerpt: {
    type: String,
    required: function() {
      return this.status === 'published';  // Only required when publishing
    },
    maxlength: 300
  },
  content: {
    type: String,
  required: function() {
    return this.status === 'published';
  }
  },
  category: {
    type: String,
    required: function() {
      return this.status === 'published';  // Only required when publishing
    },
    enum: ['Technology', 'Business', 'Sustainability', 'EdTech', 'Food Tech', 'Transportation', 'Mental Health', 'FinTech', 'HealthTech', 'E-commerce', 'AI/ML', 'Other']
  },
  image: {
    type: String,
    default: ''
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true  // Always required
  },
  // Likes tracking
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  likesCount: {
    type: Number,
    default: 0
  },
  // Comments tracking
  commentsCount: {
    type: Number,
    default: 0
  },
  // Views tracking
  views: {
    type: Number,
    default: 0
  },
  uniqueViewers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  // Trending system
  trending: {
    type: Boolean,
    default: false
  },
  trendingScore: {
    type: Number,
    default: 0
  },
  // Blog status
  status: {
    type: String,
    enum: ['draft', 'published', 'archived', 'flagged'],
    default: 'draft'  // Changed default to 'draft'
  },
  // Admin actions
  flaggedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  flagReason: {
    type: String
  },
  // SEO
  tags: [{
    type: String,
    trim: true
  }],
  readTime: {
    type: Number, // in minutes
    default: function() {
      if (this.content && this.content.length > 0) {
        return Math.ceil(this.content.split(' ').length / 200);
      }
      return 0;
    }
  }
}, {
  timestamps: true
});

// Calculate trending score
// Formula: (likes * 3 + comments * 5 + views * 0.1) / days_since_creation
blogSchema.methods.calculateTrendingScore = function() {
  const daysSinceCreation = (Date.now() - this.createdAt) / (1000 * 60 * 60 * 24);
  const timeDecay = Math.max(1, daysSinceCreation);
  
  const engagementScore = (this.likesCount * 3) + (this.commentsCount * 5) + (this.views * 0.1);
  this.trendingScore = engagementScore / timeDecay;
  
  return this.trendingScore;
};

// Virtual for comment population
blogSchema.virtual('comments', {
  ref: 'Comment',
  localField: '_id',
  foreignField: 'blog'
});

// Indexes for performance
blogSchema.index({ author: 1, createdAt: -1 });
blogSchema.index({ category: 1, status: 1 });
blogSchema.index({ trendingScore: -1 });
blogSchema.index({ status: 1, createdAt: -1 });
blogSchema.index({ tags: 1 });

module.exports = mongoose.models.Blog || mongoose.model('Blog', blogSchema);