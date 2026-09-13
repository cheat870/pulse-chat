const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const path = require('path');
const fs = require('fs');

// Cloudflare R2 configuration
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;
const R2_PUBLIC_DOMAIN = process.env.R2_PUBLIC_DOMAIN; // e.g. "https://pub-xxx.r2.dev" or custom domain

let s3Client = null;

function isR2Configured() {
  return Boolean(R2_ACCOUNT_ID && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY && R2_BUCKET_NAME);
}

if (isR2Configured()) {
  s3Client = new S3Client({
    region: 'auto',
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY
    }
  });
  console.log('☁️ Cloudflare R2 Media Storage configured for bucket:', R2_BUCKET_NAME);
} else {
  console.log('📁 Local Disk Media Storage in use (/uploads). Set R2_* env vars to enable Cloudflare R2.');
}

/**
 * Uploads a file either to Cloudflare R2 or to local /uploads disk
 * @param {Object} file - Multer file object or { buffer, filename, mimetype, folder }
 * @returns {Promise<string>} - The public URL or local path (/uploads/...)
 */
async function uploadMedia(file, folder = 'files') {
  if (!file) return null;

  const buffer = file.buffer || (file.path ? fs.readFileSync(file.path) : null);
  // memory storage doesn't set file.filename — generate a unique one
  const ext = path.extname(file.originalname || '') || '';
  const filename = file.filename || `${file.fieldname || 'upload'}-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
  const mimetype = file.mimetype || 'application/octet-stream';
  const key = `${folder}/${filename}`;

  // If R2 is configured, upload to Cloudflare R2
  if (isR2Configured() && s3Client && buffer) {
    try {
      await s3Client.send(new PutObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: key,
        Body: buffer,
        ContentType: mimetype
      }));

      // Delete local temp file if multer saved to disk
      if (file.path && fs.existsSync(file.path)) {
        try { fs.unlinkSync(file.path); } catch {}
      }

      // Return public URL
      if (R2_PUBLIC_DOMAIN) {
        const base = R2_PUBLIC_DOMAIN.replace(/\/+$/, '');
        return `${base}/${key}`;
      }
      return `https://${R2_BUCKET_NAME}.${R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${key}`;
    } catch (err) {
      console.error('Cloudflare R2 Upload Error, falling back to local:', err);
    }
  }

  // Fallback: local disk URL
  return `/uploads/${folder}/${filename}`;
}

/**
 * Deletes a media file from R2 or local disk
 */
async function deleteMedia(mediaUrl) {
  if (!mediaUrl) return;

  if (isR2Configured() && s3Client && mediaUrl.startsWith('http')) {
    try {
      const urlObj = new URL(mediaUrl);
      const key = urlObj.pathname.replace(/^\/+/, '');
      await s3Client.send(new DeleteObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: key
      }));
    } catch (err) {
      console.warn('R2 Delete Error:', err.message);
    }
    return;
  }

  // Local file delete
  if (mediaUrl.startsWith('/uploads/')) {
    const localPath = path.join(__dirname, '../../', mediaUrl);
    if (fs.existsSync(localPath)) {
      try { fs.unlinkSync(localPath); } catch {}
    }
  }
}

module.exports = {
  isR2Configured,
  uploadMedia,
  deleteMedia
};
