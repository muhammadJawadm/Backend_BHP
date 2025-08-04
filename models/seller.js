const mongoose = require('mongoose');

const SellerSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String,
});

module.exports = mongoose.model('Seller', SellerSchema);
