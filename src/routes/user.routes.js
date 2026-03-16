import { Router } from "express";
import { registerUser } from "../controllers/user.controller.js";

const router = Router();

router.route("/register").post(registerUser); // http://localhost:5000/api/v1/usersregister => This is how the url becomes

export default router;
