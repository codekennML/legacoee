const redisClient =  require("../config/redis/index")

async function handleDriverLocationUpdates(ws, message ){
    
    const { location  } =  message

    const locationCell =  await PolylineUtils.convertCoordinatesToH3CellId(location, 7)
    const locationParentCell = await  PolylineUtils.convertCoordinatesToH3CellId(location, 6)
    const locationGrandParentCell =  await PolylineUtils.convertCoordinatesToH3CellId(location, 5) 

    console.log(locationCell, locationParentCell, locationGrandParentCell)
    
    let result

const locationCellResponse     =          ws.subscribe(locationCell)
const parentCellResponse       =       ws.subscribe(locationParentCell)
const grandParentCellResponse  =     ws.subscribe(locationGrandParentCell)
  
result =  locationCellResponse && parentCellResponse && grandParentCellResponse

  if(!result)    throw new AppError('Failed to subscribe to cell topic: %s');
   
  await redisClient.publish(
   locationCell,
   locationParentCell, 
   locationGrandParentCell, 
   (err, count) => {

  if (err) {
     throw new AppError('Failed to subscribe: %s', err.message);
 } 
})  





   
}

module.exports = { handleDriverLocationUpdates }