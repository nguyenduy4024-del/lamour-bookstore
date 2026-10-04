const mongoose = require('mongoose');
const dotenv = require('dotenv');
const AuditLog = require('../models/AuditLog');

dotenv.config();

const testAuditEndpoints = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB Connected for testing...');

    const total = await AuditLog.countDocuments();
    console.log(`✅ Total Audit Logs in DB: ${total}`);

    const criticals = await AuditLog.find({ severity: 'CRITICAL' });
    console.log(`✅ Critical Logs count: ${criticals.length}`);

    const firstLog = await AuditLog.findOne().sort({ createdAt: -1 });
    console.log(`✅ Latest Audit Log:`, {
      id: firstLog._id,
      module: firstLog.module,
      action: firstLog.action,
      severity: firstLog.severity,
      description: firstLog.description,
      diffCount: firstLog.diff?.length || 0
    });

    console.log('🎉 Audit Log models and database verification passed!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Test failed:', err);
    process.exit(1);
  }
};

testAuditEndpoints();
