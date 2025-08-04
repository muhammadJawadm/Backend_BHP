const express = require('express');
const router = express.Router();
const Customer = require('../models/Customer');
const Seller = require('../models/seller');
const Store = require('../models/Store');
const Product = require('../models/Product');
const Order = require('../models/Order');
const mongoose = require('mongoose');

// Helper function to validate ObjectId
const isValidObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(id);
};

// ==================== CUSTOMER ROUTES ====================

// 1. Customer Signup
router.post('/customer/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const newCustomer = new Customer({ name, email, password });
    await newCustomer.save();

    res.status(201).send({ message: 'Customer registered successfully' });
  } catch (err) {
    res.status(500).send({ message: 'Error registering customer', error: err.message });
  }
});

// 2. Customer Login
router.post('/customer/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const customer = await Customer.findOne({ email, password });

    if (customer) {
      res.send({ message: 'Login successful', customer });
    } else {
      res.status(401).send({ message: 'Invalid credentials' });
    }
  } catch (err) {
    res.status(500).send({ message: 'Error during login', error: err.message });
  }
});

// ==================== SELLER ROUTES ====================

// 3. Seller Signup
router.post('/seller/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const newSeller = new Seller({ name, email, password });
    await newSeller.save();

    const { password: _, ...sellerWithoutPassword } = newSeller.toObject();

    res.status(201).send({
      message: 'Seller registered successfully',
      seller: sellerWithoutPassword
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).send({ message: 'Server error during signup', error: error.message });
  }
});

// 4. Seller Login
router.post('/seller/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const seller = await Seller.findOne({ email, password });

    if (seller) {
      res.send({ message: 'Login successful', seller });
    } else {
      res.status(401).send({ message: 'Invalid credentials' });
    }
  } catch (err) {
    res.status(500).send({ message: 'Error during login', error: err.message });
  }
});

// ==================== STORE ROUTES ====================

// 5. Store Info Save
router.post('/store', async (req, res) => {
  try {
    const { name, category, description, banner, logo, user_id } = req.body;

    // const userId = new mongoose.Types.ObjectId(user_id);
    // Check if the seller exists
    const seller = await Seller.findById(user_id);
    if (!seller) {
      return res.status(400).send({ message: 'Invalid seller ID' });
    }

    const newStore = new Store({
      name,
      category,
      description,
      banner,
      logo,
      user_id
    });

    await newStore.save();
    res.status(201).send({ message: 'Store saved successfully', store: newStore });
  } catch (err) {
    res.status(500).send({ message: 'Error saving store', error: err.message });
  }
});

// 6. Get All Stores
router.get('/stores', async (req, res) => {
  try {
    const stores = await Store.find({}).populate('user_id', 'name email');
    
    res.status(200).send({
      message: 'Stores retrieved successfully',
      count: stores.length,
      stores: stores
    });
  } catch (err) {
    res.status(500).send({
      message: 'Error retrieving stores',
      error: err.message
    });
  }
});

// 7. Get Store by ID
router.get('/stores/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const store = await Store.findById(id).populate('user_id', 'name email');
    
    if (!store) {
      return res.status(404).send({
        message: 'Store not found'
      });
    }
    
    res.status(200).send({
      message: 'Store retrieved successfully',
      store: store
    });
  } catch (err) {
    // Handle invalid ObjectId format
    if (err.name === 'CastError') {
      return res.status(400).send({
        message: 'Invalid store ID format'
      });
    }
    
    res.status(500).send({
      message: 'Error retrieving store',
      error: err.message
    });
  }
});

// 8. Get Stores by Seller ID
router.get('/stores/seller/:sellerId', async (req, res) => {
  try {
    const { sellerId } = req.params;
    
    const stores = await Store.find({ user_id: sellerId }).populate('user_id', 'name email');
    
    res.status(200).send({
      message: 'Seller stores retrieved successfully',
      count: stores.length,
      stores: stores
    });
  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(400).send({
        message: 'Invalid seller ID format'
      });
    }
    
    res.status(500).send({
      message: 'Error retrieving seller stores',
      error: err.message
    });
  }
});

// 9. Get Stores by Category
router.get('/stores/category/:category', async (req, res) => {
  try {
    const { category } = req.params;
    
    const stores = await Store.find({
      category: { $regex: new RegExp(category, 'i') }
    }).populate('user_id', 'name email');
    
    res.status(200).send({
      message: `Stores in ${category} category retrieved successfully`,
      count: stores.length,
      stores: stores
    });
  } catch (err) {
    res.status(500).send({
      message: 'Error retrieving stores by category',
      error: err.message
    });
  }
});

// 10. Update Store
router.put('/stores/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, category, description, banner, logo } = req.body;
    
    const updatedStore = await Store.findByIdAndUpdate(
      id,
      { name, category, description, banner, logo, updatedAt: new Date() },
      { new: true, runValidators: true }
    ).populate('user_id', 'name email');
    
    if (!updatedStore) {
      return res.status(404).send({
        message: 'Store not found'
      });
    }
    
    res.status(200).send({
      message: 'Store updated successfully',
      store: updatedStore
    });
  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(400).send({
        message: 'Invalid store ID format'
      });
    }
    
    if (err.name === 'ValidationError') {
      return res.status(400).send({
        message: 'Validation error',
        error: err.message
      });
    }
    
    res.status(500).send({
      message: 'Error updating store',
      error: err.message
    });
  }
});

// 11. Delete Store
router.delete('/stores/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const deletedStore = await Store.findByIdAndDelete(id);
    
    if (!deletedStore) {
      return res.status(404).send({
        message: 'Store not found'
      });
    }
    
    res.status(200).send({
      message: 'Store deleted successfully',
      store: deletedStore
    });
  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(400).send({
        message: 'Invalid store ID format'
      });
    }
    
    res.status(500).send({
      message: 'Error deleting store',
      error: err.message
    });
  }
});

// ==================== PRODUCT ROUTES ====================

// 12. Create Product
router.post('/products', async (req, res) => {
  try {
    const {
      name,
      description,
      price,
      sale_price,
      category,
      image,
      in_stock,
      quantity,
      store_id,
      saleEndingDate
    } = req.body;

    // Validate required fields
    if (!name || !description || !price || !category || !store_id ) {
      return res.status(400).json({
        success: false,
        message: 'Required fields: name, description, price, category, store_id'
      });
    }

    // // Validate ObjectIds
    // if (!isValidObjectId(store_id) || !isValidObjectId(created_by)) {
    //   return res.status(400).json({
    //     success: false,
    //     message: 'Invalid store_id or created_by format'
    //   });
    // }

    // Check if seller exists
    // const seller = await Seller.findById(created_by);
    // if (!seller) {
    //   return res.status(400).json({
    //     success: false,
    //     message: 'Seller not found'
    //   });
    // }

    // Check if store exists
    const store = await Store.findById(store_id);
    if (!store) {
      return res.status(400).json({
        success: false,
        message: 'Store not found'
      });
    }

    // Validate category
    const validCategories = ['Electronics', 'Clothing', 'Home & Garden', 'Sports', 'Books', 'Toys', 'Beauty', 'Automotive', 'Food', 'Other'];
    if (!validCategories.includes(category)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid category. Valid categories: ' + validCategories.join(', ')
      });
    }

    // Validate sale price
    if (sale_price && sale_price >= price) {
      return res.status(400).json({
        success: false,
        message: 'Sale price must be less than regular price'
      });
    }

    // Create new product
    const product = new Product({
      name,
      description,
      price,
      sale_price: sale_price || null,
      category,
      image: image || null,
      in_stock: in_stock !== undefined ? in_stock : true,
      quantity: quantity || 1,
      store_id,
      saleEndingDate,
      rating: 0
    });

    await product.save();

    // Populate store and seller info
    await product.populate('store_id', 'name category');
    // await product.populate('created_by', 'name email');

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      product
    });

  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating product',
      error: error.message
    });
  }
});

// 13. Get All Products (Simple - No Input Required)
router.get('/products/all', async (req, res) => {
  try {
    // Get ALL products from database
    const products = await Product.find({})
      .populate('store_id', 'name category description')
      .sort({ createdAt: -1 }); // Sort by newest first

    res.status(200).json({
      success: true,
      message: 'All products retrieved successfully',
      count: products.length,
      products: products
    });

  } catch (error) {
    console.error('Error fetching all products:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching products',
      error: error.message
    });
  }
});

// 14. Create New Product
// router.post('/products', async (req, res) => {
//   try {
//     const {
//       name,
//       description,
//       price,
//       sale_price,
//       category,
//       image,
//       in_stock = true,
//       quantity = 1,
//       store_id,
//       rating = 0
//     } = req.body;

//     // Validate required fields
//     if (!name || !description || !price || !category || !store_id) {
//       return res.status(400).json({
//         success: false,
//         message: 'Missing required fields',
//         required_fields: ['name', 'description', 'price', 'category', 'store_id' ]
//       });
//     }

//     // Validate data types and constraints
//     if (typeof name !== 'string' || name.trim().length === 0 || name.length > 100) {
//       return res.status(400).json({
//         success: false,
//         message: 'Name must be a string between 1 and 100 characters'
//       });
//     }

//     if (typeof description !== 'string' || description.trim().length === 0 || description.length > 1000) {
//       return res.status(400).json({
//         success: false,
//         message: 'Description must be a string between 1 and 1000 characters'
//       });
//     }

//     if (typeof price !== 'number' || price < 0) {
//       return res.status(400).json({
//         success: false,
//         message: 'Price must be a non-negative number'
//       });
//     }

//     if (sale_price !== undefined && sale_price !== null) {
//       if (typeof sale_price !== 'number' || sale_price < 0) {
//         return res.status(400).json({
//           success: false,
//           message: 'Sale price must be a non-negative number'
//         });
//       }
//       if (sale_price >= price) {
//         return res.status(400).json({
//           success: false,
//           message: 'Sale price must be less than regular price'
//         });
//       }
//     }

//     // Validate category
//     const validCategories = ['Electronics', 'Clothing', 'Home & Garden', 'Sports', 'Books', 'Toys', 'Beauty', 'Automotive', 'Food', 'Other'];
//     if (!validCategories.includes(category)) {
//       return res.status(400).json({
//         success: false,
//         message: 'Invalid category',
//         valid_categories: validCategories
//       });
//     }

//     // Validate ObjectIds
//     if (!isValidObjectId(store_id)) {
//       return res.status(400).json({
//         success: false,
//         message: 'Invalid store_id format'
//       });
//     }

   

//     // Validate optional fields
//     if (quantity !== undefined && (typeof quantity !== 'number' || quantity < 0)) {
//       return res.status(400).json({
//         success: false,
//         message: 'Quantity must be a non-negative number'
//       });
//     }

//     if (rating !== undefined && (typeof rating !== 'number' || rating < 0 || rating > 5)) {
//       return res.status(400).json({
//         success: false,
//         message: 'Rating must be a number between 0 and 5'
//       });
//     }

//     // Auto-set in_stock based on quantity if not explicitly provided
//     const stockStatus = quantity > 0 ? in_stock : false;

//     // Create new product
//     const productData = {
//       name: name.trim(),
//       description: description.trim(),
//       price,
//       category,
//       store_id,
//       in_stock: stockStatus,
//       quantity,
//       rating
//     };

//     // Add optional fields if provided
//     if (sale_price !== undefined) productData.sale_price = sale_price;
//     if (image !== undefined) productData.image = image;

//     const newProduct = new Product(productData);
//     const savedProduct = await newProduct.save();

//     // Populate the response
//     const populatedProduct = await Product.findById(savedProduct._id)
//       .populate('store_id', 'name category description')
//       .populate('created_by', 'name email');

//     res.status(201).json({
//       success: true,
//       message: 'Product created successfully',
//       data: {
//         product: populatedProduct
//       }
//     });

//   } catch (error) {
//     console.error('Error creating product:', error);
    
//     // Handle duplicate key error
//     if (error.code === 11000) {
//       return res.status(400).json({
//         success: false,
//         message: 'Product with this data already exists'
//       });
//     }
    
//     // Handle validation errors
//     if (error.name === 'ValidationError') {
//       return res.status(400).json({
//         success: false,
//         message: 'Validation error',
//         errors: Object.values(error.errors).map(err => err.message)
//       });
//     }
    
//     res.status(500).json({
//       success: false,
//       message: 'Server error while creating product',
//       error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
//     });
//   }
// });

// 14b. Get All Products (with Filters and Pagination)
router.get('/products', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      category,
      minPrice,
      maxPrice,
      inStock,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      store_id,
      created_by,
      minRating,
      maxRating
    } = req.query;

    // Build filter object
    const filter = {};
    
    if (category) filter.category = category;
    if (inStock !== undefined) filter.in_stock = inStock === 'true';
    if (store_id && isValidObjectId(store_id)) filter.store_id = store_id;
    // if (created_by && isValidObjectId(created_by)) filter.created_by = created_by;
    
    // Price range filter
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = parseFloat(minPrice);
      if (maxPrice) filter.price.$lte = parseFloat(maxPrice);
    }
    
    // Rating range filter
    if (minRating || maxRating) {
      filter.rating = {};
      if (minRating) filter.rating.$gte = parseFloat(minRating);
      if (maxRating) filter.rating.$lte = parseFloat(maxRating);
    }
    
    // Search filter
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    // Validate sortBy field
    const validSortFields = ['name', 'price', 'rating', 'createdAt', 'updatedAt', 'quantity'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
    
    // Build sort object
    const sort = {};
    sort[sortField] = sortOrder === 'asc' ? 1 : -1;

    // Validate and calculate pagination
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit))); // Limit max to 50
    const skip = (pageNum - 1) * limitNum;

    // Get products with pagination
    const products = await Product.find(filter)
      .populate('store_id', 'name category description')
      .populate('created_by', 'name email')
      .sort(sort)
      .skip(skip)
      .limit(limitNum)
      .lean(); // Use lean for better performance

    // Get total count
    const total = await Product.countDocuments(filter);

    res.json({
      success: true,
      message: 'Products retrieved successfully',
      data: {
        products,
        pagination: {
          current_page: pageNum,
          total_pages: Math.ceil(total / limitNum),
          total_products: total,
          products_per_page: limitNum,
          has_next_page: pageNum < Math.ceil(total / limitNum),
          has_prev_page: pageNum > 1
        },
        filters_applied: {
          category,
          price_range: minPrice || maxPrice ? { min: minPrice, max: maxPrice } : null,
          rating_range: minRating || maxRating ? { min: minRating, max: maxRating } : null,
          in_stock: inStock,
          search,
          store_id,
          created_by
        }
      }
    });

  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching products',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// 15. Get Product by ID
router.get('/products/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Validate product ID
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid product ID format'
      });
    }

    const product = await Product.findById(id)
      .populate('store_id', 'name category description')
      .populate('created_by', 'name email')
      .lean();

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    res.json({
      success: true,
      message: 'Product retrieved successfully',
      data: {
        product
      }
    });

  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching product',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// 16. Update Product
router.put('/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      price,
      sale_price,
      category,
      image,
      in_stock,
      quantity,
      rating
    } = req.body;

    // Validate product ID
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid product ID format'
      });
    }

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Data validation
    const updates = {};
    
    if (name !== undefined) {
      if (!name.trim() || name.length > 100) {
        return res.status(400).json({
          success: false,
          message: 'Name must be between 1 and 100 characters'
        });
      }
      updates.name = name.trim();
    }
    
    if (description !== undefined) {
      if (!description.trim() || description.length > 1000) {
        return res.status(400).json({
          success: false,
          message: 'Description must be between 1 and 1000 characters'
        });
      }
      updates.description = description.trim();
    }
    
    if (price !== undefined) {
      if (price < 0) {
        return res.status(400).json({
          success: false,
          message: 'Price must be non-negative'
        });
      }
      updates.price = price;
    }
    
    if (sale_price !== undefined) {
      if (sale_price !== null && sale_price < 0) {
        return res.status(400).json({
          success: false,
          message: 'Sale price must be non-negative'
        });
      }
      const currentPrice = price !== undefined ? price : product.price;
      if (sale_price !== null && sale_price >= currentPrice) {
        return res.status(400).json({
          success: false,
          message: 'Sale price must be less than regular price'
        });
      }
      updates.sale_price = sale_price;
    }
    
    if (category !== undefined) {
      const validCategories = ['Electronics', 'Clothing', 'Home & Garden', 'Sports', 'Books', 'Toys', 'Beauty', 'Automotive', 'Food', 'Other'];
      if (!validCategories.includes(category)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid category',
          valid_categories: validCategories
        });
      }
      updates.category = category;
    }
    
    if (image !== undefined) updates.image = image;
    if (in_stock !== undefined) updates.in_stock = Boolean(in_stock);
    
    if (quantity !== undefined) {
      if (quantity < 0) {
        return res.status(400).json({
          success: false,
          message: 'Quantity must be non-negative'
        });
      }
      updates.quantity = quantity;
      // Auto-update in_stock based on quantity if not explicitly set
      if (in_stock === undefined) {
        updates.in_stock = quantity > 0;
      }
    }
    
    if (rating !== undefined) {
      if (rating < 0 || rating > 5) {
        return res.status(400).json({
          success: false,
          message: 'Rating must be between 0 and 5'
        });
      }
      updates.rating = rating;
    }

    // Update product
    const updatedProduct = await Product.findByIdAndUpdate(
      id,
      updates,
      { new: true, runValidators: true }
    )
    .populate('store_id', 'name category description')
    .populate('created_by', 'name email');

    res.json({
      success: true,
      message: 'Product updated successfully',
      data: {
        product: updatedProduct
      }
    });

  } catch (error) {
    console.error('Error updating product:', error);
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: Object.values(error.errors).map(err => err.message)
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error while updating product',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// 17. Delete Product
router.delete('/products/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Validate product ID
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid product ID format'
      });
    }

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    await Product.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'Product deleted successfully',
      data: {
        deleted_product_id: id
      }
    });

  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting product',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// 18. Get Products by Store
router.get('/products/store/:storeId', async (req, res) => {
  try {
    const { storeId } = req.params;
    const { page = 1, limit = 10, inStock } = req.query;

    // Validate store ID
    if (!isValidObjectId(storeId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid store ID format'
      });
    }

    // Check if store exists
    const store = await Store.findById(storeId);
    if (!store) {
      return res.status(404).json({
        success: false,
        message: 'Store not found'
      });
    }

    // Build filter
    const filter = { store_id: storeId };
    if (inStock !== undefined) filter.in_stock = inStock === 'true';

    // Calculate pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Get products
    const products = await Product.find(filter)
      .populate('created_by', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    const total = await Product.countDocuments(filter);

    res.json({
      success: true,
      message: 'Store products retrieved successfully',
      products,
      pagination: {
        current_page: pageNum,
        total_pages: Math.ceil(total / limitNum),
        total_products: total,
        products_per_page: limitNum
      }
    });

  } catch (error) {
    console.error('Error fetching store products:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching store products',
      error: error.message
    });
  }
});

// 19. Get Products by Seller
router.get('/products/seller/:sellerId', async (req, res) => {
  try {
    const { sellerId } = req.params;
    const { page = 1, limit = 10, inStock } = req.query;

    // Validate seller ID
    if (!isValidObjectId(sellerId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid seller ID format'
      });
    }

    // Build filter
    const filter = { created_by: sellerId };
    if (inStock !== undefined) filter.in_stock = inStock === 'true';

    // Calculate pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Get products
    const products = await Product.find(filter)
      .populate('store_id', 'name category')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    const total = await Product.countDocuments(filter);

    res.json({
      success: true,
      message: 'Seller products retrieved successfully',
      products,
      pagination: {
        current_page: pageNum,
        total_pages: Math.ceil(total / limitNum),
        total_products: total,
        products_per_page: limitNum
      }
    });

  } catch (error) {
    console.error('Error fetching seller products:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching seller products',
      error: error.message
    });
  }
});

// 20. Update Product Stock
router.patch('/products/:id/stock', async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity, in_stock } = req.body;

    // Validate product ID
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid product ID format'
      });
    }

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Update stock
    const updateData = {};
    if (quantity !== undefined) updateData.quantity = quantity;
    if (in_stock !== undefined) updateData.in_stock = in_stock;

    const updatedProduct = await Product.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    )
    .populate('store_id', 'name category')
    // .populate('created_by', 'name email');

    res.json({
      success: true,
      message: 'Product stock updated successfully',
      product: updatedProduct
    });

  } catch (error) {
    console.error('Error updating product stock:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating product stock',
      error: error.message
    });
  }
});

router.post('/order/createOrder', async (req, res) => {
  try {
    const {
      products,
      shippingAddress,
      shippingPrice
    } = req.body;

    if (!products || products.length === 0) {
      return res.status(400).json({ message: 'No products provided in order.' });
    }

    // Validate each product and calculate itemsPrice
    let itemsPrice = 0;
    const validatedProducts = [];

    for (const item of products) {
      const { product: productId, quantity } = item;

      const product = await Product.findById(productId);
      if (!product) {
        return res.status(404).json({ message: `Product not found: ${productId}` });
      }

      const price = product.price; // Get current product price
      const totalForItem = price * quantity;
      itemsPrice += totalForItem;

      validatedProducts.push({
        product: product._id,
        quantity,
        price
      });
    }

    const totalPrice = itemsPrice + shippingPrice;

    const order = new Order({
      // userId: req.user._id, // Ensure req.user is populated via auth middleware
      products: validatedProducts,
      shippingAddress,
      itemsPrice,
      shippingPrice,
      totalPrice
    });

    const createdOrder = await order.save();

    res.status(201).json({
      message: 'Order created successfully',
      order: createdOrder
    });
  } catch (error) {
    console.error('Order creation error:', error);
    res.status(500).json({ message: 'Server error while creating order' });
  }
});

// router.get('/getOrders', async (req, res) => {
//   try {
//     const orders = await Order.find()
//       .populate('userId', 'name email') // Include buyer info
//       .populate('products.product', 'name price image') // Include product info
//       .sort({ createdAt: -1 }); // Most recent orders first

//     res.status(200).json({
//       message: 'Orders retrieved successfully',
//       orders
//     });
//   } catch (error) {
//     console.error('Error fetching orders:', error);
//     res.status(500).json({ message: 'Server error while fetching orders' });
//   }
// });

router.get('/getOrders', async (req, res) => {
  try {
    const { storeId } = req.query;

    if (!storeId) {
      return res.status(400).json({ message: 'storeId query parameter is required' });
    }

    const orders = await Order.aggregate([
      // Unwind the products array to deal with each product individually
      { $unwind: '$products' },

      // Lookup product details for each product reference
      {
        $lookup: {
          from: 'products',
          localField: 'products.product',
          foreignField: '_id',
          as: 'productDetails'
        }
      },
      { $unwind: '$productDetails' },

      // Match only products that belong to the provided storeId
      {
        $match: {
          'productDetails.store_id': new mongoose.Types.ObjectId(storeId)
        }
      },

      // Group back to order level, gathering matched products only
      {
        $group: {
          _id: '$_id',
          // userId: { $first: '$userId' },
          shippingAddress: { $first: '$shippingAddress' },
          itemsPrice: { $first: '$itemsPrice' },
          shippingPrice: { $first: '$shippingPrice' },
          totalPrice: { $first: '$totalPrice' },
          orderStatus: { $first: '$orderStatus' },
          createdAt: { $first: '$createdAt' },
          updatedAt: { $first: '$updatedAt' },
          products: {
            $push: {
              product: '$products.product',
              quantity: '$products.quantity',
              price: '$products.price',
              storeProduct: '$productDetails' // Optionally include full product info
            }
          }
        }
      },

      // Sort by newest orders
      { $sort: { createdAt: -1 } }
    ]);

    res.status(200).json({
      message: 'Orders retrieved successfully for this store',
      orders
    });
  } catch (error) {
    console.error('Error fetching store orders:', error);
    res.status(500).json({ message: 'Server error while fetching store orders' });
  }
});


module.exports = router;