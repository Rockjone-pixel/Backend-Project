import mongoose, { Schema } from "mongoose";
import bcrypt from "bcrypt"; // Used to hash passwords
import jwt from "jsonwebtoken"; // Used to create authentication tokens

const userSchema = new Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      // trim: true automatically removes whitespace from the beginning and end of a string before saving it to the database.
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    avatar: {
      type: String, // Cloudinary URL
      required: true,
    },
    coverImage: {
      type: String, // Cloudinary URL
    },
    watchHistory: [
      {
        type: Schema.Types.ObjectId,
        ref: "Video",
      },
    ],
    password: {
      type: String,
      required: [true, "Password is required"],
    },
    refreshToken: {
      type: String,
    },
  },
  { timestamps: true }
);

// PASSWORD HASHING (PRE SAVE HOOK) :-
userSchema.pre("save", async function () {
  if (!this.isModified("password")) return; // Only hash the password if it has been modified (or is new)

  this.password = await bcrypt.hash(this.password, 10);
});

// PASSWORD CHECK METHOD :-
userSchema.methods.isPasswordCorrect = async function (password) {
  return await bcrypt.compare(password, this.password);
};

// Creating JWT Access Tokens (METHODS) :-
userSchema.methods.generateAccessToken = function () {
  return jwt.sign(
    {
      _id: this._id,
      username: this.username,
      email: this.email,
      fullName: this.fullName,
    },
    process.env.ACCESS_TOKEN_SECRET,
    {
      expiresIn: process.env.ACCESS_TOKEN_EXPIRY,
    }
  );
};
// Used for :- Authentication (logged-in user identity)

// Creating JWT Refresh Tokens (METHODS) :-
userSchema.methods.generateRefreshToken = function () {
  return jwt.sign(
    {
      _id: this._id,
    },
    process.env.REFRESH_TOKEN_SECRET,
    {
      expiresIn: process.env.REFRESH_TOKEN_EXPIRY,
    }
  );
};
// Used for :- Generating new Access Tokens when the old one expires, without requiring the user to log in again.

// Both are JWT tokens, but Access Token is short-lived and used for authentication, while
//  Refresh Token is long-lived and used to obtain new Access Tokens without requiring the user to log in again.

// Access Token → short-lived → used to access APIs
// Refresh Token → long-lived → used to get new access tokens

export const User = mongoose.model("User", userSchema);
