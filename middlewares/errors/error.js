const { errorLogger, combinedLogger } = require("../middleware/logger/winston");
const AppError = require("./BaseError");
const rtracer  =  require("cls-rtracer")

const errorHandler = (error, req, res, next) => {
  const requestId  =  rtracer.id()
  
 const errorData = {
        requestId : requestId, 
        reasons : error?.reason,
        message : error?.loggerMessage
      }

  if (error instanceof AppError && error.statusCode) {

    //Bad requests with validation errors
    // if (error.reason) {
 
    process.env === "production" ? 
      errorLogger.error(`${JSON.stringify(errorData)}`) : console.log(errorData)

  
      return res.status(error.statusCode).json({
        status: error.statusCode,
        message: error?.reason ?? error?.message,
      });

 
  }

    process.env === "production" ? 
      errorLogger.error(`${JSON.stringify({...errorData,         stack : error?.stack})}`) : console.log({...errorData,         stack : error?.stack})

  return res.status(500).send("Something went wrong");
};

module.exports = errorHandler;
