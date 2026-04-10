const mongoose = require('mongoose');

const BrandMemberSchema = new mongoose.Schema(
  {
    brand: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Brand',
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    role: {
      type: String,
      enum: ['admin', 'member'],
      required: true,
    },
  },
  { timestamps: true }
);

BrandMemberSchema.index({ brand: 1, user: 1 }, { unique: true });

module.exports = mongoose.model('BrandMember', BrandMemberSchema);
