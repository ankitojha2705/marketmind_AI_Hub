const path = require('path');
const fs = require('fs');
const multer = require('multer');

const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads', 'brand-logos');

const extForMime = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

function ensureUploadDir() {
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }
}

/**
 * Multer instance: single file field "logo", disk storage keyed by brand id + extension.
 */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    ensureUploadDir();
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const mime = (file.mimetype || '').toLowerCase();
    const ext = extForMime[mime] || '.bin';
    cb(null, `${req.params.brandId}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (extForMime[(file.mimetype || '').toLowerCase()]) {
      cb(null, true);
    } else {
      cb(new Error('Only PNG, JPEG, WebP, and GIF images are allowed'));
    }
  },
});

module.exports = {
  logoUpload: upload,
  UPLOAD_DIR,
  extForMime,
};
