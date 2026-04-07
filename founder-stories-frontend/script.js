// API Configuration
const API_BASE_URL = 'http://localhost:5000/api';

// State
let allBlogs = [];
let currentBlog = null;
let currentFilter = 'all';

// Helper: Get auth token
function getAuthToken() {
    return localStorage.getItem('token');
}

// Helper: Get current user
function getCurrentUser() {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
}

// Helper: Check if logged in
function isLoggedIn() {
    return !!getAuthToken();
}

// Helper: Make API calls
async function apiCall(endpoint, options = {}) {
    const token = getAuthToken();
    
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` })
        }
    };

    const finalOptions = {
        ...defaultOptions,
        ...options,
        headers: {
            ...defaultOptions.headers,
            ...options.headers
        }
    };

    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, finalOptions);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Something went wrong');
        }

        return data;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

// Format date helper
function formatDate(dateString) {
    const date = new Date(dateString);
    const options = { month: 'short', day: '2-digit', year: 'numeric' };
    return date.toLocaleDateString('en-US', options);
}

// Initialize page
document.addEventListener('DOMContentLoaded', function() {
    loadBlogs('all');
});

// Load blogs from backend
async function loadBlogs(filter = 'all') {
    try {
        let endpoint = '/blogs';
        
        if (filter === 'trending') {
            endpoint = '/blogs/trending';
        } else if (filter === 'recent') {
            endpoint = '/blogs';
        }

        const data = await apiCall(endpoint);
        
        // CRITICAL FIX: Extract blogs array from response
        if (data && data.blogs && Array.isArray(data.blogs)) {
            allBlogs = data.blogs;
        } else if (Array.isArray(data)) {
            allBlogs = data;
        } else {
            allBlogs = [];
        }
        
        console.log('Loaded blogs:', allBlogs); // Debug log
        
        currentFilter = filter;
        renderBlogs();
    } catch (error) {
        console.error('Error loading blogs:', error);
        document.getElementById('blogGrid').innerHTML = 
            '<p style="text-align: center; padding: 2rem; color: #6b7280;">Error loading blogs. Please make sure your backend is running.</p>';
    }
}

// Filter blogs
function filterBlogs(filter) {
    // Update active button
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.closest('.filter-btn').classList.add('active');
    
    loadBlogs(filter);
}

// Render all blog cards
function renderBlogs() {
    const blogGrid = document.getElementById('blogGrid');
    
    if (!blogGrid) {
        console.error('blogGrid element not found!');
        return;
    }
    
    blogGrid.innerHTML = '';
    
    if (!allBlogs || allBlogs.length === 0) {
        blogGrid.innerHTML = '<p style="text-align: center; padding: 2rem; color: #6b7280;">No blogs available yet.</p>';
        return;
    }
    
    allBlogs.forEach(blog => {
        const card = createBlogCard(blog);
        blogGrid.appendChild(card);
    });
}

// Create a blog card
function createBlogCard(blog) {
    const article = document.createElement('article');
    article.className = 'blog-card';
    article.onclick = () => openModal(blog);
    
    // Map categories to images
    const categoryImages = {
        'Technology': 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200&h=800&fit=crop',
        'Business': 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=1200&h=800&fit=crop',
        'Sustainability': 'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?w=1200&h=800&fit=crop',
        'EdTech': 'https://images.unsplash.com/photo-1501504905252-473c47e087f8?w=1200&h=800&fit=crop',
        'Food Tech': 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1200&h=800&fit=crop',
        'Transportation': 'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=1200&h=800&fit=crop',
        'Mental Health': 'https://images.unsplash.com/photo-1499209974431-9dddcece7f88?w=1200&h=800&fit=crop',
        'default': 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=1200&h=800&fit=crop'
    };
    
    const imageUrl = blog.image || categoryImages[blog.category] || categoryImages['default'];
    const authorName = blog.author?.name || 'Anonymous';
    const authorStartup = blog.author?.startup || blog.author?.university || 'Founder';
    const likesCount = blog.likesCount || 0;
    const commentsCount = blog.commentsCount || 0;
    const date = formatDate(blog.createdAt);
    const isTrending = currentFilter === 'trending' || blog.trending;
    
    article.innerHTML = `
        <div class="blog-image-wrapper">
            <img src="${imageUrl}" alt="${blog.title}" class="blog-image">
            <div class="blog-badge">${blog.category || 'General'}</div>
            <div class="blog-date-badge">${date}</div>
            ${isTrending ? '<div class="trending-badge">Trending</div>' : ''}
        </div>
        <div class="blog-content">
            <h2 class="blog-title">${blog.title}</h2>
            <p class="blog-excerpt">${blog.excerpt}</p>
            <div class="blog-author">
                <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=${authorName}" alt="${authorName}" class="author-avatar">
                <div>
                    <div class="author-name">${authorName}</div>
                    <div class="author-startup">${authorStartup}</div>
                </div>
            </div>
            <div class="blog-stats">
                <div class="stat">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                    </svg>
                    ${likesCount}
                </div>
                <div class="stat">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
                    </svg>
                    ${commentsCount}
                </div>
            </div>
        </div>
    `;
    
    return article;
}

// Open blog modal
async function openModal(blog) {
    currentBlog = blog;
    
    const categoryImages = {
        'Technology': 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200&h=800&fit=crop',
        'Business': 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=1200&h=800&fit=crop',
        'Sustainability': 'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?w=1200&h=800&fit=crop',
        'EdTech': 'https://images.unsplash.com/photo-1501504905252-473c47e087f8?w=1200&h=800&fit=crop',
        'Food Tech': 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1200&h=800&fit=crop',
        'Transportation': 'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=1200&h=800&fit=crop',
        'Mental Health': 'https://images.unsplash.com/photo-1499209974431-9dddcece7f88?w=1200&h=800&fit=crop',
        'default': 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=1200&h=800&fit=crop'
    };
    
    const imageUrl = blog.image || categoryImages[blog.category] || categoryImages['default'];
    const authorName = blog.author?.name || 'Anonymous';
    
    // FIX: Use likesCount directly, not likes.length
    const likesCount = blog.likesCount || 0;
    const commentsCount = blog.commentsCount || 0;
    
    const modal = document.getElementById('blogModal');
    document.getElementById('modalImage').src = imageUrl;
    document.getElementById('modalTitle').textContent = blog.title;
    document.getElementById('modalFounderImage').src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${authorName}`;
    document.getElementById('modalFounderName').textContent = authorName;
    document.getElementById('modalFounderDetails').textContent = blog.author?.startup || blog.author?.university || 'Founder';
    document.getElementById('modalContent').textContent = blog.content;
    document.getElementById('modalLikes').textContent = likesCount;
    document.getElementById('modalComments').textContent = commentsCount;
    
    // Load comments
    await loadComments(blog._id);
    
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

// Close modal
function closeModal() {
    const modal = document.getElementById('blogModal');
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
    currentBlog = null;
}

// Toggle like on blog
async function toggleLike(blogId) {
    if (!isLoggedIn()) {
        alert('Please login to like this blog.');
        window.location.href = 'login.html';
        return;
    }
    
    try {
        const data = await apiCall(`/blogs/${blogId}/like`, {
            method: 'POST'
        });
        
        // Update the like count in the modal
        if (currentBlog && currentBlog._id === blogId) {
            // Make sure likesCount is never negative
            const likesCount = Math.max(0, data.likesCount || 0);
            document.getElementById('modalLikes').textContent = likesCount;
            currentBlog.likesCount = likesCount;
            
            // Update the isLiked state
            currentBlog.isLiked = data.isLiked;
        }
        
        // Reload blogs to update the card view
        await loadBlogs(currentFilter);
        
    } catch (error) {
        console.error('Error toggling like:', error);
        alert('Error updating like. Please try again.');
    }
}
// Load comments
async function loadComments(blogId) {
    try {
        const data = await apiCall(`/blogs/${blogId}/comments`);
        const comments = data.comments || data || [];
        const commentsList = document.querySelector('.comments-list');
        
        commentsList.innerHTML = '';
        
        if (comments.length === 0) {
            commentsList.innerHTML = '<p style="color: #6b7280; text-align: center;">No comments yet. Be the first to comment!</p>';
            return;
        }
        
        comments.forEach(comment => {
            const commentDiv = document.createElement('div');
            commentDiv.className = 'comment-item';
            const authorName = comment.author?.name || 'Anonymous';
            const timeAgo = getTimeAgo(comment.createdAt);
            
            commentDiv.innerHTML = `
                <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=${authorName}" alt="${authorName}" class="comment-avatar">
                <div>
                    <h4 class="comment-author">${authorName}</h4>
                    <p class="comment-text">${comment.text}</p>
                    <p class="comment-time">${timeAgo}</p>
                </div>
            `;
            commentsList.appendChild(commentDiv);
        });
    } catch (error) {
        console.error('Error loading comments:', error);
    }
}

// Add comment
async function addComment() {
    if (!isLoggedIn()) {
        alert('Please login to comment.');
        window.location.href = 'login.html';
        return;
    }
    
    const input = document.getElementById('commentInput');
    const text = input.value.trim();
    
    if (!text) {
        alert('Please enter a comment.');
        return;
    }
    
    if (!currentBlog) return;
    
    try {
        await apiCall(`/blogs/${currentBlog._id}/comments`, {
            method: 'POST',
            body: JSON.stringify({ text })
        });
        
        input.value = '';
        await loadComments(currentBlog._id);
        
        const newCount = parseInt(document.getElementById('modalComments').textContent) + 1;
        document.getElementById('modalComments').textContent = newCount;
        
        await loadBlogs(currentFilter);
    } catch (error) {
        console.error('Error adding comment:', error);
        alert('Error adding comment. Please try again.');
    }
}

// Get time ago helper
function getTimeAgo(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);
    
    const intervals = {
        year: 31536000,
        month: 2592000,
        week: 604800,
        day: 86400,
        hour: 3600,
        minute: 60
    };
    
    for (const [unit, secondsInUnit] of Object.entries(intervals)) {
        const interval = Math.floor(seconds / secondsInUnit);
        if (interval >= 1) {
            return `${interval} ${unit}${interval > 1 ? 's' : ''} ago`;
        }
    }
    
    return 'Just now';
}

// Close modal on Escape key
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeModal();
    }
});