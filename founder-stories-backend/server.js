const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Import routes
const authRoutes = require('./routes/auth');
const blogRoutes = require('./routes/blogs');
// const commentRoutes = require('./routes/comments'); // REMOVED
const adminRoutes = require('./routes/admin');

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/blogs', blogRoutes);
// app.use('/api/comments', commentRoutes); // REMOVED
app.use('/api/admin', adminRoutes);

// Root route
app.get('/', (req, res) => {
  res.json({
    message: '🚀 Founder Stories API - Role-Based System',
    version: '1.0.0',
    roles: {
      founder: 'Can write, edit, delete own blogs + like & comment',
      student: 'Can read blogs, like, and comment',
      admin: 'Full control - manage users, blogs, comments, trending'
    },
    endpoints: {
      auth: '/api/auth',
      blogs: '/api/blogs',
      comments: '/api/blogs/:id/comments',
      admin: '/api/admin'
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : {}
  });
});

// Handle 404
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════╗
║   🚀 Founder Stories Backend Running       ║
╠════════════════════════════════════════════╣
║   Port: ${PORT}                               ║
║   Environment: ${process.env.NODE_ENV || 'development'}               ║
║   Database: Connected ✅                   ║
╠════════════════════════════════════════════╣
║   USER ROLES:                              ║
║   👨‍💼 Founder  - Write blogs               ║
║   👨‍🎓 Student  - Read, like, comment       ║
║   👑 Admin    - Manage everything          ║
╚════════════════════════════════════════════╝
  `);
});
