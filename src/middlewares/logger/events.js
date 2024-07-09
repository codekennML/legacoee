const { format } = require("date-fns")
const { v4 } = require("uuid")
const fs = require("node:fs")
const  path = require("node:path")
const AppError =  require("../errors/BaseError")
const { StatusCodes, getReasonPhrase } = require("http-status-codes")
const fsPromises = fs.promises;


 const logEvents = async (message, logFileName) => {
  const dateTime = format(new Date(), "yyyyMMdd\tHH:mm:ss");
  const logItem = `${dateTime}\t${v4()}\t${message}\n`;

  try {
    if (!fs.existsSync(path.join(__dirname, "..", "logs"))) {
      await fsPromises.mkdir(path.join(__dirname, "..", "logs"));
    }
    await fsPromises.appendFile(
      path.join(__dirname, "..", "logs", logFileName),
      logItem
    );
  } catch (err) {
    throw new AppError(
      getReasonPhrase(StatusCodes.INTERNAL_SERVER_ERROR),
      StatusCodes.INTERNAL_SERVER_ERROR, "Error: Log directory creation failed")
  }
};

const logger = (res,  req) => {
  logEvents(`${req.method}\t${req.url}\t${req.headers.origin}`, "reqLog.log");
  console.log(`${req.method} ${req.path}`);

};


module.exports =  { logEvents, logger}