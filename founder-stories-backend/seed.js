// seed.js - Fixed to match User model requirements
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');
const Blog = require('./models/Blog');
const Comment = require('./models/Comment');

dotenv.config();

const seedDatabase = async () => {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Clear existing data
        await User.deleteMany({});
        await Blog.deleteMany({});
        await Comment.deleteMany({});
        console.log('🗑️  Cleared existing data');

        // Create users with correct fields
        const users = await User.create([
            {
                name: 'Priya Sharma',
                email: 'priya@ecocart.com',
                password: 'password123',
                role: 'founder',
                startup: 'EcoCart',
                bio: 'Passionate about sustainability and reducing campus waste.'
            },
            {
                name: 'Anjani Mehta',
                email: 'anjani@codementor.com',
                password: 'password123',
                role: 'founder',
                startup: 'CodeMentor',
                bio: 'Helping students ace coding interviews through peer learning.'
            },
            {
                name: 'Sneha Patel',
                email: 'sneha@hosteleats.com',
                password: 'password123',
                role: 'founder',
                startup: 'HostelEats',
                bio: 'Bringing home-cooked meals to students craving comfort food.'
            },
            {
                name: 'Riya Verma',
                email: 'riya@campusride.com',
                password: 'password123',
                role: 'founder',
                startup: 'CampusRide',
                bio: 'Making campus commutes affordable and sustainable.'
            },
            {
                name: 'Ananya Singh',
                email: 'ananya@mindspace.com',
                password: 'password123',
                role: 'founder',
                startup: 'MindSpace',
                bio: 'Breaking mental health stigma, one conversation at a time.'
            },
            {
                name: 'Ravi Kumari',
                email: 'ravi@student.com',
                password: 'password123',
                role: 'student',
                university: 'Banasthali Vidyapith',
                course: 'Computer Science'
            },
            {
                name: 'Meera Reddy',
                email: 'meera@student.com',
                password: 'password123',
                role: 'student',
                university: 'Banasthali Vidyapith',
                course: 'Mechanical Engineering'
            },
            {
                name: 'Admin User',
                email: 'admin@founderstories.com',
                password: 'admin123',
                role: 'admin',
                adminLevel: 'super'
            }
        ]);

        console.log('👥 Created users');

        // Create blogs
        const blog1 = await Blog.create({
            title: 'How We Reduced Campus Plastic Waste by 60%',
            excerpt: 'Our journey from a college project to a campus-wide initiative that\'s making a real environmental impact.',
            content: 'Starting EcoCart was born out of frustration seeing plastic bottles everywhere on campus. We started small with just 5 reusable bottle stations, but the response was overwhelming. Within months, we expanded to 30 stations across campus and partnered with the administration to make sustainability a priority. Today, we\'re proud to say we\'ve reduced plastic waste by over 60% and inspired other colleges to follow our model. The key to our success has been listening to students, iterating quickly, and never giving up on making our campus greener.',
            author: users[0]._id,
            category: 'Sustainability',
            tags: ['sustainability', 'environment', 'campus', 'impact'],
            status: 'published'
        });

        const blog2 = await Blog.create({
            title: 'Building a Peer-to-Peer Learning Platform',
            excerpt: 'From struggling with DSA to helping 500+ students ace their coding interviews.',
            content: 'I failed my first coding interview badly. That\'s when I realized our college needed better peer learning. CodeMentor connects struggling students with those who\'ve mastered concepts. We\'ve grown from 10 users to over 500 active learners, with an 85% placement success rate among our active users. The platform allows students to book 1-on-1 sessions, participate in group study rooms, and access recorded explanations. Our mentors are students who\'ve recently mastered the topics, making the learning more relatable and accessible.',
            author: users[1]._id,
            category: 'EdTech',
            tags: ['education', 'technology', 'coding', 'peer-learning'],
            status: 'published'
        });

        const blog3 = await Blog.create({
            title: 'Late Night Cravings Led to 1000 Orders',
            excerpt: 'How midnight cravings for home-cooked food turned into a thriving business.',
            content: 'It was 2 AM and all I wanted was some homemade rajma chawal. That\'s when HostelEats was born. We connect students with home cooks near campus who prepare affordable, healthy meals. Within 3 months, we hit 1000 orders and are now expanding to 5 more colleges. Our secret? Focusing on quality home-cooked meals that remind students of home, maintaining hygiene standards, and building trust with both cooks and students. We\'ve created a community where everyone wins.',
            author: users[2]._id,
            category: 'Food Tech',
            tags: ['food', 'delivery', 'startup', 'homemade'],
            status: 'published'
        });

        const blog4 = await Blog.create({
            title: 'Solving the Last Mile Problem',
            excerpt: 'Making campus commutes easier and more affordable for everyone.',
            content: 'Missing classes because of traffic was our daily struggle. CampusRide connects students heading the same direction for shared rides. We\'ve reduced commute costs by 70% and carbon emissions significantly. Over 2000 students now use our platform daily. The app uses smart matching algorithms to connect riders within minutes, ensuring safety through verified student profiles and real-time tracking. We\'re not just saving money - we\'re building a sustainable transportation culture.',
            author: users[3]._id,
            category: 'Transportation',
            tags: ['transportation', 'sharing-economy', 'sustainability'],
            status: 'published'
        });

        const blog5 = await Blog.create({
            title: 'Breaking Mental Health Stigma',
            excerpt: 'Creating a safe space for students to talk about stress and burnout.',
            content: 'During exam season, I noticed friends struggling silently with mental health. MindSpace provides anonymous peer support and connects students with counselors. We\'ve helped over 800 students and are working to normalize mental health conversations on campus. Our platform offers 24/7 chat support, guided meditation sessions, and stress management workshops. The anonymous feature has been crucial in helping students open up without fear of judgment.',
            author: users[4]._id,
            category: 'Mental Health',
            tags: ['mental-health', 'wellness', 'support', 'community'],
            status: 'published'
        });

        // Add likes
        blog1.likes.push(users[5]._id, users[6]._id);
        blog2.likes.push(users[5]._id);
        blog3.likes.push(users[5]._id, users[6]._id);
        blog4.likes.push(users[6]._id);
        blog5.likes.push(users[5]._id, users[6]._id);

        await blog1.save();
        await blog2.save();
        await blog3.save();
        await blog4.save();
        await blog5.save();

        console.log('📝 Created 5 blogs');

        // Create comments
        await Comment.create([
            {
                text: 'This is so inspiring! Would love to collaborate on sustainability initiatives.',
                author: users[5]._id,
                blog: blog1._id
            },
            {
                text: 'Amazing work! Can you share more about how you got your first customers?',
                author: users[6]._id,
                blog: blog3._id
            },
            {
                text: 'This really helped me understand DSA better. Thanks for building this!',
                author: users[5]._id,
                blog: blog2._id
            }
        ]);

        console.log('💬 Created 3 comments');
        console.log('\n✨ Database seeded successfully!\n');
        console.log('📊 Summary:');
        console.log(`   - ${users.length} users created`);
        console.log(`   - 5 blogs created`);
        console.log(`   - 3 comments created\n`);
        console.log('🔑 Test Accounts:\n');
        console.log('   👑 Founders:');
        console.log('      priya@ecocart.com / password123');
        console.log('      arjun@codementor.com / password123');
        console.log('      sneha@hosteleats.com / password123\n');
        console.log('   👤 Students:');
        console.log('      ravi@student.com / password123');
        console.log('      meera@student.com / password123\n');
        console.log('   👨‍💼 Admin:');
        console.log('      admin@founderstories.com / admin123\n');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error seeding database:', error);
        console.error('\nError details:', error.message);
        if (error.errors) {
            Object.keys(error.errors).forEach(key => {
                console.error(`   - ${key}: ${error.errors[key].message}`);
            });
        }
        process.exit(1);
    }
};

seedDatabase();