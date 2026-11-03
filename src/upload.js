const multer = require('multer');

// Files land in memory (req.file.buffer) rather than on local disk — the
// controllers upload that buffer straight to Cloudflare R2, which is what
// actually survives redeploys (see src/lib/storage.js).
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB, matches the old artifact's limit
  fileFilter: (req, file, cb) => {
    if (/^image\/|^video\//.test(file.mimetype)) cb(null, true);
    else cb(new Error('Only image or video files are allowed.'));
  },
});

// Wraps upload.single() so file-size/type errors resolve to a clean 400
// instead of falling through to the generic 500 error handler.
function uploadSingle(field, shortVideo = false) {
  const selectedUpload = shortVideo ? multer({
    storage: multer.memoryStorage(), limits: { fileSize: 100 * 1024 * 1024 },
    fileFilter: (req, file, cb) => /^image\/|^video\//.test(file.mimetype) ? cb(null, true) : cb(new Error('Only image or video files are allowed.')),
  }) : upload;
  return (req, res, next) => {
    selectedUpload.single(field)(req, res, (err) => {
      if (err) return res.status(400).json({ error: err.message || 'Could not process that file.' });
      if (req.file && !req.file.mimetype.startsWith('video/') && req.file.size > 20 * 1024 * 1024) return res.status(400).json({ error: 'Photos must be 20 MB or smaller.' });
      next();
    });
  };
}

module.exports = { uploadSingle };
