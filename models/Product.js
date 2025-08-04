// models/Product.js
const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  sale_price: {
    type: Number,
    default: null,
    min: 0,
    validate: {
      validator: function(value) {
        return value === null || value < this.price;
      },
      message: 'Sale price must be less than regular price'
    }
  },
  category: {
    type: String,
    required: true,
    enum: ['Electronics', 'Clothing', 'Home & Garden', 'Sports', 'Books', 'Toys', 'Beauty', 'Automotive', 'Food', 'Other']
  },
  image: {
    type: [String],
    default: null
  },
  in_stock: {
    type: Boolean,
    default: true
  },
  quantity: {
    type: Number,
    default: 1,
    min: 0
  },
  store_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store',
    required: true
  },
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  saleEndingDate: {
    type: Date,
    default: null,
  }
}, 
{
  timestamps: true
});

// Add indexes for better performance
productSchema.index({ store_id: 1 });
productSchema.index({ category: 1 });

module.exports = mongoose.model('Product', productSchema);