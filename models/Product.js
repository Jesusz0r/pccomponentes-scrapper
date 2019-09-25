const mongoose = require('mongoose');
const ProductSchema = new mongoose.Schema({
  sku: String,
  name: String,
  price: String,
  category: String,
  brand: String,
  url: String,
  highestPrice: String,
  lowestPrice: String,
  lastChange: Date,
  offer: {
    isOffer: Boolean,
    discount: String,
  },
  stock: String,
});

module.exports = mongoose.model('Product', ProductSchema);
