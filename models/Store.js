const mongoose = require('mongoose');

const StoreSchema = new mongoose.Schema({
  name: { type: String, required: true },
  category: String,
  description: String,
  banner: String,
  logo: String,
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Seller',
    required: true
  }
});

// ✅ This line is crucial
module.exports = mongoose.model('Store', StoreSchema);

