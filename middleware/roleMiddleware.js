const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        message: `Tài khoản với quyền ${req.user ? req.user.role : 'khách'} không được phép truy cập đường dẫn này`
      });
    }
    next();
  };
};

module.exports = { authorizeRoles };