const mongoose = require('mongoose');

const BrandSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please add a brand name'],
      trim: true,
    },
    city: {
      type: String,
      required: [true, 'Please add a city'],
      trim: true,
    },
    country: {
      type: String,
      required: [true, 'Please add a country'],
      trim: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Brand', BrandSchema);
