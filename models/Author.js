const mongoose = require('mongoose');

const authorSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Vui lòng nhập tên tác giả'],
      unique: true,
      trim: true
    },
    genre: {
      type: String,
      default: '',
      trim: true
    },
    quote: {
      type: String,
      default: '',
      trim: true
    },
    avatar: {
      type: String,
      default: ''
    },
    bio: {
      type: String,
      default: '',
      trim: true
    },
    bookCount: {
      type: Number,
      default: 0,
      min: [0, 'Số lượng tác phẩm không thể âm']
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Author', authorSchema);
