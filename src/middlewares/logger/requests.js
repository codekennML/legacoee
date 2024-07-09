const { format } = require("date-fns")
const fs =  require("node:fs")

const  AppError = require("../errors/BaseError")
const  { StatusCodes, getReasonPhrase } = require("http-status-codes")
const  { requestLogger } = require("./winston")

const durationStart  =  (res, req) => { 
   res.startTime =  process.hrtime()
}

 const logEvents = (res, req) => {
  
    const method =  req.method
    const url =  req.originalUrl ?? req.url 
    const ipAddress = req.ip ??  req.remoteAddress
    const duration  = process.hrtime(req.startTime)
    const durationInMs = duration[0] * 1000 + duration[1]/ 1e6

  try {
   
    const info =  JSON.stringify({
        method, 
        url, 
        ipAddress,
        duration : Math.round(durationInMs)
    })

    requestLogger.http(`${info}`)

  } catch (err) {
    throw new AppError(
      getReasonPhrase(StatusCodes.INTERNAL_SERVER_ERROR),
      StatusCodes.INTERNAL_SERVER_ERROR, "Error logging request")
  }
};

const logger = (req,res) => {
   logEvents(res, req)
};

module.exports = { logger, durationStart}