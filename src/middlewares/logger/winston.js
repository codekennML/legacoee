const  winston = require( "winston")
const  path = require( "node:path")
const  fs = require( "node:fs")
const  { BaselimeTransport } = require('@baselime/winston-transport')
const { NodeTracerProvider } = require('@opentelemetry/sdk-trace-node')
const  logsAPI = require('@opentelemetry/api-logs')
const   {
  LoggerProvider,
  SimpleLogRecordProcessor,
  ConsoleLogRecordExporter,
} = require('@opentelemetry/sdk-logs')

const { WinstonInstrumentation } = require('@opentelemetry/instrumentation-winston')
const { registerInstrumentations } = require('@opentelemetry/instrumentation')

const tracerProvider = new NodeTracerProvider();
tracerProvider.register();

// To start a logger, you first need to initialize the Logger provider.
const loggerProvider = new LoggerProvider();
// Add a processor to  log record
loggerProvider.addLogRecordProcessor(
    new SimpleLogRecordProcessor(new ConsoleLogRecordExporter())
);
logsAPI.logs.setGlobalLoggerProvider(loggerProvider);

registerInstrumentations({
    instrumentations: [
        new WinstonInstrumentation({
        }),
    ],
});




const BASELIME_API_KEY =  process.env.BASELIME_KEY 

//Create zip archive
// async function createZipArchive(logFiles, zipFilePath) {
//   const output = fs.createWriteStream(zipFilePath);
//   const archive = archiver("zip", { zlib: { level: 9 } });

//   return new Promise((resolve, reject) => {
//     output.on("close", resolve);
//     archive.on("error", reject);

//     archive.pipe(output);
//     logFiles.forEach((file) => {
//       const filename = path.basename(file);
//       archive.file(file, { name: filename });
//     });

//     archive.finalize();
//   });
// }

// upload log to cloud service
// async function uploadLogFilesToCloudService() {
//   const currentDate = new Date();
//   const datePattern = currentDate.toISOString().slice(0, 10); // Format: YYYY-MM-DD

//   const logFiles = fs.readdirSync(logs).filter((file) => {
//     return file.includes(datePattern);
//   });

//   const zipFilePath = path.join(logs, `${datePattern}.zip`);

//   await createZipArchive(
//     logFiles.map((file) => path.join(logs, file)),
//     zipFilePath
//   );
//   // await uploadToCloudService(zipFilePath);
//   fs.unlinkSync(zipFilePath);
// }

const format = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),

  winston.format.printf(info => {
    const { timestamp, level, message, trace_id, span_id, trace_flags, duration,requestId, method, url } = info;

    console.log(info)
    return JSON.stringify({
      timestamp,
      level,
      message,
      traceId : trace_id,
      namespace : url,
      method,
      duration,
      requestId,
      span_id,
      trace_flags
    });
  })
)

const logs = path.join(__dirname, "logs");
if (!fs.existsSync(logs)) {
  fs.mkdirSync(logs);
}

 const accessLogger = winston.createLogger({
  level: "http",
  format,
  transports: [
    // new DailyRotateFile({
    //   filename: path.join(logs, "error-%DATE%.log"),
    //   datePattern: "YYYY-MM-DD",
    //   zippedArchive: true,
    //   maxSize: "20m",
    //   maxFiles: "10d",
    // }),
    new BaselimeTransport({
      baselimeApiKey: BASELIME_API_KEY,
      dataset : "accessLogs", 
      service : "access",
      namespace : "node-websockets"
  }),
    new winston.transports.Console(),
  ],
});

 const authLogger = winston.createLogger({
  level: "info",
  format,
  transports: [
    new winston.transports.Console(),
    new BaselimeTransport({
      baselimeApiKey: BASELIME_API_KEY,
      dataset : "authenticationLogs", 
      service : "auth",
      namespace : "node-websockets"
 })

  ],
});

 const requestLogger =  winston.createLogger({
  level: "http",
  format,
  transports: [new winston.transports.Console(),
    new BaselimeTransport({
      baselimeApiKey: BASELIME_API_KEY,
      dataset : "requestLogs", 
      service : "requests",
      namespace : "node-websockets"
  })
  ],
});

 const errorLogger = winston.createLogger({
  level: "error",
  format,
  transports: [
    new winston.transports.Console(),
  //   new BaselimeTransport({
  //     baselimeApiKey: BASELIME_API_KEY, 
  //     dataset : "errorLogs", 
  //     service : "errors",
  //     namespace : "node-websockets"
  // })
  ],
});

 const webhooksLogger = winston.createLogger({
  level: "info",
  format,
  transports: [new winston.transports.Console(),
    new BaselimeTransport({
      baselimeApiKey: BASELIME_API_KEY, 
      dataset : "webhookLogs", 
      service : "webhooks",
      namespace : "node-websockets"
  })
  ],
});




module.exports = { 
  errorLogger, 
  accessLogger, 
  authLogger, 
  requestLogger, 
  webhooksLogger
}