import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

// Token Generator Function :-
const generateAccessAndRefreshTokens = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "Something went wrong while generating Access and Refersh Toekns!"
    );
  }
};

// User Registration
const registerUser = asyncHandler(async (req, res) => {
  //                       Steps to register user :-

  // get user details from frontend
  // validation - not empty
  // check if user already exists: username, email
  // check for images, check for avatar
  // upload them to cloudinary, avatar
  // create user object - create entry in db
  // remove password and refresh token field from response
  // check for user creation
  // return res

  const { fullName, email, password, username } = req.body;

  // console.log("email: ", email);

  // if (fullName === "") {
  //   throw new ApiError(400, "Full name is required");
  // }

  if (
    [fullName, email, username, password].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "All fields are required");
  }
  // .some(condition) returns true if at least one element satisfies the condition

  // MongoDB $or:- “Find user with same email OR username”
  const existedUser = await User.findOne({
    $or: [{ email }, { username }],
  }); // This is a very important MongoDB query, used for checking duplicates before user registration.
  //  Checks "Is there ANY user in the database whose email OR username matches this input?"

  if (existedUser) {
    throw new ApiError(409, "User with this email or username already exists!");
  }

  // console.log(req.files);

  const avatarLocalPath = req.files?.avatar?.[0]?.path;
  // The above line basically mean “Give me the local file path of uploaded avatar, if it exists”
  // const coverImageLocalPath = req.files?.coverImage?.[0]?.path;

  let coverImageLocalPath;
  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImageLocalPath = req.files.coverImage[0].path;
  }

  //   req.files = a folder
  //   avatar = a file inside folder
  //   [0] = first copy
  //   .path = where it is stored

  // Make sure avatar file is provided as it's a required field for registration
  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is required");
  }

  // Next step is to upload the avatar and cover image (if provided) to Cloudinary and get their URLs
  // Converts local file → URL
  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!avatar) {
    throw new ApiError(400, "Avatar file is required");
  }

  // Make entry in the database for the new user
  const user = await User.create({
    fullName,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    email,
    password,
    username: username.toLowerCase(),
  });

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken" // This is a very important MongoDB query, used for hiding sensitive fields before sending
    // the user data in response.
    // Note :- Minus sign (-) means EXCLUDE
  );

  if (!createdUser) {
    throw new ApiError(500, "Something went wrong while registering the user!");
  }

  return res
    .status(201)
    .json(new ApiResponse(201, createdUser, "User registered Successfully!"));
});

// User LogIn
const logInUser = asyncHandler(async (req, res) => {
  //                       Steps to register user :-

  // req body -> data
  // username or email
  // find the user
  // password check
  // access and refresh token
  // send cookie

  const { email, username, password } = req.body;

  if (!(username || email)) {
    throw new ApiError(400, "username or email is required!");
  }

  const user = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (!user) {
    throw new ApiError(404, "User does not exist!");
  }

  const isPasswordValid = await user.isPasswordCorrect(password);
  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid User Credentials!");
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    user._id
  );

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  const options = {
    httpOnly: true,
    secure: true,
  };
  // NOTE:- "httpOnly" hides cookie from JS, and "secure" ensures it’s sent only over HTTPS

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser,
          accessToken,
          refreshToken,
        },
        "User Logged In Successfully!"
      )
    );
});

// User LogOut
const logOutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $unset: {
        refreshToken: 1, // this removes the field from document
      },
    },
    {
      new: true,
    }
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User Logged Out!"));
});

// Renew Access and Refresh Tokens
const refreshAccessToken = asyncHandler(async (req, res) => {
  //                    Step 1: Client sends refreshToken
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;

  //                    Step 2: Check if token exists
  if (!incomingRefreshToken) throw new ApiError(401, "Unauthorized request!");

  try {
    //                   Step 3: Verify token
    // If valid → gives payload (user info)
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    //                    Step 4: Find user
    // Confirms:
    //  user still exists
    //  token belongs to valid user
    const user = await User.findById(decodedToken?._id);

    if (!user) throw new ApiError(401, "Invalid Refresh Token!");

    //                     Step 5: Compare with DB token
    // This is security layer
    //                        Why?
    // Because:
    //    Only latest refreshToken is valid
    //    Old tokens = rejected ❌

    // Prevents:
    //     token reuse attacks
    //     session hijacking
    if (incomingRefreshToken != user?.refreshToken)
      throw new ApiError(401, "Refresh Token is expired or used!");

    const options = {
      httpOnly: true,
      secure: true,
    };

    //                        Step 6: Generate new tokens
    // This creates new accessToken , creates new refreshToken and updates DB with new refreshToken
    const { accessToken, refreshToken: newRefreshToken } =
      await generateAccessAndRefreshTokens(user._id);

    //.                       Step 7: Send new tokens
    //  👉 Old tokens replaced
    //  👉 User stays logged in seamlessly ✅
    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(
        new ApiResponse(
          200,
          { accessToken, refreshToken: newRefreshToken },
          "Access Token refreshed successfully!"
        )
      );
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid Refresh Token!");
  }
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  const user = await User.findById(req.user?._id);
  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

  if (!isPasswordCorrect) throw new ApiError(400, "Invalid old Password!");

  user.password = newPassword;
  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password changed successfully!"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, "User fetched successfully!"));
});

const updateAccountDetails = asyncHandler(async (req, res) => {
  const { fullName, email } = req.body;

  if (!fullName || !email) throw new ApiError(400, "All fields are required!");

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        fullName,
        email: email,
      },
    },
    { new: true }
  ).select("-password");
  // MongoDB $set means: " Update only these fields "
  // true → return updated document
  // false → return old document

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Account details Updated Successfully!"));
});

const updateUserAvatar = asyncHandler(async (req, res) => {
  const avatarLocalPath = req.file?.path;

  if (!avatarLocalPath) throw new ApiError(400, "Avatar file is missing!");

  const avatar = await uploadOnCloudinary(avatarLocalPath);

  if (!avatar.url)
    throw new ApiError(400, "Error while uploading on Cloudinary!");

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        avatar: avatar.url,
      },
    },
    { new: true }
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Avatar image updated successfully!"));
});

const updateUserCoverImage = asyncHandler(async (req, res) => {
  const coverImageLocalPath = req.file?.path;

  if (!coverImageLocalPath)
    throw new ApiError(400, "Cover image file is missing!");

  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!coverImage.url)
    throw new ApiError(400, "Error while uploading on Cloudinary!");

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        coverImage: coverImage.url,
      },
    },
    { new: true }
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Cover image updated successfully!"));
});

const getUserChannelProfile = asyncHandler(async (req, res) => {
  // Get "username" from URL
  const { username } = req.params;

  // Ensures username is not empty or just spaces
  if (!username?.trim()) throw new ApiError(400, "Username is missing!");

  // Using MongoDB aggregation to combine multiple operations efficiently
  const channel = await User.aggregate([
    {
      // Finds user with given username
      $match: {
        username: username?.toLowerCase(),
      },
    },
    {
      // Get subscribers
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "channel",
        as: "subscribers",
        // Joins "subscriptions" collection
        // Finds users who subscribed to this channel
      },
    },
    {
      // Get subscribed channels
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "subscriber",
        as: "subscribedTo",
        // Finds channels this user has subscribed to
      },
    },
    {
      // Add computed fields
      $addFields: {
        subscribersCount: {
          $size: "$subscribers", // Counts number of subscribers
        },
        channelsSubscribedToCount: {
          $size: "$subscribedTo", // Counts how many channels user subscribed to
        },
        // Is current user subscribed ?
        isSubscribed: {
          $cond: {
            if: { $in: [req.user?._id, "$subscribers.subscriber"] },
            then: true,
            else: false,
            // Logic :- Checks if logged-in user ID exists in subscribers list
          },
        },
      },
    },
    {
      $project: {
        fullName: 1,
        username: 1,
        subscribersCount: 1,
        channelsSubscribedToCount: 1,
        isSubscribed: 1,
        avatar: 1,
        coverImage: 1,
        email: 1,
      },
      // Only returns required fields
    },
  ]);

  // If no user found → throw error
  if (!channel?.length) throw new ApiError(404, "Channel does not exist!");

  // It fetches a user's channel profile along with:\
  //   Subscriber count

  //    Number of channels they subscribed to

  //    Whether the current logged-in user is subscribed

  return res
    .status(200)
    .json(
      new ApiResponse(200, channel[0], "User channel fetched successfully!")
    );
});

const getWatchHistory = asyncHandler(async (req, res) => {
  const user = await User.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(req.user._id),
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "watchHistory",
        foreignField: "_id",
        as: "watchHistory",
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "owner",
              pipeline: [
                {
                  $project: {
                    fullName: 1,
                    username: 1,
                    avatar: 1,
                  },
                },
              ],
            },
          },
          {
            $addFields: {
              owner: {
                $first: "$owner",
              },
            },
          },
        ],
      },
    },
  ]);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        user[0].watchHistory,
        "Watch History fetched successfully!"
      )
    );
});

export {
  registerUser,
  logInUser,
  logOutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateAccountDetails,
  updateUserAvatar,
  updateUserCoverImage,
  getUserChannelProfile,
  getWatchHistory,
};
