const { HttpStatusCode } = require("axios")
const AppError = require("../middlewares/errors/BaseError")
const GoogleMapsService =  require("../services/3rdParty/googlemaps/index")
const handleArrayBuffer = require("../utils/arrayBufferHandler")
const { successResMsg } = require("../utils/response")
const s2 = require('@radarlabs/s2');


const MAX_BODY_SIZE = 2 ** 20 // 1MB

const checkHealth = async(res, req) =>   { 
  
    return { status : 200 , data : "All good"}
}


const checkRoute =  async(res, req) => {

   const userRoute =  req.body.coordinates
   
   const response  = await axios.post("https://routes.googleapis.com/directions/v2:computeRoutes", {
    origin : {
      "location":{
        "latLng":{
        "latitude": 3.3670440673472757   ,
        "longitude": 6.5279504640474055
      }
    }
    },
    destination : {
      "location":{
        "latLng":{
        "latitude": 3.5028151826915246   ,
        "longitude": 6.621005453581206
      }
    }
    }, 
    travelMode: "DRIVE", 
   },  {
    headers :{
      "X-Goog-Api-Key" : process
    }
   })

}


const decodePlaceId =  async(res,req) => {
  
  const { latitude, longitude}  = await GoogleMapsService.retrieveCoordinates(placeId)

  return { latitude, longitude }

}


// Define a function that returns a promise
const handlePostRequest = (res,req) => {
  return new Promise((resolve, reject) => {
    let body = '';
  
     let data = Buffer.from([])

    // Set up a callback for incoming data chunks
    res.onData((chunk, isLast) => {
      body += chunk;

      if (isLast) {
        // Modify data from the outer code
        // const modifiedData = handleArrayBuffer(body)
// Concatenate all chunks into a single ArrayBuffer
      //  = Buffer.concat(body);
     const concatenatedBuffer = Buffer.concat([data, Buffer.from(chunk)])
     if (data.length > MAX_BODY_SIZE) {
      throw new AppError("Payload too large", "largePayload", 413)
     }
        // Convert the ArrayBuffer to a string using TextDecoder
        const textDecoder = new TextDecoder('utf-8');
        const modifiedData = textDecoder.decode(concatenatedBuffer);

        // Resolve the promise with the modified data
        resolve(modifiedData);
      }
    });
  });
};

const retrievePolyline =  async(res, req) => {

  const body = await handlePostRequest(res);
  // console.log(body)

  
  // const { start , end } = JSON.parse(body)
 
  //  const  directionsData =  await GoogleMapsService.getDirections(start.lat, start.lng , end.placeId) 

  //  console.log(directionsData)

  //  const { fare, overview_polyline , riderCurrentLocationData, riderDestinationData, distance , duration , arrival_time, departure_time} = directionsData

   //Store Rider DestinationData & Current in DB

//    const line =   {
//     points: 'weff@u}|SQIOCM@QVCd@a@Ca@@W@OFKPGRwCYqCS}E]w@K]OQWCYQaAO?ODGFCBuFG_B?eH?AcCAsFE}J?oFCmDKqA_@_Bk@iAw@_AgDeDgAw@s@YQCs@@kALKESOIKbDyE~@oBrCoGp@wBPsAJwA?aCC{ASmB}AqKc@oCaBmFu@qB}BkFs@cBOg@Iq@CsADe@RcA^w@Xa@t@w@lBsB~BgBlAyAtB_DnCyCZ]hC{BtKyI~@_AbAsAh@iAj@iBLm@NgAFaB?u@EeA]wEyA_V[qDiC}YyDye@g@wHO_COkDO_Ba@sD]}C_@uEiAyNGaAu@iM}AuQaAsLcCs[aAqLQaCaBaTOUg@yEAEEGQSg@NUPYFcAB_MLy@DOD_@BwE?uCIeEg@gL_ByAGgAC{A?uCAaECMCeACYAAw@K}FEiEAGEEIAw@EIEAEASBwJH_CmFAoCA'
//    }

//  const decodedPolylineArray =  await GoogleMapsService.decodePolyline(line.points)
    
//  console.log(decodedPolylineArray)

  // successMsg(HttpStatusCode.Ok, message, data)

  // successResMsg(HttpStatusCode.Ok, { message : "Location data retrieved", data : { fare ,  decodedPolylineArray,  distance, duration ,  arrival_time, departure_time} })
 
 
  // successResMsg(HttpStatusCode.Ok, { message : "Location data retrieved", data : "Leemao"})
  // // 


  
// {
//   "end": {
//   "placeId" : "ChIJLdlN7Dr1OxARU93NhGr-NF4" 
// }, 

// "start" : {
//   "lat" : "6.451236",
//   "lng" : "3.513718"
// }
 
// }

  }
  
const convertLocationS2cellId = async(res, req) => {

   const body  = await handlePostRequest(res) 

   const s2Level = 14

   console.log(body)

   const { coordinates } = JSON.parse(body)

   const { lat, lng } = coordinates

   const s2cell  = new s2.CellId(new s2.LatLng(lat, lng))

   const s2CellPoint14 =  s2cell.parent(s2Level) 

   console.log(s2CellPoint14.token())
   return { status : "200" , data : s2CellPoint14.token()}


}

const calculatePolylineOverlap = async(res, req) => {

   const body  = await handlePostRequest(res) 

   const { polyline1, polyline2 } = body


   const s2Polyline1 =  new s2.polyline(polyline1) 




}




   //Convert the coordinates into a body and return it 


    


module.exports =  { 
    checkHealth,
    retrievePolyline,
  //  convertLocationS2cellId
  convertLocationS2cellId
}



