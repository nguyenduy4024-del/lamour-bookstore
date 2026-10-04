const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Vui lòng nhập tên thể loại'],
      unique: true,
      trim: true
    },
    description: {
      type: String,
      default: '',
      trim: true
    },
    slug: {
      type: String,
      trim: true
    }
  },
  {
    timestamps: true
  }
);

categorySchema.pre('save', function (next) {
  if (this.name) {
    this.slug = this.name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-');
  }
  next();
});

module.exports = mongoose.model('Category', categorySchema);
