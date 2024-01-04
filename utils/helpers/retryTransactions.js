const mongoose = require("mongoose");
const AppError = require("../../errors/BaseError");



const retryTransaction = async (baseFunction, retryCount, args) => {
  let retries = 0;
  let success = false;
  let processingError;

  while (retries < retryCount) {
    const session = await mongoose.startSession();

    try {
      const result = await baseFunction(session, args);
      success = true;
      return result;
    } catch (error) {
      console.error(
        `Transaction failed. Retry ${retries + 1}/${retryCount} | ${error}`
      );
      processingError = error;
      retries++;
    } finally {
      session.endSession();
    }

    if (success) {
      break; // Exit the loop if the transaction was successful
    }
  }

  if (!success) {
    throw new AppError(
      processingError.message,
      processingError.loggerMessage,
      processingError.statusCode
    );
    // return { data: null, error: processingError };
  }
};

module.exports = { retryTransaction };
