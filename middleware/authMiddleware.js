const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  let token = req.cookies && req.cookies.jwt;

  if (!token && req.headers && req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    const bearer = req.headers.authorization.split(' ')[1];
    if (bearer && bearer !== 'null' && bearer !== 'undefined') {
      token = bearer;
    }
  }

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.userId).select('-password');
      
      if (!req.user) {
        return res.status(401).json({ message: 'Không tìm thấy người dùng' });
      }

      if (!req.user.isActive || req.user.status === 'blocked') {
        return res.status(401).json({ message: 'Tài khoản đã bị khóa' });
      }

      next();
    } catch (error) {
      console.error(error);
      res.status(401).json({ message: 'Không được phép truy cập, token hỏng' });
    }
  } else {
    res.status(401).json({ message: 'Không được phép truy cập, không có token' });
  }
};

module.exports = { protect };