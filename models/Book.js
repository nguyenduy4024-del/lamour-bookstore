const mongoose = require('mongoose');

const bookSchema = new mongoose.Schema(
  {
    bookCode: {
      type: String,
      required: [true, 'Vui lòng nhập mã sách'],
      unique: true,
      trim: true
    },
    title: {
      type: String,
      required: [true, 'Vui lòng nhập tên sách'],
      trim: true
    },
    author: {
      type: String,
      required: [true, 'Vui lòng nhập tên tác giả'],
      trim: true
    },
    category: {
      type: String,
      required: [true, 'Vui lòng nhập thể loại sách'],
      trim: true
    },
    price: {
      type: Number,
      required: [true, 'Vui lòng nhập giá sách'],
      min: [0, 'Giá sách không thể âm']
    },
    costPrice: {
      type: Number,
      default: 0,
      min: [0, 'Giá vốn không thể âm']
    },
    stock: {
      type: Number,
      required: [true, 'Vui lòng nhập số lượng tồn kho'],
      default: 0,
      min: [0, 'Số lượng tồn kho không thể âm']
    },
    shelf: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Shelf',
      default: null,
      index: true
    },
    shelfPosition: {
      type: String,
      default: '',
      trim: true
    },
    shelfLocation: {
      type: String,
      default: '',
      trim: true
    },
    supplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Supplier',
      default: null,
      index: true
    },
    isFeatured: {
      type: Boolean,
      default: false
    },
    slogan: {
      type: String,
      default: '',
      trim: true
    },
    coverImage: {
      type: String,
      default: ''
    },
    images: {
      type: [String],
      default: [],
      validate: [arrayLimit, 'Số lượng ảnh phụ không được vượt quá 4 ảnh']
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true
    },
    deletedAt: {
      type: Date,
      default: null
    },
    status: {
      type: String,
      enum: ['active', 'hidden'],
      default: 'active'
    }
  },
  {
    timestamps: true
  }
);

function arrayLimit(val) {
  return val.length <= 4;
}

// Tự động tính giá vốn mặc định bằng 65% giá bán nếu chưa có hoặc không hợp lệ
bookSchema.pre('save', function (next) {
  if (this.price && (this.costPrice === undefined || this.costPrice === null || this.costPrice <= 0 || this.costPrice >= this.price)) {
    this.costPrice = Math.round(this.price * 0.65);
  }
  next();
});

// Tự động đồng bộ số lượng tồn kho và thông tin vào bảng Inventory khi lưu sách
bookSchema.post('save', async function (doc) {
  try {
    const db = mongoose.connection.db;
    if (!db) return;
    const stock = doc.stock || 0;
    const costPrice = doc.costPrice || Math.round((doc.price || 50000) * 0.7);
    let stockStatus = 'Còn hàng';
    if (stock === 0) stockStatus = 'Hết hàng';
    else if (stock < 10) stockStatus = 'Sắp hết hàng (Cần nhập)';

    await db.collection('inventory').updateOne(
      { productId: doc._id },
      {
        $set: {
          productCode: doc.bookCode || '',
          productName: doc.title,
          categoryName: doc.category || 'Chung',
          shelfLocation: doc.shelfLocation || 'Kệ A1',
          stockQuantity: stock,
          costPrice: costPrice,
          sellingPrice: doc.price || 0,
          inventoryValue: stock * costPrice,
          stockStatus: stockStatus,
          updatedAt: new Date()
        }
      },
      { upsert: true }
    );
  } catch (err) {
    console.error('Lỗi sync inventory từ Book:', err.message);
  }
});

module.exports = mongoose.models.Book || mongoose.model('Book', bookSchema, 'products');


