import express from 'express';
import Comment from '../models/comment.js';
import Post from '../models/post.js';
import { toUpperCase, z } from 'zod';
import post from '../models/post.js';

const router = express.Router();

// Zod schema for comment validation
const createCommentSchema = z.object({
    post: z.string().min(1, "Post ID is required"),
    user: z.string().min(1, "User ID is required"), // Add this field
    content: z.string().min(1, "Comment content is required").max(1000, "Comment must be less than 1000 characters"),
    parentComment: z.string().optional(), // For nested comments
    link: z.string().url("Link must be a valid URL").optional().or(z.literal(""))
});

// Zod schema for like/dislike validation
const reactionSchema = z.object({
    commentId: z.string().min(1, "Comment ID is required")
});

// 1. Create Comment
router.post('/:postId', async (req, res) => {
    try {
        const { postId } = req.params;
        const { content, link, user } = req.body;

        //find the post by postId
        const post = await Post.findById(postId);
        if (!post) {
            return res.status(404).json({
                error: 'Post not found',
                message: 'No post found with the provided ID'
            });
        }
        //craete a new comment object
        const newComment = new Comment({
            post: postId,
            user: user,
            constituency: post.constituency,
            parentComment: null,
            content: content,
            link: link,
            like: [],
            dislike: [],
            replyCount: 0
        })

        //save the comment
        const savedComment = await newComment.save();

        //add the comment to the post
        await Post.findByIdAndUpdate(postId, { $inc: { commentCount: 1 },$push: { comments: savedComment._id } });        
        const populatedComment = await Comment.findById(savedComment._id)
            .populate('user', 'name')
            .populate('constituency', 'area_name')
            .populate('parentComment', 'content user');

        res.status(201).json({
            message: 'Comment created successfully',
            comment: populatedComment
        });
    }
    catch (error) {
        console.error('Error creating comment:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to create comment',
            details: error.message
        });
    }
});

// 2. Create Comment within a Comment (Nested Comment)
router.post('/reply/:commentId', async (req, res) => {
    try {
        const { commentId } = req.params;
        const { content, link, user } = req.body; // Add user to destructuring

        // Validate comment ID
        if (!commentId || commentId.length !== 24) {
            return res.status(400).json({
                error: 'Invalid comment ID',
                message: 'Comment ID must be a valid MongoDB ObjectId'
            });
        }

        // Validate content
        if (!content || content.trim().length === 0) {
            return res.status(400).json({
                error: 'Content required',
                message: 'Comment content is required'
            });
        }

        if (content.length > 1000) {
            return res.status(400).json({
                error: 'Content too long',
                message: 'Comment must be less than 1000 characters'
            });
        }

        // Check if parent comment exists
        const parentComment = await Comment.findById(commentId);
        if (!parentComment) {
            return res.status(404).json({
                error: 'Parent comment not found',
                message: 'No comment found with the provided ID'
            });
        }

        // Create nested comment
        const newReply = new Comment({
            post: parentComment.post,
            user: user, // Use the user from request body
            constituency: parentComment.constituency,
            parentComment: commentId,
            content: content.trim(),
            link: link || null,
            like: [], // Use like array as per your schema
            dislike: [], // Use dislike array as per your schema
            replyCount: 0
        });

        const savedReply = await newReply.save();

        // Update parent comment's reply count AND add reply to replies array
        await Comment.findByIdAndUpdate(
            commentId,
            {
                $inc: { replyCount: 1 },
                $push: { replies: savedReply._id } // Add this line to push reply ID to array
            }
        );

        // Update post's comment count AND add comment to comments array


        // Populate reply with user details
        const populatedReply = await Comment.findById(savedReply._id)
            .populate('user', 'name')
            .populate('constituency', 'area_name')
            .populate('parentComment', 'content user');

        res.status(201).json({
            message: 'Reply created successfully',
            reply: populatedReply
        });

    } catch (error) {
        console.error('Error creating reply:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to create reply',
            details: error.message
        });
    }
});

// 3. Like a Comment
router.post('/like/:commentId', async (req, res) => {
    try {
        const { commentId } = req.params;
        const userId = req.body.userId;

        if (!userId) {
            return res.status(400).json({
                error: 'User ID required',
                message: 'User ID is required to like a comment'
            });
        }

        // Validate comment ID
        if (!commentId || commentId.length !== 24) {
            return res.status(400).json({
                error: 'Invalid comment ID',
                message: 'Comment ID must be a valid MongoDB ObjectId'
            });
        }

        // Check if comment exists
        const comment = await Comment.findById(commentId);
        if (!comment) {
            return res.status(404).json({
                error: 'Comment not found',
                message: 'No comment found with the provided ID'
            });
        }

        // Check if user already liked the comment
        const existingLike = comment.like.find(like => like.toString() === userId);
        if (existingLike) {
            return res.status(400).json({
                error: 'Already liked',
                message: 'User has already liked this comment'
            });
        }

        // Check if user disliked the comment and remove dislike
        const existingDislike = comment.dislike.find(dislike => dislike.toString() === userId);
        if (existingDislike) {
            comment.dislike = comment.dislike.filter(dislike => dislike.toString() !== userId);
            comment.dislikeCount = Math.max(0, comment.dislikeCount - 1);
        }

        // Add like
        comment.like.push(userId);
        comment.likeCount = comment.like.length;

        await comment.save();

        res.status(200).json({
            message: 'Comment liked successfully',
            likeCount: comment.likeCount,
            dislikeCount: comment.dislikeCount
        });

    } catch (error) {
        console.error('Error liking comment:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to like comment',
            details: error.message
        });
    }
});

// 4. Dislike a Comment
router.post('/dislike/:commentId', async (req, res) => {
    try {
        const { commentId } = req.params;
        const userId = req.body.userId;

        if (!userId) {
            return res.status(400).json({
                error: 'User ID required',
                message: 'User ID is required to dislike a comment'
            });
        }

        // Validate comment ID
        if (!commentId || commentId.length !== 24) {
            return res.status(400).json({
                error: 'Invalid comment ID',
                message: 'Comment ID must be a valid MongoDB ObjectId'
            });
        }

        // Check if comment exists
        const comment = await Comment.findById(commentId);
        if (!comment) {
            return res.status(404).json({
                error: 'Comment not found',
                message: 'No comment found with the provided ID'
            });
        }

        // Check if user already disliked the comment
        const existingDislike = comment.dislike.find(dislike => dislike.toString() === userId);
        if (existingDislike) {
            return res.status(400).json({
                error: 'Already disliked',
                message: 'User has already disliked this comment'
            });
        }

        // Check if user liked the comment and remove like
        const existingLike = comment.like.find(like => like.toString() === userId);
        if (existingLike) {
            comment.like = comment.like.filter(like => like.toString() !== userId);
            comment.likeCount = Math.max(0, comment.likeCount - 1);
        }

        // Add dislike
        comment.dislike.push(userId);
        comment.dislikeCount = comment.dislike.length;

        await comment.save();

        res.status(200).json({
            message: 'Comment disliked successfully',
            likeCount: comment.likeCount,
            dislikeCount: comment.dislikeCount
        });

    } catch (error) {
        console.error('Error disliking comment:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to dislike comment',
            details: error.message
        });
    }
});

// Additional utility endpoints

// Get comment by ID with replies
router.get('/:commentId', async (req, res) => {
    try {
        const { commentId } = req.params;

        // Validate comment ID
        if (!commentId || commentId.length !== 24) {
            return res.status(400).json({
                error: 'Invalid comment ID',
                message: 'Comment ID must be a valid MongoDB ObjectId'
            });
        }

        // Get comment with replies
        const comment = await Comment.findById(commentId)
            .populate('user', 'name')
            .populate('constituency', 'area_name')
            .populate('parentComment', 'content user')
            .populate({
                path: 'replies',
                populate: {
                    path: 'user',
                    select: 'name'
                },
                options: { sort: { createdAt: 1 } }
            });

        if (!comment) {
            return res.status(404).json({
                error: 'Comment not found',
                message: 'No comment found with the provided ID'
            });
        }

        res.status(200).json({
            message: 'Comment retrieved successfully',
            comment
        });

    } catch (error) {
        console.error('Error fetching comment:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to fetch comment',
            details: error.message
        });
    }
});

// Get all replies for a comment
router.get('/:commentId/replies', async (req, res) => {
    try {
        const { commentId } = req.params;
        const { page = 1, limit = 10 } = req.query;

        // Validate comment ID
        if (!commentId || commentId.length !== 24) {
            return res.status(400).json({
                error: 'Invalid comment ID',
                message: 'Comment ID must be a valid MongoDB ObjectId'
            });
        }

        // Check if comment exists
        const comment = await Comment.findById(commentId);
        if (!comment) {
            return res.status(404).json({
                error: 'Comment not found',
                message: 'No comment found with the provided ID'
            });
        }

        // Calculate pagination
        const skip = (parseInt(page) - 1) * parseInt(limit);

        // Get replies with pagination
        const replies = await Comment.find({ parentComment: commentId })
            .populate('user', 'name')
            .populate('constituency', 'area_name')
            .sort({ createdAt: 1 })
            .skip(skip)
            .limit(parseInt(limit));

        // Get total count for pagination
        const totalReplies = await Comment.countDocuments({ parentComment: commentId });

        // Calculate pagination metadata
        const totalPages = Math.ceil(totalReplies / parseInt(limit));
        const hasNextPage = page < totalPages;
        const hasPrevPage = page > 1;

        res.status(200).json({
            message: 'Replies retrieved successfully',
            data: {
                replies,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages,
                    totalReplies,
                    hasNextPage,
                    hasPrevPage,
                    limit: parseInt(limit)
                }
            }
        });

    } catch (error) {
        console.error('Error fetching replies:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to fetch replies',
            details: error.message
        });
    }
});

// Remove like/dislike from comment
router.delete('/:commentId/reaction', async (req, res) => {
    try {
        const { commentId } = req.params;
        const { userId, reactionType } = req.body;

        if (!userId || !reactionType) {
            return res.status(400).json({
                error: 'Missing parameters',
                message: 'User ID and reaction type are required'
            });
        }

        if (!['like', 'dislike'].includes(reactionType)) {
            return res.status(400).json({
                error: 'Invalid reaction type',
                message: 'Reaction type must be either "like" or "dislike"'
            });
        }

        // Validate comment ID
        if (!commentId || commentId.length !== 24) {
            return res.status(400).json({
                error: 'Invalid comment ID',
                message: 'Comment ID must be a valid MongoDB ObjectId'
            });
        }

        // Check if comment exists
        const comment = await Comment.findById(commentId);
        if (!comment) {
            return res.status(404).json({
                error: 'Comment not found',
                message: 'No comment found with the provided ID'
            });
        }

        // Remove reaction
        if (reactionType === 'like') {
            comment.like = comment.like.filter(like => like.toString() !== userId);
            comment.likeCount = Math.max(0, comment.like.length);
        } else {
            comment.dislike = comment.dislike.filter(dislike => dislike.toString() !== userId);
            comment.dislikeCount = Math.max(0, comment.dislike.length);
        }

        await comment.save();

        res.status(200).json({
            message: `${reactionType} removed successfully`,
            likeCount: comment.likeCount,
            dislikeCount: comment.dislikeCount
        });

    } catch (error) {
        console.error('Error removing reaction:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to remove reaction',
            details: error.message
        });
    }
});

router.delete('/:commentId', async (req, res) => {
    try {
        const { commentId } = req.params;
        const comment = await Comment.findById(commentId)
        if (!comment) {
            return res.status(404).json({
                error: 'Comment not found',
                message: 'No comment found with the provided ID'
            });
        }
        await comment.deleteOne();
        res.status(200).json({
            message: 'Comment deleted successfully'
        });
    }
    catch (error) {
        console.error('Error deleting comment:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to delete comment',
            details: error.message
        });
    }
});



export default router;
