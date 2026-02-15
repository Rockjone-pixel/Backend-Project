// require("dotenv").config({ path: "./env" });

import dotenv from "dotenv";

// import mongoose from "mongoose";
// import { DB_NAME } from "./constants.js";

import connectDB from "./db/index.js";
import { app } from "./app.js";

dotenv.config({
  path: "./env",
});

connectDB()
  .then(() => {
    const server = app.listen(process.env.PORT || 4000, () => {
      console.log(`Server is running at port : ${process.env.PORT}`);
    });

    server.on("error", (error) => {
      console.log("Server Error:", error);
      process.exit(1);
    });
  })
  .catch((err) => {
    console.log("Mongo DB connection failed !!!", err);
    process.exit(1);
  });

/*

import express from "express";
const app = express();

// Immediately Invoked Async Function (IIFE) =>
// This is an async function that runs immediately.
(async () => {
  try {
    await mongoose.connect(`${process.env.MONGO_URI}/${DB_NAME}`);
    app.on("error", (error) => {
      console.log("ERRR: ", error);
      throw error;
    });

    // This runs only if MongoDB connected successfully.
    app.listen(process.env.PORT, () => {
      console.log(`App is running on port ${process.env.PORT}`);
    });
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
    throw error;
  }
})();

*/
