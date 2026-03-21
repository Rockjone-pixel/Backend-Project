import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";

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
      $set: {
        refreshToken: undefined,
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

export { registerUser, logInUser, logOutUser, refreshAccessToken };