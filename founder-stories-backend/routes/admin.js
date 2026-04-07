const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Blog = require('../models/Blog');
const Comment = require('../models/Comment');
const Activity = require('../models/Activity');
const { authenticate, isAdmin } = require('../middleware/auth');

// Apply admin middleware to all routes
router.use(authenticate, isAdmin);

// @route   GET /api/admin/dashboard
router.get('/dashboard', async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalFounders = await User.countDocuments({ role: 'founder' });
    const totalStudents = await User.countDocuments({ role: 'student' });
    const totalBlogs = await Blog.countDocuments();
    const publishedBlogs = await Blog.countDocuments({ status: 'published' });
    const totalComments = await Comment.countDocuments({ isDeleted: false });
    
    const recentActivity = await Activity.find()
      .populate('user', 'name email role')
      .sort({ createdAt: -1 })
      .limit(20);

    const topBlogs = await Blog.find({ status: 'published' })
      .sort({ views: -1, likesCount: -1 })
      .limit(10)
      .populate('author', 'name startup');

    const topFounders = await User.find({ role: 'founder' })
      .sort({ blogsWritten: -1 })
      .limit(10)
      .select('name startup blogsWritten avatar');

    const totalLikes = await Blog.aggregate([
      { $group: { _id: null, total: { $sum: '$likesCount' } } }
    ]);

    const totalViews = await Blog.aggregate([
      { $group: { _id: null, total: { $sum: '$views' } } }
    ]);

    res.json({
      success: true,
      stats: {
        users: {
          total: totalUsers,
          founders: totalFounders,
          students: totalStudents,
          admins: totalUsers - totalFounders - totalStudents
        },
        blogs: {
          total: totalBlogs,
          published: publishedBlogs,
          drafts: totalBlogs - publishedBlogs
        },
        engagement: {
          totalComments,
          totalLikes: totalLikes[0]?.total || 0,
          totalViews: totalViews[0]?.total || 0
        }
      },
      recentActivity,
      topBlogs,
      topFounders
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching dashboard data', 
      error: error.message 
    });
  }
});

// @route   GET /api/admin/users
router.get('/users', async (req, res) => {
  try {
    const { role, isActive, search, limit = 20, page = 1 } = req.query;
    
    let query = {};
    if (role) query.role = role;
    if (isActive !== undefined) query.isActive = isActive === 'true';
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await User.countDocuments(query);

    res.json({
      success: true,
      count: users.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      users
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching users', 
      error: error.message 
    });
  }
});

// @route   PUT /api/admin/users/:userId/toggle-active
router.put('/users/:userId/toggle-active', async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    user.isActive = !user.isActive;
    await user.save();

    res.json({
      success: true,
      message: `User account ${user.isActive ? 'activated' : 'deactivated'}`,
      user
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error updating user status', 
      error: error.message 
    });
  }
});

// @route   GET /api/admin/blogs
router.get('/blogs', async (req, res) => {
  try {
    const { status, category, limit = 20, page = 1 } = req.query;
    
    let query = {};
    if (status) query.status = status;
    if (category) query.category = category;

    const blogs = await Blog.find(query)
      .populate('author', 'name startup role')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await Blog.countDocuments(query);

    res.json({
      success: true,
      count: blogs.length,
      total,
      blogs
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching blogs', 
      error: error.message 
    });
  }
});

// @route   PUT /api/admin/blogs/:blogId/flag
router.put('/blogs/:blogId/flag', async (req, res) => {
  try {
    const { reason } = req.body;
    
    const blog = await Blog.findByIdAndUpdate(
      req.params.blogId,
      {
        status: 'flagged',
        flaggedBy: req.user._id,
        flagReason: reason
      },
      { new: true }
    ).populate('author', 'name startup');

    if (!blog) {
      return res.status(404).json({ 
        success: false, 
        message: 'Blog not found' 
      });
    }

    res.json({
      success: true,
      message: 'Blog flagged successfully',
      blog
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error flagging blog', 
      error: error.message 
    });
  }
});

// @route   PUT /api/admin/trending/update
router.put('/trending/update', async (req, res) => {
  try {
    const blogs = await Blog.find({ status: 'published' });
    
    for (let blog of blogs) {
      blog.calculateTrendingScore();
      await blog.save();
    }

    const trendingBlogs = await Blog.find({ status: 'published' })
      .sort({ trendingScore: -1 })
      .limit(10);

    await Blog.updateMany({}, { trending: false });
    await Blog.updateMany(
      { _id: { $in: trendingBlogs.map(b => b._id) } },
      { trending: true }
    );

    res.json({
      success: true,
      message: 'Trending blogs updated successfully',
      trendingBlogs
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error updating trending', 
      error: error.message 
    });
  }
});

// @route   GET /api/admin/analytics
router.get('/analytics', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    let dateQuery = {};
    if (startDate || endDate) {
      dateQuery.createdAt = {};
      if (startDate) dateQuery.createdAt.$gte = new Date(startDate);
      if (endDate) dateQuery.createdAt.$lte = new Date(endDate);
    }

    const userGrowth = await User.aggregate([
      { $match: dateQuery },
      { $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
        count: { $sum: 1 }
      }},
      { $sort: { _id: 1 } }
    ]);

    const blogTrend = await Blog.aggregate([
      { $match: { ...dateQuery, status: 'published' } },
      { $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
        count: { $sum: 1 }
      }},
      { $sort: { _id: 1 } }
    ]);

    const categoryStats = await Blog.aggregate([
      { $match: { status: 'published' } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    res.json({
      success: true,
      analytics: {
        userGrowth,
        blogTrend,
        categoryStats
      }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching analytics', 
      error: error.message 
    });
  }
});

module.exports = router;