const { readJSON } = require("../../responsehandler")
const { Worker } = require('worker_threads');

const { default: AppResponse } = require("../utils/helpers/AppResponse");
const { StatusCodes } = require("http-status-codes");
const { errorLogger } = require("../middlewares/logger/winston"); 
const routeServiceLayer =  require("../services/routeService")
const ENCRYPTION_KEY  =  process.env.ENCRYPTION_KEY
console.log(ENCRYPTION_KEY, process.env.MAPS_API_KEY, "keys")

class RouteController {

    constructor(service){
    this.routeService =  service
    }

    // async saveRouteToDB(res, req) { 

    //     const data =  readJSON(res) 

    
    //     //First decrypt the data   

    //     const { encryptedRoute, tripId } =  data 
          
    //     const workerData =  new Promise((resolve, reject) => {

    //         const worker = new Worker('./utils/helpers/decrypt.js', { workerData: { data : encryptedRoute, key : ENCRYPTION_KEY } });
    //         worker.on('message', resolve);
    //         worker.on('error', reject);
    //         worker.on('exit', (code) => {
    //           if (code !== 0) reject(new Error(`Worker stopped with exit code ${code}`));
    //         });
          
        
    //     });
    
    //     const decryptedRoute  =  await workerData

    //     if(!decryptedRoute) throw new AppError("Error : route update failed", StatusCodes.UNPROCESSABLE_ENTITY)

    //     const updatedRoute  =  this.routeService.updateRouteData({
    //             docToUpdate : { trip : new Types.ObjectId(data.tripId) },
    //             updateData : {
    //                 $push : { 
    //                     routeArray : decryptedRoute  
    //                 }
    //             }, 
    //             options : { new : true , select: "_id"}
    //          }) 


    //     if(!updatedRoute) throw new AppError("Error : route update failed", StatusCodes.UNPROCESSABLE_ENTITY)

    //     return AppResponse(StatusCodes.OK, { message  : "route updated successfully"})
       
    // }


    async encryptData(data){ 

    
        try {
            const workerData = new Promise((resolve, reject) => {
          
                const worker = new Worker('./src/utils/helpers/encryptWorker.js', { workerData: { data, key : ENCRYPTION_KEY } });
                worker.on('message', resolve);
                worker.on('error', reject);
                worker.on('exit', (code) => {
                    if (code !== 0) { 
                        errorLogger.info(`Encryption Worker stopped with exit code ${code}`);
                        reject(new Error(`Worker stopped with exit code ${code}`))
                    
                    }

                });
            });
            
            const response = await workerData;
            return { 
                success : true, 
                ...response
            }
        } catch (error) {
           
            errorLogger.error(`Route Encryption error: ${error.message}`);
            return { success : false }
        }
    }
}      

const Route =  new RouteController(routeServiceLayer)

module.exports =  Route