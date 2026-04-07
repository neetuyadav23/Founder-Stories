const express = require('express');
const router = express.Router();
const Comment = require('../models/Comment');
const Blog = require('../models/Blog');
const User = require('../models/User');
const { authenticate, isAdmin, trackActivity } = require('../middleware/auth');

// @route   GET /api/comments/:blogId
router.get('/:blogId', async (req, res) => {
  try {
    const comments = await Comment.find({ 
      blog: req.params.blogId,
      parentComment: null,
      isDeleted: false
    })
      .populate('author', 'name avatar role startup university')
      .populate({
        path: 'replies',
        match: { isDeleted: false },
        populate: {
          path: 'author',
          select: 'name avatar role startup university'
        }
      })
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

// @route   POST /api/comments/:blogId
router.post('/:blogId', authenticate, trackActivity('comment', 'Comment'), async (req, res) => {
  try {
    const { text, parentCommentId } = req.body;

    if (!text || text.trim().length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Comment text is required' 
      });
    }

    const blog = await Blog.findById(req.params.blogId);
    if (!blog) {
      return res.status(404).json({ 
        success: false, 
        message: 'Blog not found' 
      });
    }

    const comment = await Comment.create({
      blog: req.params.blogId,
      author: req.user._id,
      text,
      parentComment: parentCommentId || null
    });

    if (parentCommentId) {
      await Comment.findByIdAndUpdate(parentCommentId, {
        $push: { replies: comment._id }
      });
    }

    blog.commentsCount += 1;
    blog.calculateTrendingScore();
    await blog.save();

    await User.findByIdAndUpdate(req.user._id, {
      $inc: { commentsPosted: 1 }
    });

    await comment.populate('author', 'name avatar role startup university');

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

// @route   PUT /api/comments/:commentId
router.put('/:commentId', authenticate, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.commentId);

    if (!comment || comment.isDeleted) {
      return res.status(404).json({ 
        success: false, 
        message: 'Comment not found' 
      });
    }

    if (comment.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ 
        success: false, 
        message: 'Not authorized to update this comment' 
      });
    }

    comment.text = req.body.text || comment.text;
    await comment.save();
    await comment.populate('author', 'name avatar role startup university');

    res.json({
      success: true,
      message: 'Comment updated successfully',
      comment
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error updating comment', 
      error: error.message 
    });
  }
});

// @route   DELETE /api/comments/:commentId
router.delete('/:commentId', authenticate, trackActivity('deleteComment', 'Comment'), async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.commentId);

    if (!comment || comment.isDeleted) {
      return res.status(404).json({ 
        success: false, 
        message: 'Comment not found' 
      });
    }

    if (comment.author.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Not authorized to delete this comment' 
      });
    }

    comment.isDeleted = true;
    comment.deletedBy = req.user._id;
    await comment.save();

    const blog = await Blog.findById(comment.blog);
    if (blog) {
      blog.commentsCount -= 1;
      blog.calculateTrendingScore();
      await blog.save();
    }

    await User.findByIdAndUpdate(comment.author, {
      $inc: { commentsPosted: -1 }
    });

    res.json({
      success: true,
      message: 'Comment deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error deleting comment', 
      error: error.message 
    });
  }
});

// @route   POST /api/comments/:commentId/like
router.post('/:commentId/like', authenticate, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.commentId);

    if (!comment || comment.isDeleted) {
      return res.status(404).json({ 
        success: false, 
        message: 'Comment not found' 
      });
    }

    const userLikedIndex = comment.likes.indexOf(req.user._id);

    if (userLikedIndex > -1) {
      comment.likes.splice(userLikedIndex, 1);
      comment.likesCount -= 1;
    } else {
      comment.likes.push(req.user._id);
      comment.likesCount += 1;
    }

    await comment.save();

    res.json({
      success: true,
      message: userLikedIndex > -1 ? 'Comment unliked' : 'Comment liked',
      likes: comment.likesCount,
      isLiked: userLikedIndex === -1
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error liking comment', 
      error: error.message 
    });
  }
});

module.exports = router;