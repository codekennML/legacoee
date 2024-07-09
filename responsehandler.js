
const  AppError = require("./src/middlewares/errors/BaseError")
const { StatusCodes, getReasonPhrase } = require("http-status-codes")

const MAX_BODY_SIZE = 2 ** 20; // 1MB

const responseHandler = (
  basefn
) => {


  return async (res, req) => {
    res.onAborted(() => {
      res.aborted = true;
    });


    if (!res.aborted) {
      let response;

      try {
        response = await basefn(res, req);
      } catch (error) {
        console.log("log", error);
        if (error instanceof AppError) {
          response = {
            errMsg: error.message,
            status: error.statusCode,
            error: true,
          };
        } else {
          response = {
            error: true,
            errMsg: getReasonPhrase(StatusCodes.INTERNAL_SERVER_ERROR),
            status: StatusCodes.INTERNAL_SERVER_ERROR,
          };
        }
      }

      res.cork(() => {
        res
          .writeStatus(JSON.stringify(response.status))
          .end(JSON.stringify(response?.data ?? response.errMsg));
      });
    }
  };
};

const readJSON = (res) =>  {
  return new Promise((resolve, reject) => {
    const buffer  = [];

    res.onData((dataChunk,  isLast) => {

      console.log(dataChunk, "adatagsnd")
      const chunk = Buffer.from(dataChunk);

      if (isLast) {
        try {
          if (buffer.length > 0) {
            buffer.push(chunk);
            const concatenatedBuffer = Buffer.concat(buffer);
            if (concatenatedBuffer.length > MAX_BODY_SIZE) {
              throw new Error("Payload too large");
            }
            const jsonString = concatenatedBuffer.toString("utf-8");
            const json = JSON.parse(jsonString);
            resolve(json);
          } else {

            console.log(buffer.length)
            if (chunk.length > MAX_BODY_SIZE) {
              throw new Error("Payload too large");
            }
            console.log(chunk.toString("utf-8"))
            const json = JSON.parse(chunk.toString("utf-8"));
            resolve(json);
          }
        } catch (e) {
          // Log or handle the error
          console.error("Error parsing JSON:", e);
          reject(e);
        }
      } else {
        buffer.push(chunk);
      }
    });
  });
}

module.exports = {responseHandler, readJSON};
