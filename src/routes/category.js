import express from 'express';
import Category from '../models/category.js';
import { z } from 'zod';

const router = express.Router();

// Zod schema for category validation
const createCategorySchema = z.object({
  name: z.string().min(1, "Category name is required").max(50, "Category name must be less than 50 characters"),
});

// 1. Create Category
router.post('/', async (req, res) => {
  try {
    // Validate request body
    const validationResult = createCategorySchema.safeParse(req.body);
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

    // Check if category already exists
    const existingCategory = await Category.findOne({ name: validatedData.name.toLowerCase() });
    if (existingCategory) {
      return res.status(409).json({
        error: 'Category already exists',
        message: 'A category with this name already exists'
      });
    }

    // Create new category
    const newCategory = new Category({
      ...validatedData,
      name: validatedData.name.toLowerCase()
    });

    const savedCategory = await newCategory.save();

    res.status(201).json({
      message: 'Category created successfully',
      category: savedCategory // Changed to category
    });

  } catch (error) {
    console.error('Error creating Category:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to create Category',
      details: error.message
    });
  }
});

router.post('/bulk', async (req, res) => {
  try {
    const { categories } = req.body;
    console.log('categories ', req.body);
    const createdCategories = await Category.insertMany(categories);
    res.status(201).json({
      message: 'Categories created successfully',
      categories: createdCategories
    });
  } catch (error) {
    console.error('Error creating categories:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to create categories',
      details: error.message
    });
  }
});
// 2. Get All Categories
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get categories with pagination
    const categories = await Category.find({}) // Corrected: Use find instead of findAll
      .sort({ name: 1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count
    const totalCategories = await Category.countDocuments({}); // Corrected: Use countDocuments

    // Calculate pagination metadata
    const totalPages = Math.ceil(totalCategories / parseInt(limit));

    res.status(200).json({
      message: 'Categories retrieved successfully',
      data: {
        categories, // Changed to categories
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalCategories, // Changed to totalCategories
          limit: parseInt(limit)
        }
      }
    });

  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch categories',
      details: error.message
    });
  }
});

// 3. Get Category by ID
router.get('/:categoryId', async (req, res) => {
  try {
    const { categoryId } = req.params;

    // Validate category ID
    if (!categoryId || categoryId.length !== 24) {
      return res.status(400).json({
        error: 'Invalid category ID',
        message: 'Category ID must be a valid MongoDB ObjectId'
      });
    }

    const category = await Category.findById(categoryId);
    if (!category) {
      return res.status(404).json({
        error: 'Category not found',
        message: 'No category found with the provided ID'
      });
    }

    res.status(200).json({
      message: 'Category retrieved successfully',
      category // Changed to category
    });

  } catch (error) {
    console.error('Error fetching category:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch category',
      details: error.message
    });
  }
});

// 4. Update Category
router.put('/:categoryId', async (req, res) => {
  try {
    const { categoryId } = req.params;

    // Validate category ID
    if (!categoryId || categoryId.length !== 24) {
      return res.status(400).json({
        error: 'Invalid category ID',
        message: 'Category ID must be a valid MongoDB ObjectId'
      });
    }

    // Validate request body
    const validationResult = createCategorySchema.partial().safeParse(req.body);
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

    // Check if category exists
    const existingCategory = await Category.findById(categoryId);
    if (!existingCategory) {
      return res.status(404).json({
        error: 'Category not found',
        message: 'No category found with the provided ID'
      });
    }

    // Check if new name conflicts with existing category
    if (validatedData.name) {
      const nameConflict = await Category.findOne({ 
        name: validatedData.name.toLowerCase(),
        _id: { $ne: categoryId }
      });
      if (nameConflict) {
        return res.status(409).json({
          error: 'Category name conflict',
          message: 'A category with this name already exists'
        });
      }
      validatedData.name = validatedData.name.toLowerCase();
    }

    // Update category
    const updatedCategory = await Category.findByIdAndUpdate(
      categoryId,
      { ...validatedData, updatedAt: new Date() },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      message: 'Category updated successfully',
      category: updatedCategory // Changed to category
    });

  } catch (error) {
    console.error('Error updating category:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to update category',
      details: error.message
    });
  }
});

// 5. Delete Category
router.delete('/:categoryId', async (req, res) => {
  try {
    const { categoryId } = req.params;

    // Validate category ID
    if (!categoryId || categoryId.length !== 24) {
      return res.status(400).json({
        error: 'Invalid category ID',
        message: 'Category ID must be a valid MongoDB ObjectId'
      });
    }

    // Check if category exists
    const existingCategory = await Category.findById(categoryId);
    if (!existingCategory) {
      return res.status(404).json({
        error: 'Category not found',
        message: 'No category found with the provided ID'
      });
    }

    // Check if category is being used (assuming you have a usedCount field)
    if (existingCategory.usedCount > 0) {
      return res.status(400).json({
        error: 'Category in use',
        message: 'Cannot delete category that is currently being used',
        usedCount: existingCategory.usedCount
      });
    }

    // Delete category
    await Category.findByIdAndDelete(categoryId);

    res.status(200).json({
      message: 'Category deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to delete category',
      details: error.message
    });
  }
});

// 6. Get Popular Categories
router.get('/popular/top', async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const popularCategories = await Category.find({})
      .sort({ usedCount: -1, name: 1 })
      .limit(parseInt(limit))
      .select('name usedCount');

    res.status(200).json({
      message: 'Popular categories retrieved successfully',
      categories: popularCategories // Changed to categories
    });

  } catch (error) {
    console.error('Error fetching popular categories:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch popular categories',
      details: error.message
    });
  }
});

// 7. Search Categories
router.get('/search/:query', async (req, res) => {
  try {
    const { query } = req.params;
    const { limit = 20 } = req.query;

    if (!query || query.trim().length < 2) {
      return res.status(400).json({
        error: 'Invalid search query',
        message: 'Search query must be at least 2 characters long'
      });
    }

    const searchRegex = { $regex: query, $options: 'i' };
    const categories = await Category.find({
      $or: [
        { name: searchRegex },
        { description: searchRegex }
      ]
    })
    .sort({ name: 1 })
    .limit(parseInt(limit))
    .select('name description');

    res.status(200).json({
      message: 'Search completed successfully',
      query,
      categories // Changed to categories
    });

  } catch (error) {
    console.error('Error searching categories:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to search categories',
      details: error.message
    });
  }
});

export default router;
