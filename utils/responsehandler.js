const tryCatch = require("./tryCatch")

const responseHandler = (basefn) => async(res, req) => {

   res.onAborted(() => {
    res.aborted = true;
    });
    

    if (!res.aborted) {

    res.cork(async() => {

    let response =  await tryCatch(basefn)(res, req)
  

  if(response?.error){
  //  console.log(response)
       return res.cork(async() =>  {
res.writeStatus(response?.code ?? "500").end(response.message ?? "Something went wrong." )
   })

     
  } 
 res.cork(async() =>  {
    const { code, ...data  } =  response

    res.writeStatus(JSON.stringify(code)).end(JSON.stringify(data));
    // res.end(JSON.stringify(data));
  });

  })
  }
}


module.exports  =  responseHandler