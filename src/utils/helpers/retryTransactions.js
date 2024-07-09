
import mongoose, { ClientSession } from "mongoose";

export const retryTransaction = async (
  baseFunction,
  retryCount,
  args
) => {
  let retries = 0;
  let processingError

  while (retries < retryCount) {
    const session = await mongoose.startSession();
    try {
      const result = await baseFunction(args, session);
      await session.commitTransaction();
      return result;
    } catch (error) {
      processingError = error 
      retries++;
    } finally {
      session.endSession();
    }
  }
  throw processingError;

};


module.exports = { retryTransaction };
