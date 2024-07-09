const AppError = require("../../middlewares/errors/BaseError");

const tryCatch = (controller) => async (res, req) => {
  try {
     await controller(res, req);
  } catch (error) {
   
    let response;

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


module.exports = tryCatch;
