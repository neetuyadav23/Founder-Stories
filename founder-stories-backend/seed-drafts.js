const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');
const Blog = require('./models/Blog');

dotenv.config();

const seedDrafts = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find the founder user (priya@ecocart.com)
    const founder = await User.findOne({ email: 'priya@ecocart.com' });
    
    if (!founder) {
      console.log('❌ Founder not found. Please create user first.');
      console.log('Run: node seed.js');
      process.exit(1);
    }

    console.log('✅ Found founder:', founder.email);

    // Sample drafts
    const drafts = [
      {
        title: 'Our Journey to Zero Waste Campus',
        excerpt: 'How we convinced 5000 students to stop using plastic bottles.',
        content: 'It all started with a simple observation during my morning walk across campus. Plastic bottles everywhere. I knew something had to change. This is our story of transforming our entire campus into a zero-waste zone, one step at a time...',
        category: 'Sustainability',
        tags: ['sustainability', 'campus', 'environment'],
        author: founder._id,
        status: 'draft'
      },
      {
        title: 'Scaling from 10 to 1000 Users',
        excerpt: '',
        content: '',
        category: 'Business',
        tags: ['growth', 'startup'],
        author: founder._id,
        status: 'draft'
      },
      {
        title: 'Lessons from Our First Funding Round',
        excerpt: 'What I wish I knew before pitching to investors.',
        content: '',
        category: 'Business',
        tags: [],
        author: founder._id,
        status: 'draft'
      },
      {
        title: 'Building a Team While Still in College',
        excerpt: '',
        content: 'Finding co-founders who share your vision is hard. Finding them while balancing exams and assignments? Even harder. Here are the strategies that worked for us when building our initial team of passionate students...',
        category: 'Business',
        tags: ['team', 'hiring', 'college'],
        author: founder._id,
        status: 'draft'
      }
    ];

    // Clear existing drafts for this founder
    await Blog.deleteMany({ author: founder._id, status: 'draft' });
    console.log('🗑️  Cleared old drafts');

    // Create new drafts
    await Blog.insertMany(drafts);
    console.log('✅ Created sample drafts');

    console.log('\n🎉 Sample drafts created successfully!');
    console.log('Login as: priya@ecocart.com / password123');
    console.log('Go to My Drafts to see them!');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

seedDrafts();