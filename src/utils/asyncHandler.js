// This asyncHandler wraps route handlers in a Promise and forwards any errors to Express’s global
// error middleware using next(err), making async error handling clean and centralized.

const asyncHandler = (requestHandler) => {
  return (req, res, next) => {
    Promise.resolve(requestHandler(req, res, next)).catch((err) => next(err));
  };
};

export { asyncHandler }; // → ES Modules (ESM)
//  module.exports = { asyncHandler } → CommonJS

//             The overall flow of asyncHandler in Express routes:

// Express calls route
//        │
//        ▼
// asyncHandler wrapper
//        │
//        ▼
// requestHandler(req,res,next)
//        │
//        ▼
// async function executes
//        │
//        ├── success → response sent
//        │
//        └── error → Promise rejected
//                      │
//                      ▼
//                   catch()
//                      │
//                      ▼
//                  next(err)

// asyncHandler is a higher-order function that wraps async Express route handlers and automatically catches errors

// const asyncHandler = (fn) => async (req, res, next) => {
//   try {
//     await fn(req, res, next);
//   } catch (error) {
//     res.status(error.code || 500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };
