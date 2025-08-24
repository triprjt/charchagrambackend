import express from 'express';
import Post from '../models/post.js';
import Comment from '../models/comment.js';
import { z } from 'zod';
// import Constituency from '../models/constituency.js'; // Add this import

const router = express.Router();

// Zod schema for post validation
const createPostSchema = z.object({
    title: z.string().optional(),
    description: z.string().optional(),
    content: z.string().min(1, "Content is required"),
    author: z.string().min(1, "Author ID is required"),
    constituency: z.string().min(1, "Constituency ID is required"),
    category: z.string().optional(),
    tags: z.array(z.string()).optional(), // This is already correct
    link: z.string().optional().or(z.literal("")),
});

// 1. Create Post
router.post('/', async (req, res) => {
    try {
        // Validate request body
        const validationResult = createPostSchema.safeParse(req.body);
        if (!validationResult.success) {
            console.log('validationResult ', validationResult);
            return res.status(400).json({
                error: 'Validation failed',
                message: 'Invalid input data',
                details: validationResult.error.errors.map(err => ({
                    field: err.path.join('.'),
                    message: err.message
                }))
            });
        }

        const validatedData = validationResult.data;
        console.log('validatedData ', validatedData);
        // Create new post
        const newPost = new Post({
            ...validatedData,
            category: validatedData.category,
            author: validatedData.author, // Assuming you have user authentication
            commentCount: 0,
            constituency: validatedData.constituency,
            likeCount: 0,
            dislikeCount: 0,
            views: 0
        });

        const savedPost = await newPost.save();
        // console.log('savedPost.constituency (raw):', savedPost.constituency);

        // Populate author and constituency details
        const checkPost = await Post.findById(savedPost._id);
        console.log('checkPost ', checkPost);
        const populatedPost = await Post.findById(savedPost._id)
            .populate('author', 'name')
            .populate('category', 'name')
            .populate('comments', 'content')
            .populate('constituency', 'area_name');
        console.log('populatedPost after populate:', populatedPost);
        const postWithConstituency = await Post.findById(savedPost._id)
            .populate('constituency', 'area_name');
        console.log('Post with only constituency populated:', postWithConstituency.constituency);


        res.status(201).json({
            message: 'Post created successfully',
            post: populatedPost
        });

    } catch (error) {
        console.error('Error creating post:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to create post',
            details: error.message
        });
    }
});

// 2. Get All Posts by Constituency
router.get('/constituency/:constituencyId', async (req, res) => {
    try {
        const { constituencyId } = req.params;
        const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

        // Validate constituency ID
        if (!constituencyId || constituencyId.length !== 24) {
            return res.status(400).json({
                error: 'Invalid constituency ID',
                message: 'Constituency ID must be a valid MongoDB ObjectId'
            });
        }

        // Build sort object
        const sortOptions = {};
        sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

        // Calculate pagination
        const skip = (parseInt(page) - 1) * parseInt(limit);

        // Get posts with pagination and sorting        
        const posts = await Post.find({ constituency: constituencyId })
            .populate('author', 'name')
            .populate('constituency', 'area_name')
            .populate('category', 'name')
            .populate({ // Added this block to populate comments
                path: 'comments',
                populate: {
                    path: 'user',
                    select: 'name'
                },
                select: 'content user createdAt', // Select content and user (name)
                options: { sort: { createdAt: -1 } } // Sort comments by creation date
            })
            .sort(sortOptions)
            .skip(skip)
            .limit(parseInt(limit));

        // Get total count for pagination
        const totalPosts = await Post.countDocuments({ constituency: constituencyId });

        // Calculate pagination metadata
        const totalPages = Math.ceil(totalPosts / parseInt(limit));
        const hasNextPage = page < totalPages;
        const hasPrevPage = page > 1;

        res.status(200).json({
            message: 'Posts retrieved successfully',
            data: {
                posts,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages,
                    totalPosts,
                    hasNextPage,
                    hasPrevPage,
                    limit: parseInt(limit)
                }
            }
        });

    } catch (error) {
        console.error('Error fetching posts by constituency:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to fetch posts by constituency',
            details: error.message
        });
    }
});

// 3. Get All Posts
router.get('/', async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            sortBy = 'createdAt',
            sortOrder = 'desc'
        } = req.query;

        // Build sort object
        const sortOptions = {};
        sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

        // Calculate pagination
        const skip = (parseInt(page) - 1) * parseInt(limit);

        // Get posts with pagination and sorting
        const posts = await Post.find({})
            .populate('author', 'name')
            .populate('constituency', 'area_name')
            .populate('category', 'name')
            .populate({ // Added this block to populate comments
                path: 'comments',
                populate: {
                    path: 'user',
                    select: 'name'
                },
                select: 'content user createdAt', // Select content and user (name)
                options: { sort: { createdAt: -1 } } // Sort comments by creation date
            })
            .sort(sortOptions)
            .skip(skip)
            .limit(parseInt(limit));

        // Get total count for pagination
        const totalPosts = await Post.countDocuments({});

        // Calculate pagination metadata
        const totalPages = Math.ceil(totalPosts / parseInt(limit));
        const hasNextPage = page < totalPages;
        const hasPrevPage = page > 1;

        res.status(200).json({
            message: 'Posts retrieved successfully',
            data: {
                posts,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages,
                    totalPosts,
                    hasNextPage,
                    hasPrevPage,
                    limit: parseInt(limit)
                }
            }
        });

    } catch (error) {
        console.error('Error fetching all posts:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to fetch posts',
            details: error.message
        });
    }
});

// 4. Get Post by ID
router.get('/:postId', async (req, res) => {
    try {
        const { postId } = req.params;

        // Validate post ID
        if (!postId || postId.length !== 24) {
            return res.status(400).json({
                error: 'Invalid post ID',
                message: 'Post ID must be a valid MongoDB ObjectId'
            });
        }

        // Get post with all related data
        const post = await Post.findById(postId)
            .populate('author', 'name email')
            .populate('constituency', 'area_name vidhayak_info')
            .populate('category', 'name')
            .populate({
                path: 'comments',
                populate: {
                    path: 'user',
                    select: 'name'
                },
                options: { sort: { createdAt: -1 } }
            });

        if (!post) {
            return res.status(404).json({
                error: 'Post not found',
                message: 'No post found with the provided ID'
            });
        }

        // Increment view count
        post.views += 1;
        await post.save();

        res.status(200).json({
            message: 'Post retrieved successfully',
            post
        });

    } catch (error) {
        console.error('Error fetching post by ID:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to fetch post',
            details: error.message
        });
    }
});

// 5. Get Posts in Sorted Order
router.get('/sorted/:sortBy', async (req, res) => {
    try {
        const { sortBy } = req.params;
        const { page = 1, limit = 10, sortOrder = 'desc', constituency } = req.query;

        // Validate sortBy parameter
        const validSortFields = ['createdAt', 'views', 'commentCount', 'likeCount', 'dislikeCount'];
        if (!validSortFields.includes(sortBy)) {
            return res.status(400).json({
                error: 'Invalid sort field',
                message: `Sort field must be one of: ${validSortFields.join(', ')}`,
                validSortFields
            });
        }

        // Build filter object
        const filter = { status: 'published' };
        if (constituency) {
            filter.constituency = constituency;
        }

        // Build sort object
        const sortOptions = {};
        sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

        // Calculate pagination
        const skip = (parseInt(page) - 1) * parseInt(limit);

        // Get posts with pagination and sorting
        const posts = await Post.find(filter)
            .populate('author', 'name')
            .populate('constituency', 'area_name')
            .populate('category', 'name')
            .sort(sortOptions)
            .skip(skip)
            .limit(parseInt(limit));

        // Get total count for pagination
        const totalPosts = await Post.countDocuments(filter);

        // Calculate pagination metadata
        const totalPages = Math.ceil(totalPosts / parseInt(limit));
        const hasNextPage = page < totalPages;
        const hasPrevPage = page > 1;

        res.status(200).json({
            message: `Posts sorted by ${sortBy} retrieved successfully`,
            data: {
                posts,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages,
                    totalPosts,
                    hasNextPage,
                    hasPrevPage,
                    limit: parseInt(limit)
                },
                sorting: {
                    sortBy,
                    sortOrder,
                    constituency: constituency || 'all'
                }
            }
        });

    } catch (error) {
        console.error('Error fetching sorted posts:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to fetch sorted posts',
            details: error.message
        });
    }
});

// Additional utility endpoints

// Get post statistics
router.get('/stats/overview', async (req, res) => {
    try {
        const stats = await Post.aggregate([
            {
                $group: {
                    _id: null,
                    totalPosts: { $sum: 1 },
                    totalViews: { $sum: '$views' },
                    totalComments: { $sum: '$commentCount' },
                    totalLikes: { $sum: '$likeCount' },
                    totalDislikes: { $sum: '$dislikeCount' },
                    avgViews: { $avg: '$views' },
                    avgComments: { $avg: '$commentCount' }
                }
            }
        ]);

        const constituencyStats = await Post.aggregate([
            {
                $group: {
                    _id: '$constituency',
                    postCount: { $sum: 1 },
                    totalViews: { $sum: '$views' }
                }
            },
            {
                $sort: { postCount: -1 }
            },
            {
                $limit: 10
            }
        ]);

        res.status(200).json({
            message: 'Post statistics retrieved successfully',
            stats: stats[0] || {},
            topConstituencies: constituencyStats
        });

    } catch (error) {
        console.error('Error fetching post statistics:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to fetch post statistics',
            details: error.message
        });
    }
});

// Search posts
router.get('/search/:query', async (req, res) => {
    try {
        const { query } = req.params;
        const { page = 1, limit = 10 } = req.query;

        if (!query || query.trim().length < 2) {
            return res.status(400).json({
                error: 'Invalid search query',
                message: 'Search query must be at least 2 characters long'
            });
        }

        const searchRegex = { $regex: query, $options: 'i' };
        const filter = {
            $or: [
                { title: searchRegex },
                { description: searchRegex },
                { content: searchRegex }
            ],
            status: 'published'
        };

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const posts = await Post.find(filter)
            .populate('author', 'name')
            .populate('constituency', 'area_name')
            .populate('category', 'name')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const totalPosts = await Post.countDocuments(filter);
        const totalPages = Math.ceil(totalPosts / parseInt(limit));

        res.status(200).json({
            message: 'Search completed successfully',
            data: {
                posts,
                query,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages,
                    totalPosts,
                    limit: parseInt(limit)
                }
            }
        });

    } catch (error) {
        console.error('Error searching posts:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to search posts',
            details: error.message
        });
    }
});

router.delete('/:postId', async (req, res) => {
    try {
        const { postId } = req.params;
        const postObject = await Post.findById(postId)
        if (!postObject) {
            return res.status(404).json({
                error: 'Post not found',
                message: 'No post found with the provided ID'
            });
        }
        await postObject.deleteOne();
        res.status(200).json({
            message: 'Post deleted successfully'
        });
    }
    catch (error) {
        console.error('Error deleting post:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to delete post',
            details: error.message
        });
    }
});

export default router;
