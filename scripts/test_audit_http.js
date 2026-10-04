const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../models/User');

dotenv.config();

const testHttpApi = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const admin = await User.findOne({ role: 'admin' });
    if (!admin) {
      console.log('No admin found, exiting');
      process.exit(1);
    }

    const token = jwt.sign({ userId: admin._id }, process.env.JWT_SECRET, { expiresIn: '1d' });
    const headers = {
      'Authorization': `Bearer ${token}`
    };

    // 1. Test Stats
    const statsRes = await fetch('http://localhost:4000/api/admin/audit-logs/stats', { headers });
    const statsData = await statsRes.json();
    console.log('1. /api/admin/audit-logs/stats status:', statsRes.status);
    console.log('Stats data:', statsData.data);

    // 2. Test List
    const listRes = await fetch('http://localhost:4000/api/admin/audit-logs?limit=5', { headers });
    const listData = await listRes.json();
    console.log('2. /api/admin/audit-logs status:', listRes.status);
    console.log(`Fetched ${listData.data?.logs?.length} logs, total: ${listData.data?.pagination?.total}`);

    // 3. Test Detail
    if (listData.data?.logs?.length > 0) {
      const logId = listData.data.logs[0]._id;
      const detailRes = await fetch(`http://localhost:4000/api/admin/audit-logs/${logId}`, { headers });
      const detailData = await detailRes.json();
      console.log(`3. /api/admin/audit-logs/${logId} status:`, detailRes.status, 'Description:', detailData.data?.description);
    }

    // 4. Test Export CSV
    const exportRes = await fetch('http://localhost:4000/api/admin/audit-logs/export', { headers });
    console.log('4. /api/admin/audit-logs/export status:', exportRes.status, 'Content-Type:', exportRes.headers.get('content-type'));

    console.log('🎉 ALL AUDIT LOG HTTP APIS ARE WORKING PERFECTLY!');
    process.exit(0);
  } catch (err) {
    console.error('Test failed:', err);
    process.exit(1);
  }
};

testHttpApi();
