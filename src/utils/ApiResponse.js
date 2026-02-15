class ApiResponse {
  constructor(statusCode, data, message = "Success") {
    this.statusCode = statusCode;
    this.data = data;
    this.message = message;
    this.success = statusCode < 400;
  }
}
// This class is used to create a standard API response structure.
// Instead of writing response JSON manually every time, you create an object of this class.

export { ApiResponse };
