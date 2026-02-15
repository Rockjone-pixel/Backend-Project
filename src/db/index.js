import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";

const connectDB = async () => {
  try {
    const connectionInstance = await mongoose.connect(
      `${process.env.MONGO_URI}/${DB_NAME}`
    );

    console.log(
      `MongoDB connected !! DB Host : ${connectionInstance.connection.host}`
      // connectionInstance.connection.host returns the hostname of the MongoDB server that Mongoose successfully
      // connected to, which helps confirm and debug database connections.
    );
  } catch (error) {
    console.log("MongoDB connection error:", error);
    process.exit(1);
  }
};

export default connectDB;
