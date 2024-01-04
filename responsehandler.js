const tryCatch = require("./utils/helpers/tryCatch");

const MAX_BODY_SIZE = 2 ** 20; // 1MB

const responseHandler = (basefn) => async (res, req) => {
  res.onAborted(() => {
    res.aborted = true;
  });

  if (!res.aborted) {
    res.cork(async () => {
      let response = await tryCatch(basefn)(res, req);

      const { status, ...data } = response;

      if (response?.error) {
        //  console.log(response)
        res.cork(async () => {
          res
            .writeStatus(response?.status ?? "500")
            .end(response.message ?? "Something went wrong.");
        });
      }

      res.writeStatus(JSON.stringify(code)).end(JSON.stringify(data));
      // res.end(JSON.stringify(data));
    });
  }
};
// if(shouldReturnEarly)  return response

// req.response =  response

// if(response.yield) {
//   req.setYield(true)
// }

// responder(res, req)
// })
// }

// const responder = (res, req)  => {

//   const response  =  req.response

//   if(response?.error){
//     //  console.log(response)
//          return res.cork(async() =>  {
//   res.writeStatus(response?.code ?? "500").end(response.message ?? "Something went wrong." )
//      })

//     }
//    res.cork(async() =>  {
//       const { code, ...data  } =  response

//       res.writeStatus(JSON.stringify(code)).end(JSON.stringify(data));
//       // res.end(JSON.stringify(data));
//     });

// }

const handlePostRequest = (res, req) => {
  return new Promise((resolve, reject) => {
    let body = "";

    let data = Buffer.from([]);

    // Set up a callback for incoming data chunks
    res.onData((chunk, isLast) => {
      body += chunk;

      if (isLast) {
        // Modify data from the outer code
        // const modifiedData = handleArrayBuffer(body)
        // Concatenate all chunks into a single ArrayBuffer
        //  = Buffer.concat(body);
        const concatenatedBuffer = Buffer.concat([data, Buffer.from(chunk)]);

        if (data.length > MAX_BODY_SIZE) {
          throw new AppError("Payload too large", "largePayload", 413);
        }
        // Convert the ArrayBuffer to a string using TextDecoder
        const textDecoder = new TextDecoder("utf-8");
        const modifiedData = textDecoder.decode(concatenatedBuffer);

        // Resolve the promise with the modified data
        resolve(modifiedData);
      }
    });
  });
};

module.exports = { responseHandler, handlePostRequest };
