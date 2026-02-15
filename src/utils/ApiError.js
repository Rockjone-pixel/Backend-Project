// ApiError is a custom error class that extends the built-in Error class to standardize API
//  error responses with status code, message, success flag, optional detailed errors, and a properly handled stack trace.

class ApiError extends Error {
  constructor(
    statusCode,
    message = "Something went wrong",
    errors = [],
    stack = ""
  ) {
    super(message); // Since we extend Error, we must call super().
    this.statusCode = statusCode;
    this.data = null;
    this.message = message;
    this.success = false;
    this.errors = errors;

    // This part controls how stack trace is handled.
    // Stack trace shows:
    //     Where the error happened
    //     File name
    //     Line number
    //     Call chain
    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
      // This :-
      // Captures current stack
      // Removes constructor call from stack trace
      // Makes stack cleaner
      //       This is Node.js specific feature.
    }
  }
}

export { ApiError };
