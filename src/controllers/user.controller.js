import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

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

  const existedUser = await User.findOne({
    $or: [{ email }, { username }],
  }); // This is a very important MongoDB query, used for checking duplicates before user registration.
  //  Checks "Is there ANY user in the database whose email OR username matches this input?"

  if (existedUser) {
    throw new ApiError(409, "User with this email or username already exists!");
  }

  console.log(req.files);

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

export { registerUser };
