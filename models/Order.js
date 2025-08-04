  const mongoose = require('mongoose');

  const orderSchema = new mongoose.Schema({
    // userId: {
    //   type: mongoose.Schema.Types.ObjectId,
    //   ref: 'User',
    //   required: true
    // },
    products: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Product',
          required: true
        },
        quantity: {
          type: Number,
          required: true,
          min: 1
        },
        price: {
          type: Number,
          required: true
        }
      }
    ],
    shippingAddress: {
      fullName: { type: String, required: true },
      addressLine: { type: String, required: true },
      city: { type: String, required: true },
      postalCode: { type: String, required: true },
      country: { type: String, required: true },
      phone: { type: String, required: true }
    },
    // paymentMethod: {
    //   type: String,
    //   enum: ['Cash on Delivery', 'Credit Card', 'PayPal', 'Stripe'],
    //   required: true
    // },
    // paymentStatus: {
    //   type: String,
    //   enum: ['Pending', 'Paid', 'Failed'],
    //   default: 'Pending'
    // },
    // paymentResult: {
    //   id: String,
    //   status: String,
    //   update_time: String,
    //   email_address: String
    // },
    itemsPrice: {
      type: Number,
      required: true
    },
    // taxPrice: {
    //   type: Number,
    //   required: true
    // },
    shippingPrice: {
      type: Number,
      required: true
    },
    totalPrice: {
      type: Number,
      required: true
    },
    orderStatus: {
      type: String,
      enum: ['Processing', 'Shipped'],
      default: 'Processing'
    },
    deliveredAt: {
      type: Date
    }
  }, { timestamps: true });

  module.exports = mongoose.model('Order', orderSchema);
