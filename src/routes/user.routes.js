import { Router } from "express";
import {
  registerUser,
  logInUser,
  logOutUser,
  refreshAccessToken
} from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

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

router.route("/login").post(logInUser);

// secured routes
router.route("/logout").post(verifyJWT, logOutUser);
router.route("/refresh-token").post(refreshAccessToken)

export default router;

// Route → Middleware → Controller → DB + Cloudinary
// That’s exactly how real backend systems work
