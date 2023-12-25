const rideModel  =  require("../model/rides")

const sharedModel  =  require("./shared/index")

class RideRepository {
      constructor(model) {

        this.model  =  model
        
      }

      async createRide(ride, session){
        return await sharedModel.createDoc(ride, this.model,  session)
      }

      async getRide(request, session, populatedQuery) {
        const { rideId, select } =  rideData 

        return await sharedModel.findDocById({ id : request.id , select: request?.select}, this.model,  session , [ 
           {  
            path : "trip", 
            select : "driverId ongoing ",
            populate : { 
                path : "driverId" , 
                select : "avatar firstname lastname"
            }
            
        } 
        ]  )
      }

    
}

module.exports  =  new RideRepository(rideModel)