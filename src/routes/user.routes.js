import { Router } from "express";
import { registerUser } from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";

const router = Router();

router.route("/register").post(
  upload.fields([
    {
      name: "avatar",
      maxCount: 1,
    },
    {
      name: "coverImage",
      maxCount: 1,
    },
  ]),
  registerUser
); // http://localhost:5000/api/v1/users/register => This is how the url becomes

export default router;

// Route → Middleware → Controller → DB + Cloudinary
// That’s exactly how real backend systems work
