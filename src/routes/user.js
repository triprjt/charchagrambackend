import express from 'express';
import User from '../models/user.js';
import { z } from 'zod';

const router = express.Router();

// Zod schema for user validation
const createUserSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name must be less than 100 characters"),
  phoneNumber: z.string().min(10, "Phone number must be at least 10 digits").max(15, "Phone number must be less than 15 digits"),
  constituency: z.string().optional(),
  email: z.string().optional()
});

const updateUserSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name must be less than 100 characters").optional(),
  constituency: z.string().optional(),
  email: z.string().optional()
});

// 1. Create User
router.post('/', async (req, res) => {
  try {
    // Validate request body
    const validationResult = createUserSchema.safeParse(req.body);
    if (!validationResult.success) {
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

    // Check if user with phone number already exists
    const existingUser = await User.findOne({ phoneNumber: validatedData.phoneNumber });
    if (existingUser) {
      return res.status(409).json({
        error: 'User already exists',
        message: 'A user with this phone number already exists'
      });
    }

    // Create new user
    const newUser = new User({
      ...validatedData,
      phoneNumber: validatedData.phoneNumber.trim()
    });

    const savedUser = await newUser.save();

    // Populate constituency details
    const populatedUser = await User.findById(savedUser._id)
      .populate('constituency', 'area_name');

    res.status(201).json({
      message: 'User created successfully',
      user: populatedUser
    });

  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to create user',
      details: error.message
    });
  }
});

// 2. Get User by Phone Number
router.get('/phone/:phoneNumber', async (req, res) => {
  try {
    const { phoneNumber } = req.params;

    if (!phoneNumber || phoneNumber.trim().length < 10) {
      return res.status(400).json({
        error: 'Invalid phone number',
        message: 'Phone number must be at least 10 digits'
      });
    }

    const user = await User.findOne({ phoneNumber: phoneNumber.trim() })
      .populate('constituency', 'area_name');

    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        message: 'No user found with the provided phone number'
      });
    }

    res.status(200).json({
      message: 'User retrieved successfully',
      user
    });

  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch user',
      details: error.message
    });
  }
});

// 3. Get User by ID
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    // Validate user ID
    if (!userId || userId.length !== 24) {
      return res.status(400).json({
        error: 'Invalid user ID',
        message: 'User ID must be a valid MongoDB ObjectId'
      });
    }

    const user = await User.findById(userId)
      .populate('constituency', 'area_name');

    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        message: 'No user found with the provided ID'
      });
    }

    res.status(200).json({
      message: 'User retrieved successfully',
      user
    });

  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch user',
      details: error.message
    });
  }
});

// 4. Update User
router.put('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    // Validate user ID
    if (!userId || userId.length !== 24) {
      return res.status(400).json({
        error: 'Invalid user ID',
        message: 'User ID must be a valid MongoDB ObjectId'
      });
    }

    // Validate request body
    const validationResult = updateUserSchema.safeParse(req.body);
    if (!validationResult.success) {
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

    // Check if user exists
    const existingUser = await User.findById(userId);
    if (!existingUser) {
      return res.status(404).json({
        error: 'User not found',
        message: 'No user found with the provided ID'
      });
    }

    // Update user
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { ...validatedData, updatedAt: new Date() },
      { new: true, runValidators: true }
    ).populate('constituency', 'area_name');

    res.status(200).json({
      message: 'User updated successfully',
      user: updatedUser
    });

  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to update user',
      details: error.message
    });
  }
});

// 5. Delete User
router.delete('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    // Validate user ID
    if (!userId || userId.length !== 24) {
      return res.status(400).json({
        error: 'Invalid user ID',
        message: 'User ID must be a valid MongoDB ObjectId'
      });
    }

    // Check if user exists
    const existingUser = await User.findById(userId);
    if (!existingUser) {
      return res.status(404).json({
        error: 'User not found',
        message: 'No user found with the provided ID'
      });
    }

    // Delete user
    await User.findByIdAndDelete(userId);

    res.status(200).json({
      message: 'User deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to delete user',
      details: error.message
    });
  }
});

// 6. Get All Users (with pagination)
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, constituency } = req.query;

    // Build filter
    const filter = {};
    if (constituency) {
      filter.constituency = constituency;
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get users with pagination
    const users = await User.find(filter)
      .populate('constituency', 'area_name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .select('-__v'); // Exclude version key

    // Get total count for pagination
    const totalUsers = await User.countDocuments(filter);

    // Calculate pagination metadata
    const totalPages = Math.ceil(totalUsers / parseInt(limit));
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    res.status(200).json({
      message: 'Users retrieved successfully',
      data: {
        users,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalUsers,
          hasNextPage,
          hasPrevPage,
          limit: parseInt(limit)
        }
      }
    });

  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch users',
      details: error.message
    });
  }
});

// 7. Get User by Phone Number (Alternative endpoint)
router.get('/search/phone/:phoneNumber', async (req, res) => {
  try {
    const { phoneNumber } = req.params;

    if (!phoneNumber || phoneNumber.trim().length < 10) {
      return res.status(400).json({
        error: 'Invalid phone number',
        message: 'Phone number must be at least 10 digits'
      });
    }

    const user = await User.findOne({ phoneNumber: phoneNumber.trim() })
      .populate('constituency', 'area_name')
      .select('-__v');

    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        message: 'No user found with the provided phone number'
      });
    }

    res.status(200).json({
      message: 'User found successfully',
      user
    });

  } catch (error) {
    console.error('Error searching user by phone:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to search user',
      details: error.message
    });
  }
});

export default router;