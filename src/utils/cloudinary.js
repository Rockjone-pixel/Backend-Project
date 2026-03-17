import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

// This connects our app to your Cloudinary account
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) return null;

    // Upload the File to Cloudinary
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto", // Detects type automatically (image, video, etc.)
    });
    // File has been uploaded successfully
    // console.log("File uploaded to Cloudinary successfully", response.url);

    fs.unlinkSync(localFilePath); // Delete the local file after successful upload

    return response;
  } catch (error) {
    console.log("Cloudinary Error:", error);

    if (localFilePath && fs.existsSync(localFilePath)) {
      fs.unlinkSync(localFilePath); // Clean up local file if it exists, even in case of an error during upload
    }
    // fs.existsSync(localFilePath) checks if the file exists at the given path

    return null;
  }
};

export { uploadOnCloudinary };
