import multer from "multer";
// Multer = middleware for handling multipart/form-data (file uploads)

// We are storing files on disk (local system)
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./public/temp");
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  },
});

export const upload = multer({ storage });
// This creates middleware: upload = configured multer
