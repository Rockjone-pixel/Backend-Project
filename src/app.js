import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();

app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  })
); // Enables Cross-Origin Resource Sharing (CORS).
// origin: process.env.CORS_ORIGIN    ==>   Allows requests only from a specific origin.

// credentials: true    ==>  Allows: Cookies , Authorization headers and Sessions
// Without this, cookies won’t be sent cross-origin.

app.use(express.json({ limit: "16kb" })); // Parses incoming JSON request bodies.
app.use(express.urlencoded({ extended: true, limit: "16kb" })); // Parses form data (from HTML forms).
app.use(express.static("public")); // Serves static files from the public folder.
app.use(cookieParser()); // Parses cookies from incoming requests.

export { app };
