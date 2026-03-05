const multer = require('multer');
const path = require('path');
const fs = require('fs');

const allowedUploadMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
const uploadRoot = path.join(__dirname, '../../uploads');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, callback) => {
    if (!allowedUploadMimeTypes.has(String(file.mimetype || '').toLowerCase())) {
      callback(new Error('unsupported_file_type'));
      return;
    }
    callback(null, true);
  }
});

function ensureUploadPath(fileName) {
  const normalized = path.normalize(String(fileName || ''));
  if (normalized.startsWith('..') || path.isAbsolute(normalized)) throw new Error('invalid_upload_path');
  const fullPath = path.join(uploadRoot, normalized);
  const resolvedRoot = path.resolve(uploadRoot);
  const resolvedPath = path.resolve(fullPath);
  if (!resolvedPath.startsWith(`${resolvedRoot}${path.sep}`) && resolvedPath !== resolvedRoot) {
    throw new Error('invalid_upload_path');
  }
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  return fullPath;
}

function statusToProgress(status) {
  switch (status) {
    case 'uploaded': return 10;
    case 'processing': return 60;
    case 'needs_confirmation': return 90;
    case 'processed':
    case 'finalized': return 100;
    default: return 0;
  }
}

module.exports = { upload, ensureUploadPath, statusToProgress };
