const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { isR2Configured } = require('../services/storageService');

const uploadDir = path.join(__dirname, '../../uploads');

// Ensure upload directories exist
const dirs = ['avatars', 'photos', 'videos', 'voice', 'files'];
dirs.forEach(dir => {
  const target = path.join(uploadDir, dir);
  if (!fs.existsSync(target)) {
    fs.mkdirSync(target, { recursive: true });
  }
});

// Use memory storage when R2 is configured so we can pipe to R2
// Otherwise use disk storage as before
const storage = isR2Configured()
  ? multer.memoryStorage()
  : multer.diskStorage({
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

// Helper to get filename for memory storage uploads
upload.getFilename = (file) => {
  const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
  const ext = path.extname(file.originalname) || (file.fieldname === 'voice' ? '.webm' : '');
  return `${file.fieldname}-${uniqueSuffix}${ext}`;
};

module.exports = upload;
