// Blog routes with role-based access control
const express = require('express');
const router = express.Router();
const Blog = require('../models/Blog');
const User = require('../models/User');
const { authenticate, authorize, isFounder, isAdmin, optionalAuth, trackActivity } = require('../middleware/auth');

// @route   GET /api/blogs
// @desc    Get all published blogs (Public - All users can see)
// @access  Public
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { category, trending, recent, author, search, limit = 10, page = 1 } = req.query;
    
    let query = { status: 'published' };

    // Apply filters
    if (category) query.category = category;
    if (author) query.author = author;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { excerpt: { $regex: search, $options: 'i' } },
        { tags: { $regex: search, $options: 'i' } }
      ];
    }
    if (trending === 'true') query.trending = true;

    // Sort options
    let sortOptions = {};
    if (recent === 'true') {
      sortOptions = { createdAt: -1 };
    } else if (trending === 'true') {
      sortOptions = { trendingScore: -1, createdAt: -1 };
    } else {
      sortOptions = { createdAt: -1 };
    }

    const blogs = await Blog.find(query)
      .populate('author', 'name avatar startup role')
      .sort(sortOptions)
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await Blog.countDocuments(query);

    res.json({
      success: true,
      count: blogs.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
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

// @route   GET /api/blogs/trending
// @desc    Get trending blogs
// @access  Public
router.get('/trending', async (req, res) => {
  try {
    // Update trending scores
    const blogs = await Blog.find({ status: 'published' });
    
    for (let blog of blogs) {
      blog.calculateTrendingScore();
      await blog.save();
    }

    // Get top 10 trending blogs
    const trendingBlogs = await Blog.find({ status: 'published' })
      .populate('author', 'name avatar startup role')
      .sort({ trendingScore: -1 })
      .limit(10);

    // Mark as trending
    const trendingIds = trendingBlogs.map(b => b._id);
    await Blog.updateMany(
      { _id: { $in: trendingIds } },
      { trending: true }
    );

    // Remove trending from others
    await Blog.updateMany(
      { _id: { $nin: trendingIds } },
      { trending: false }
    );

    res.json({
      success: true,
      count: trendingBlogs.length,
      blogs: trendingBlogs
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching trending blogs', 
      error: error.message 
    });
  }
});

// @route   GET /api/blogs/my-drafts
// @desc    Get current founder's drafts ONLY
// @access  Private - Founder only
router.get('/my-drafts', authenticate, authorize('founder', 'admin'), async (req, res) => {
  try {
    const drafts = await Blog.find({ 
      author: req.user._id,  // Only current user's blogs
      status: 'draft'        // Only drafts
    })
    .populate('author', 'name avatar startup role')
    .sort({ updatedAt: -1 });  // Most recently edited first

    res.json({
      success: true,
      count: drafts.length,
      drafts
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching drafts', 
      error: error.message 
    });
  }
});

// @route   GET /api/blogs/:id
// @desc    Get single blog by ID (including drafts if owner/admin)
// @access  Public for published, Private for drafts
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id)
      .populate('author', 'name avatar startup bio role');

    if (!blog) {
      return res.status(404).json({ 
        success: false, 
        message: 'Blog not found' 
      });
    }

    // If it's a draft, only author or admin can view
    if (blog.status === 'draft') {
      if (!req.user || (blog.author._id.toString() !== req.user._id.toString() && req.user.role !== 'admin')) {
        return res.status(403).json({ 
          success: false, 
          message: 'You do not have permission to view this draft' 
        });
      }
    }

    // Don't show archived blogs
    if (blog.status === 'archived') {
      return res.status(404).json({ 
        success: false, 
        message: 'Blog not found' 
      });
    }

    // Increment views only for published blogs
    if (blog.status === 'published') {
      blog.views += 1;
      
      // Track unique viewers
      if (req.user && !blog.uniqueViewers.includes(req.user._id)) {
        blog.uniqueViewers.push(req.user._id);
      }
      
      await blog.save();
    }

    res.json({
      success: true,
      blog,
      userHasLiked: req.user ? blog.likes.includes(req.user._id) : false
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching blog', 
      error: error.message 
    });
  }
});

// @route   POST /api/blogs
// @desc    Create a new blog or draft (ONLY FOUNDERS)
// @access  Private - Founder only
router.post('/', authenticate, authorize('founder', 'admin'), async (req, res) => {
  try {
    const { title, excerpt, content, category, image, tags, status } = req.body;

    // Validate required fields ONLY if publishing
    if (status === 'published') {
      if (!title || !excerpt || !content || !category) {
        return res.status(400).json({ 
          success: false, 
          message: 'Please provide all required fields to publish',
          missingFields: {
            title: !title,
            excerpt: !excerpt,
            content: !content,
            category: !category
          }
        });
      }
    }

    const blog = await Blog.create({
      title: title || '',
      excerpt: excerpt || '',
      content: content || '',
      category: category || undefined,
      image: image || '',
      tags: tags || [],
      author: req.user._id,
      status: status || 'draft'  // Default to draft if not specified
    });

    await blog.populate('author', 'name avatar startup role');

    // Update user's blog count only for published blogs
    if (status === 'published') {
      await User.findByIdAndUpdate(req.user._id, {
        $inc: { blogsWritten: 1 }
      });
    }

    res.status(201).json({
      success: true,
      message: status === 'published' ? 'Blog published successfully' : 'Draft saved successfully',
      blog
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error creating blog', 
      error: error.message 
    });
  }
});

// @route   PUT /api/blogs/:id
// @desc    Update a blog or draft (ONLY AUTHOR or ADMIN)
// @access  Private - Author or Admin
router.put('/:id', authenticate, async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);

    if (!blog) {
      return res.status(404).json({ 
        success: false, 
        message: 'Blog not found' 
      });
    }

    // Check if user is author or admin
    if (blog.author.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Not authorized to update this blog' 
      });
    }

    const { title, excerpt, content, category, image, tags, status } = req.body;

    // If trying to publish, validate required fields
    if (status === 'published' && blog.status === 'draft') {
      const updatedTitle = title || blog.title;
      const updatedExcerpt = excerpt || blog.excerpt;
      const updatedContent = content || blog.content;
      const updatedCategory = category || blog.category;

      if (!updatedTitle || !updatedExcerpt || !updatedContent || !updatedCategory) {
        return res.status(400).json({ 
          success: false, 
          message: 'Please fill in all required fields before publishing',
          missingFields: {
            title: !updatedTitle,
            excerpt: !updatedExcerpt,
            content: !updatedContent,
            category: !updatedCategory
          }
        });
      }
    }

    // Update fields
    if (title !== undefined) blog.title = title;
    if (excerpt !== undefined) blog.excerpt = excerpt;
    if (content !== undefined) blog.content = content;
    if (category !== undefined) blog.category = category;
    if (image !== undefined) blog.image = image;
    if (tags !== undefined) blog.tags = tags;
    
    // Update status
    const oldStatus = blog.status;
    if (status !== undefined) blog.status = status;

    await blog.save();
    await blog.populate('author', 'name avatar startup role');

    // If publishing from draft, increment blog count
    if (oldStatus === 'draft' && status === 'published') {
      await User.findByIdAndUpdate(req.user._id, {
        $inc: { blogsWritten: 1 }
      });
    }

    res.json({
      success: true,
      message: status === 'published' ? 'Blog published successfully' : 'Blog updated successfully',
      blog
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error updating blog', 
      error: error.message 
    });
  }
});

// @route   PUT /api/blogs/:id/publish
// @desc    Publish a draft
// @access  Private - Author only
router.put('/:id/publish', authenticate, async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);

    if (!blog) {
      return res.status(404).json({ 
        success: false, 
        message: 'Blog not found' 
      });
    }

    // Check if user is the author or admin
    if (blog.author.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Not authorized to publish this blog' 
      });
    }

    // Validate required fields before publishing
    if (!blog.title || !blog.excerpt || !blog.content || !blog.category) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please fill in all required fields before publishing',
        missingFields: {
          title: !blog.title,
          excerpt: !blog.excerpt,
          content: !blog.content,
          category: !blog.category
        }
      });
    }

    // Check if already published
    if (blog.status === 'published') {
      return res.status(400).json({ 
        success: false, 
        message: 'Blog is already published' 
      });
    }

    // Publish the blog
    blog.status = 'published';
    await blog.save();

    // Update user's blog count
    await User.findByIdAndUpdate(req.user._id, {
      $inc: { blogsWritten: 1 }
    });

    await blog.populate('author', 'name avatar startup role');

    res.json({
      success: true,
      message: 'Blog published successfully',
      blog
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error publishing blog', 
      error: error.message 
    });
  }
});

// @route   DELETE /api/blogs/:id
// @desc    Delete a blog (ONLY AUTHOR or ADMIN)
// @access  Private - Author or Admin
router.delete('/:id', authenticate, trackActivity('deleteBlog', 'Blog'), async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);

    if (!blog) {
      return res.status(404).json({ 
        success: false, 
        message: 'Blog not found' 
      });
    }

    // Check if user is author or admin
    if (blog.author.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Not authorized to delete this blog' 
      });
    }

    await blog.deleteOne();

    // Update user's blog count only if it was published
    if (blog.status === 'published') {
      await User.findByIdAndUpdate(blog.author, {
        $inc: { blogsWritten: -1 }
      });
    }

    res.json({
      success: true,
      message: blog.status === 'draft' ? 'Draft deleted successfully' : 'Blog deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error deleting blog', 
      error: error.message 
    });
  }
});

// @route   POST /api/blogs/:id/like
// @desc    Like/Unlike a blog (ALL AUTHENTICATED USERS)
// @access  Private - Founder, Student, Admin
router.post('/:id/like', authenticate, async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);

    if (!blog) {
      return res.status(404).json({ 
        success: false, 
        message: 'Blog not found' 
      });
    }

    // Can't like drafts
    if (blog.status === 'draft') {
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot like unpublished blogs' 
      });
    }

    const userLikedIndex = blog.likes.indexOf(req.user._id);
    let message = '';
    let isLiked = false;

    if (userLikedIndex > -1) {
      // User already liked - UNLIKE
      blog.likes.splice(userLikedIndex, 1);
      blog.likesCount = Math.max(0, (blog.likesCount || 0) - 1);
      message = 'Blog unliked';
      isLiked = false;
      
      // Update user stats
      await User.findByIdAndUpdate(req.user._id, {
        $inc: { likesGiven: -1 }
      });
    } else {
      // User hasn't liked - LIKE
      blog.likes.push(req.user._id);
      blog.likesCount = (blog.likesCount || 0) + 1;
      message = 'Blog liked';
      isLiked = true;
      
      // Update user stats
      await User.findByIdAndUpdate(req.user._id, {
        $inc: { likesGiven: 1 }
      });
    }

    // Recalculate trending score
    blog.calculateTrendingScore();
    await blog.save();

    res.json({
      success: true,
      message,
      likesCount: blog.likesCount,
      isLiked: isLiked
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error liking blog', 
      error: error.message 
    });
  }
});

// @route   GET /api/blogs/:id/comments
// @desc    Get all comments for a blog
// @access  Public
router.get('/:id/comments', async (req, res) => {
  try {
    const Comment = require('../models/comment');
    
    const comments = await Comment.find({ blog: req.params.id })
      .populate('author', 'name avatar role')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: comments.length,
      comments
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching comments', 
      error: error.message 
    });
  }
});

// @route   POST /api/blogs/:id/comments
// @desc    Add a comment to a blog (ALL AUTHENTICATED USERS)
// @access  Private - Founder, Student, Admin
router.post('/:id/comments', authenticate, async (req, res) => {
  try {
    const Comment = require('../models/comment');
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({ 
        success: false, 
        message: 'Comment text is required' 
      });
    }

    const blog = await Blog.findById(req.params.id);

    if (!blog) {
      return res.status(404).json({ 
        success: false, 
        message: 'Blog not found' 
      });
    }

    // Can't comment on drafts
    if (blog.status === 'draft') {
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot comment on unpublished blogs' 
      });
    }

    const comment = await Comment.create({
      text,
      author: req.user._id,
      blog: req.params.id
    });

    await comment.populate('author', 'name avatar role');

    // Update blog's comment count
    blog.commentsCount = (blog.commentsCount || 0) + 1;
    blog.calculateTrendingScore();
    await blog.save();

    // Update user's comment count
    await User.findByIdAndUpdate(req.user._id, {
      $inc: { commentsPosted: 1 }
    });

    res.status(201).json({
      success: true,
      message: 'Comment added successfully',
      comment
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error adding comment', 
      error: error.message 
    });
  }
});

// @route   GET /api/blogs/founder/:founderId
// @desc    Get all blogs by a founder
// @access  Public
router.get('/founder/:founderId', async (req, res) => {
  try {
    const founder = await User.findById(req.params.founderId);
    
    if (!founder || founder.role !== 'founder') {
      return res.status(404).json({ 
        success: false, 
        message: 'Founder not found' 
      });
    }

    const blogs = await Blog.find({ 
      author: req.params.founderId,
      status: 'published'
    })
    .populate('author', 'name avatar startup bio')
    .sort({ createdAt: -1 });

    res.json({
      success: true,
      founder: {
        name: founder.name,
        avatar: founder.avatar,
        startup: founder.startup,
        bio: founder.bio
      },
      count: blogs.length,
      blogs
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching founder blogs', 
      error: error.message 
    });
  }
});

module.exports = router;