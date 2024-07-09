const redisClient =  require("../config/redis/index")

async function handleRiderLocationUpdates(ws, message ){
    
    const { location, prevCell, prevParentCell, prevGrandParentCell} =  message

    const locationCell =  await PolylineUtils.convertCoordinatesToH3CellId(location, 7)
    const locationParentCell = await  PolylineUtils.convertCoordinatesToH3CellId(location, 6)
    const locationGrandParentCell =  await PolylineUtils.convertCoordinatesToH3CellId(location, 5) 

    console.log(locationCell, locationParentCell, locationGrandParentCell)
    

    let result
const locationCellResponse =  ws.subscribe(locationCell)
const parentCellResponse      =    ws.subscribe(locationParentCell)
const grandParentCellResponse   =     ws.subscribe(locationGrandParentCell)
  
result =  locationCellResponse && parentCellResponse && grandParentCellResponse

  if(!result)    throw new AppError('Failed to subscribe to cell topic: %s');
   
  await redisClient.subscribe(
   locationCell,
   locationParentCell, 
   locationGrandParentCell, 
   (err, count) => {

  if (err) {
     throw new AppError('Failed to subscribe: %s', err.message);
 } 
})  


const cellsToUnsubscribeFrom = []

if(prevCell && prevCell !== locationCell ) cellsToUnsubscribeFrom.push(prevCell)
if(prevParentCell && prevParentCell !== locationParentCell ) cellsToUnsubscribeFrom.push(prevParentCellCell)
if(prevGrandParentCell && prevGrandParentCell !== locationGrandParentCell ) cellsToUnsubscribeFrom.push(prevGrandParentCell)

if(cellsToUnsubscribeFrom.length > 0){

for(const cell of cellsToUnsubscribeFrom){
 ws.unsubscribe(cell) 

 await redisClient.unsubscribe(
   
  (err, count) => {

 if (err) {
    throw new AppError('Failed to subscribe: %s', err.message);
} 
})
}
   }
}

module.exports = { handleRiderLocationUpdates }