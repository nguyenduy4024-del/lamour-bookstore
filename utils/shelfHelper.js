const mongoose = require('mongoose');
const Shelf = require('../models/Shelf');
const Book = require('../models/Book');

/**
 * Danh sách 12 kệ sách mẫu đại diện cho 4 khu vực thực tế của hiệu sách
 */
const DEFAULT_SHELVES = [
  // KHU A: VĂN HỌC & NGHỆ THUẬT CHỮ
  {
    shelfCode: 'KE-A1',
    shelfName: 'Kệ A1 - Văn học Việt Nam',
    zone: 'Khu A',
    capacity: 400,
    description: 'Sách văn học, tiểu thuyết, truyện ngắn Việt Nam hiện đại và trung đại'
  },
  {
    shelfCode: 'KE-A2',
    shelfName: 'Kệ A2 - Văn học Nước ngoài',
    zone: 'Khu A',
    capacity: 350,
    description: 'Văn học phương Tây, Á Đông và dịch phẩm kinh điển thế giới'
  },
  {
    shelfCode: 'KE-A3',
    shelfName: 'Kệ A3 - Thơ ca & Tản văn',
    zone: 'Khu A',
    capacity: 150,
    description: 'Tuyển tập thơ ca đương đại, tản văn, tùy bút và ký sự'
  },
  {
    shelfCode: 'KE-A4',
    shelfName: 'Kệ A4 - Trinh thám & Bí ẩn',
    zone: 'Khu A',
    capacity: 300,
    description: 'Tiểu thuyết trinh thám hình sự, kinh dị giật gân và phiêu lưu bí ẩn'
  },
  {
    shelfCode: 'KE-A5',
    shelfName: 'Kệ A5 - Văn học Cổ điển & Sử thi',
    zone: 'Khu A',
    capacity: 300,
    description: 'Danh tác văn học cổ điển phương Đông, sử thi anh hùng ca và phóng tác'
  },

  // KHU B: KINH TẾ, KỸ NĂNG & PHÁT TRIỂN
  {
    shelfCode: 'KE-B1',
    shelfName: 'Kệ B1 - Kinh tế & Quản trị',
    zone: 'Khu B',
    capacity: 450,
    description: 'Sách quản trị doanh nghiệp, kinh doanh chiến lược và khởi nghiệp đổi mới'
  },
  {
    shelfCode: 'KE-B2',
    shelfName: 'Kệ B2 - Kỹ năng sống & Bản thân',
    zone: 'Khu B',
    capacity: 350,
    description: 'Phát triển bản thân, kỹ năng giao tiếp, đàm phán và tư duy tích cực'
  },
  {
    shelfCode: 'KE-B3',
    shelfName: 'Kệ B3 - Tâm lý học & Triết học',
    zone: 'Khu B',
    capacity: 300,
    description: 'Tâm lý học ứng dụng, tâm lý học hành vi và triết học nhân sinh'
  },
  {
    shelfCode: 'KE-B4',
    shelfName: 'Kệ B4 - Tài chính & Đầu tư Cá nhân',
    zone: 'Khu B',
    capacity: 350,
    description: 'Tài chính cá nhân, đầu tư chứng khoán, bất động sản và tự do tài chính'
  },
  {
    shelfCode: 'KE-B5',
    shelfName: 'Kệ B5 - Marketing & Bán hàng',
    zone: 'Khu B',
    capacity: 300,
    description: 'Tiếp thị số, truyền thông thương hiệu và nghệ thuật bán hàng đỉnh cao'
  },

  // KHU C: KHOA HỌC, LỊCH SỬ & GIÁO DỤC
  {
    shelfCode: 'KE-C1',
    shelfName: 'Kệ C1 - Lịch sử & Địa lý',
    zone: 'Khu C',
    capacity: 400,
    description: 'Lịch sử thế giới, lịch sử và văn hóa Việt Nam, địa lý khảo cứu'
  },
  {
    shelfCode: 'KE-C2',
    shelfName: 'Kệ C2 - Khoa học & Công nghệ',
    zone: 'Khu C',
    capacity: 350,
    description: 'Khoa học tự nhiên, vũ trụ học, AI, lập trình và công nghệ tương lai'
  },
  {
    shelfCode: 'KE-C3',
    shelfName: 'Kệ C3 - Ngoại ngữ & Từ điển',
    zone: 'Khu C',
    capacity: 250,
    description: 'Giáo trình ngoại ngữ, từ điển đối chiếu, cẩm nang luyện thi quốc tế'
  },
  {
    shelfCode: 'KE-C4',
    shelfName: 'Kệ C4 - Triết học & Xã hội học',
    zone: 'Khu C',
    capacity: 300,
    description: 'Tư tưởng học thuyết, văn minh nhân loại và các vấn đề xã hội đương đại'
  },
  {
    shelfCode: 'KE-C5',
    shelfName: 'Kệ C5 - Y học & Sức khỏe Đời sống',
    zone: 'Khu C',
    capacity: 300,
    description: 'Y học thường thức, dinh dưỡng trường thọ, sức khỏe tinh thần và thể chất'
  },

  // KHU D: THIẾU NHI, NGHỆ THUẬT & TRUYỆN TRANH
  {
    shelfCode: 'KE-D1',
    shelfName: 'Kệ D1 - Thiếu nhi & Tranh truyện',
    zone: 'Khu D',
    capacity: 450,
    description: 'Sách tranh thiếu nhi, truyện cổ tích, bách khoa toàn thư tuổi thơ'
  },
  {
    shelfCode: 'KE-D2',
    shelfName: 'Kệ D2 - Nghệ thuật & Đời sống',
    zone: 'Khu D',
    capacity: 300,
    description: 'Nhiếp ảnh, kiến trúc, hội họa, âm nhạc, ẩm thực và phong cách sống'
  },
  {
    shelfCode: 'KE-D3',
    shelfName: 'Kệ D3 - Manga & Truyện tranh',
    zone: 'Khu D',
    capacity: 300,
    description: 'Truyện tranh Manga Nhật Bản, Manhwa Hàn Quốc và Graphic Novels'
  },
  {
    shelfCode: 'KE-D4',
    shelfName: 'Kệ D4 - Comics & Artbook Đồ Họa',
    zone: 'Khu D',
    capacity: 300,
    description: 'Comic phương Tây, artbook minh họa nhân vật và truyện tranh phiêu lưu'
  },
  {
    shelfCode: 'KE-D5',
    shelfName: 'Kệ D5 - Nuôi dạy con & Gia đình',
    zone: 'Khu D',
    capacity: 300,
    description: 'Phương pháp giáo dục sớm, cẩm nang gia đình hạnh phúc và đồng hành cùng con'
  },

  // KHU DỰ PHÒNG
  {
    shelfCode: 'KE-DP',
    shelfName: 'Kệ Dự Phòng Lưu Trữ',
    zone: 'Khu Dự Phòng',
    capacity: 2500,
    description: 'Kệ dự phòng chuyên dụng tiếp nhận sách khi các kệ vật lý trong kho tiến hành bảo trì hoặc sửa chữa'
  }
];

/**
 * Lấy hoặc tự động tạo Kệ Dự Phòng (KE-DP)
 */
const getOrCreateBackupShelf = async () => {
  let backup = await Shelf.findOne({ shelfCode: 'KE-DP' });
  if (!backup) {
    backup = await Shelf.create({
      shelfCode: 'KE-DP',
      shelfName: 'Kệ Dự Phòng Lưu Trữ',
      zone: 'Khu Dự Phòng',
      capacity: 5000,
      description: 'Kệ dự phòng chuyên dụng tiếp nhận sách khi các kệ vật lý trong kho tiến hành bảo trì hoặc sửa chữa',
      status: 'available'
    });
    console.log('[ShelfHelper] Đã tự động tạo Kệ Dự Phòng Lưu Trữ (KE-DP).');
  }
  return backup;
};

/**
 * Tính tổng số lượng tồn kho của tất cả sách đang nằm trên kệ
 * @param {string|mongoose.Types.ObjectId} shelfId
 * @returns {Promise<number>}
 */
const getShelfOccupancy = async (shelfId) => {
  if (!shelfId) return 0;
  const objectId = typeof shelfId === 'string' ? new mongoose.Types.ObjectId(shelfId) : shelfId;

  const result = await Book.aggregate([
    {
      $match: {
        shelf: objectId,
        isDeleted: { $ne: true }
      }
    },
    {
      $group: {
        _id: null,
        totalStock: { $sum: '$stock' }
      }
    }
  ]);

  return result.length > 0 ? (result[0].totalStock || 0) : 0;
};

/**
 * Tính toán lại dung lượng và cập nhật trạng thái của 1 kệ:
 * - remainingSpace <= 0: status = 'full'
 * - remainingSpace <= capacity * 0.2: status = 'nearly_full'
 * - Còn lại: status = 'available'
 * @param {string|mongoose.Types.ObjectId} shelfId
 * @returns {Promise<Object>}
 */
const updateShelfStatus = async (shelfId) => {
  if (!shelfId) return null;
  const shelf = await Shelf.findById(shelfId);
  if (!shelf) return null;

  const currentStock = await getShelfOccupancy(shelf._id);
  const remainingSpace = shelf.capacity - currentStock;

  // Nếu kệ đang trong chế độ bảo trì, giữ nguyên trạng thái maintenance
  if (shelf.status === 'maintenance') {
    return {
      shelf,
      currentStock,
      remainingSpace: 0,
      occupancyPercent: 0,
      status: 'maintenance'
    };
  }

  let newStatus = 'available';
  if (currentStock > shelf.capacity) {
    newStatus = 'overloaded';
  } else if (remainingSpace <= 0) {
    newStatus = 'full';
  } else if (remainingSpace <= shelf.capacity * 0.2) {
    newStatus = 'nearly_full';
  } else {
    newStatus = 'available';
  }

  if (shelf.status !== newStatus) {
    shelf.status = newStatus;
    await shelf.save();
  }

  const occupancyPercent = shelf.capacity > 0
    ? Math.round((currentStock / shelf.capacity) * 100)
    : 0;

  return {
    shelf,
    currentStock,
    remainingSpace: Math.max(0, remainingSpace),
    occupancyPercent,
    status: newStatus
  };
};

/**
 * Cập nhật đồng loạt trạng thái cho danh sách các kệ
 * @param {Array<string|mongoose.Types.ObjectId>} shelfIds
 */
const updateMultipleShelves = async (shelfIds) => {
  if (!Array.isArray(shelfIds) || shelfIds.length === 0) return;
  const uniqueIds = [...new Set(shelfIds.filter(Boolean).map(id => id.toString()))];
  for (const id of uniqueIds) {
    try {
      await updateShelfStatus(id);
    } catch (err) {
      console.warn(`[ShelfHelper] Lỗi cập nhật kệ ${id}:`, err.message);
    }
  }
};

/**
 * Kiểm tra sức chứa của kệ trước khi xếp sách hoặc điều chỉnh số lượng
 * @param {string|mongoose.Types.ObjectId} shelfId - ID của kệ đích
 * @param {number} requestedStock - Số lượng sách dự kiến xếp vào kệ
 * @param {string|mongoose.Types.ObjectId|null} currentBookId - ID của sách đang sửa (nếu có) để loại trừ tồn kho cũ
 * @returns {Promise<{allowed: boolean, shelf?: Object, remainingSpace?: number, message?: string}>}
 */
const checkShelfCapacity = async (shelfId, requestedStock, currentBookId = null) => {
  if (!shelfId) {
    return { allowed: true, remainingSpace: Infinity };
  }

  const shelf = await Shelf.findById(shelfId);
  if (!shelf) {
    return {
      allowed: false,
      message: 'Kệ sách được chọn không tồn tại trong hệ thống.'
    };
  }

  // Chặn tuyệt đối không cho xếp sách vào kệ đang bảo trì
  if (shelf.status === 'maintenance') {
    return {
      allowed: false,
      shelf,
      remainingSpace: 0,
      existingOtherStock: 0,
      requestedStock: Number(requestedStock) || 0,
      message: `Kệ "${shelf.shelfName}" (${shelf.shelfCode}) đang trong chế độ BẢO TRÌ! Không thể tiếp nhận thêm sách.`
    };
  }

  const qty = Number(requestedStock) || 0;
  if (qty < 0) {
    return { allowed: true, remainingSpace: shelf.capacity };
  }

  // Tính số sách đang có trên kệ (ngoại trừ cuốn sách hiện tại nếu đang cập nhật chính cuốn đó)
  const matchFilter = {
    shelf: shelf._id,
    isDeleted: { $ne: true }
  };

  if (currentBookId) {
    const bookObjId = typeof currentBookId === 'string' ? new mongoose.Types.ObjectId(currentBookId) : currentBookId;
    matchFilter._id = { $ne: bookObjId };
  }

  const agg = await Book.aggregate([
    { $match: matchFilter },
    { $group: { _id: null, total: { $sum: '$stock' } } }
  ]);

  const existingOtherStock = agg.length > 0 ? (agg[0].total || 0) : 0;
  const remainingSpace = shelf.capacity - existingOtherStock;

  if (qty > remainingSpace) {
    const safeRemaining = Math.max(0, remainingSpace);
    return {
      allowed: false,
      shelf,
      remainingSpace: safeRemaining,
      existingOtherStock,
      requestedStock: qty,
      message: `Kệ ${shelf.shelfName} không đủ chỗ! Hiện tại còn trống ${safeRemaining} chỗ, không thể chứa ${qty} cuốn.`
    };
  }

  return {
    allowed: true,
    shelf,
    remainingSpace: remainingSpace - qty,
    existingOtherStock
  };
};

/**
 * Tìm hoặc khớp kệ từ chuỗi (ID, shelfCode, hoặc shelfName)
 * @param {string} shelfIdentifier
 * @returns {Promise<Object|null>}
 */
const resolveShelf = async (shelfIdentifier) => {
  if (!shelfIdentifier) return null;
  const trimmed = shelfIdentifier.toString().trim();

  if (mongoose.Types.ObjectId.isValid(trimmed)) {
    const byId = await Shelf.findById(trimmed);
    if (byId) return byId;
  }

  // Tìm theo mã kệ (KE-A1, KE-A2...)
  const byCode = await Shelf.findOne({ shelfCode: trimmed.toUpperCase() });
  if (byCode) return byCode;

  // Tìm theo tên kệ chính xác hoặc gần đúng
  const byName = await Shelf.findOne({ shelfName: new RegExp('^' + trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') });
  if (byName) return byName;

  // Tìm theo tiền tố Kệ A1, A2...
  const matchCode = trimmed.match(/Kệ\s*([A-D]\d)/i) || trimmed.match(/([A-D]\d)/i);
  if (matchCode) {
    const code = 'KE-' + matchCode[1].toUpperCase();
    const byExtractedCode = await Shelf.findOne({ shelfCode: code });
    if (byExtractedCode) return byExtractedCode;
  }

  return null;
};

/**
 * Khởi tạo 12 kệ vật lý chuẩn và quét map toàn bộ 109 đầu sách hiện có vào đúng kệ
 */
const initAndMigrateShelves = async () => {
  try {
    // 1. Tạo hoặc cập nhật 12 kệ mẫu
    const createdShelves = [];
    for (const item of DEFAULT_SHELVES) {
      const shelfDoc = await Shelf.findOneAndUpdate(
        { shelfCode: item.shelfCode },
        {
          $set: {
            shelfName: item.shelfName,
            zone: item.zone,
            capacity: item.capacity,
            description: item.description
          }
        },
        { upsert: true, new: true }
      );
      createdShelves.push(shelfDoc);
    }

    // 2. Map các sách hiện có vào đúng kệ
    const allShelves = await Shelf.find({});
    const books = await Book.find({});
    let migratedCount = 0;

    for (const book of books) {
      let matchedShelf = null;

      // Nếu sách đã có shelf hợp lệ thì chỉ cần đồng bộ text
      if (book.shelf) {
        matchedShelf = allShelves.find(s => s._id.toString() === book.shelf.toString());
      }

      // Nếu chưa có, phân tích từ shelfLocation hoặc shelfPosition
      if (!matchedShelf) {
        const textToMatch = (book.shelfLocation || book.shelfPosition || '').trim();
        if (textToMatch) {
          matchedShelf = allShelves.find(s => {
            if (s.shelfName.toLowerCase() === textToMatch.toLowerCase()) return true;
            if (textToMatch.toLowerCase().includes(s.shelfName.toLowerCase())) return true;
            if (s.shelfName.toLowerCase().includes(textToMatch.toLowerCase())) return true;

            const sCode = s.shelfCode.replace('KE-', ''); // A1, B2...
            const pattern = new RegExp(`Kệ\\s*${sCode}`, 'i');
            return pattern.test(textToMatch);
          });
        }
      }

      // Nếu chưa tìm thấy từ vị trí, phân tích từ thể loại sách (category)
      if (!matchedShelf && book.category) {
        const cat = book.category.toLowerCase();
        if (cat.includes('việt nam')) matchedShelf = allShelves.find(s => s.shelfCode === 'KE-A1');
        else if (cat.includes('trinh thám') || cat.includes('bí ẩn')) matchedShelf = allShelves.find(s => s.shelfCode === 'KE-A4') || allShelves.find(s => s.shelfCode === 'KE-A2');
        else if (cat.includes('cổ điển') || cat.includes('sử thi')) matchedShelf = allShelves.find(s => s.shelfCode === 'KE-A5') || allShelves.find(s => s.shelfCode === 'KE-A2');
        else if (cat.includes('nước ngoài') || cat.includes('kinh điển') || cat.includes('thế giới')) matchedShelf = allShelves.find(s => s.shelfCode === 'KE-A2');
        else if (cat.includes('thơ') || cat.includes('tản văn')) matchedShelf = allShelves.find(s => s.shelfCode === 'KE-A3');
        else if (cat.includes('văn học')) matchedShelf = allShelves.find(s => s.shelfCode === 'KE-A1');
        else if (cat.includes('marketing') || cat.includes('bán hàng')) matchedShelf = allShelves.find(s => s.shelfCode === 'KE-B5') || allShelves.find(s => s.shelfCode === 'KE-B1');
        else if (cat.includes('tài chính') || cat.includes('đầu tư')) matchedShelf = allShelves.find(s => s.shelfCode === 'KE-B4') || allShelves.find(s => s.shelfCode === 'KE-B1');
        else if (cat.includes('kinh tế') || cat.includes('quản trị') || cat.includes('khởi nghiệp')) matchedShelf = allShelves.find(s => s.shelfCode === 'KE-B1');
        else if (cat.includes('kỹ năng') || cat.includes('bản thân')) matchedShelf = allShelves.find(s => s.shelfCode === 'KE-B2');
        else if (cat.includes('tâm lý') || cat.includes('triết học') || cat.includes('tâm linh') || cat.includes('nghệ thuật sống')) matchedShelf = allShelves.find(s => s.shelfCode === 'KE-B3');
        else if (cat.includes('lịch sử') || cat.includes('địa lý')) matchedShelf = allShelves.find(s => s.shelfCode === 'KE-C1');
        else if (cat.includes('y học') || cat.includes('sức khỏe')) matchedShelf = allShelves.find(s => s.shelfCode === 'KE-C5') || allShelves.find(s => s.shelfCode === 'KE-C2');
        else if (cat.includes('triết học') || cat.includes('xã hội')) matchedShelf = allShelves.find(s => s.shelfCode === 'KE-C4') || allShelves.find(s => s.shelfCode === 'KE-C1');
        else if (cat.includes('khoa học') || cat.includes('tri thức') || cat.includes('công nghệ')) matchedShelf = allShelves.find(s => s.shelfCode === 'KE-C2');
        else if (cat.includes('ngoại ngữ') || cat.includes('từ điển')) matchedShelf = allShelves.find(s => s.shelfCode === 'KE-C3');
        else if (cat.includes('manga') || cat.includes('truyện tranh')) matchedShelf = allShelves.find(s => s.shelfCode === 'KE-D3');
        else if (cat.includes('comic') || cat.includes('artbook')) matchedShelf = allShelves.find(s => s.shelfCode === 'KE-D4') || allShelves.find(s => s.shelfCode === 'KE-D3');
        else if (cat.includes('nuôi dạy con') || cat.includes('gia đình')) matchedShelf = allShelves.find(s => s.shelfCode === 'KE-D5') || allShelves.find(s => s.shelfCode === 'KE-D1');
        else if (cat.includes('nghệ thuật') || cat.includes('đời sống')) matchedShelf = allShelves.find(s => s.shelfCode === 'KE-D2');
        else if (cat.includes('thiếu nhi') || cat.includes('tranh truyện')) matchedShelf = allShelves.find(s => s.shelfCode === 'KE-D1');
      }

      // Nếu vẫn chưa tìm thấy, gán tạm vào Kệ A1 làm mặc định
      if (!matchedShelf) {
        matchedShelf = allShelves.find(s => s.shelfCode === 'KE-A1') || allShelves[0];
      }

      if (matchedShelf) {
        let needSave = false;
        if (!book.shelf || book.shelf.toString() !== matchedShelf._id.toString()) {
          book.shelf = matchedShelf._id;
          needSave = true;
        }
        if (book.shelfPosition !== matchedShelf.shelfName) {
          book.shelfPosition = matchedShelf.shelfName;
          needSave = true;
        }
        if (book.shelfLocation !== matchedShelf.shelfName) {
          book.shelfLocation = matchedShelf.shelfName;
          needSave = true;
        }

        if (needSave) {
          await book.save();
          migratedCount++;
        }
      }
    }

    // Đảm bảo 100% sách trong CSDL đã được gắn với 1 Kệ thực tế
    const unassignedCount = await Book.countDocuments({ shelf: null, isDeleted: { $ne: true } });
    if (unassignedCount > 0) {
      const fallbackShelf = allShelves.find(s => s.shelfCode === 'KE-A1') || allShelves[0];
      if (fallbackShelf) {
        await Book.updateMany(
          { shelf: null },
          { $set: { shelf: fallbackShelf._id, shelfPosition: fallbackShelf.shelfName, shelfLocation: fallbackShelf.shelfName } }
        );
      }
    }

    // 3. Cập nhật lại sức chứa và trạng thái thực tế cho toàn bộ các kệ
    for (const shelf of allShelves) {
      await updateShelfStatus(shelf._id);
    }
  } catch (error) {
    console.error('[Shelf Migration] Lỗi khởi tạo kệ sách:', error);
  }
};

const autoMigrateShelvesAndBooks = initAndMigrateShelves;

module.exports = {
  DEFAULT_SHELVES,
  getOrCreateBackupShelf,
  getShelfOccupancy,
  updateShelfStatus,
  updateMultipleShelves,
  checkShelfCapacity,
  resolveShelf,
  initAndMigrateShelves,
  autoMigrateShelvesAndBooks
};
