const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadDir = path.join(__dirname, '../../uploads');

// Ensure upload directories exist
const dirs = ['avatars', 'photos', 'videos', 'voice', 'files'];
dirs.forEach(dir => {
  const target = path.join(uploadDir, dir);
  if (!fs.existsSync(target)) {
    fs.mkdirSync(target, { recursive: true });
  }
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let folder = 'files';
    if (file.fieldname === 'avatar') {
      folder = 'avatars';
    } else if (file.mimetype.startsWith('image/')) {
      folder = 'photos';
    } else if (file.mimetype.startsWith('video/')) {
      folder = 'videos';
    } else if (file.mimetype.startsWith('audio/') || file.fieldname === 'voice') {
      folder = 'voice';
    }
    cb(null, path.join(uploadDir, folder));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname) || (file.fieldname === 'voice' ? '.webm' : '');
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB max file size
});

module.exports = upload;
