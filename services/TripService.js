const TripsRepository = require("../repository/Trips")
const sharedModel  = require("../repository/shared/index")


class TripService {
   
    constructor(model) {
        this.model =  model
    }

    async createDriverTrip(){

    }

    async createRideTrip(){

    }

    async getTripData(tripId){
       
        const trip  = await sharedModel.findDocById({
        id : mongoose.Types.ObjectId(tripId), 
        select : "ongoing driverId tripLocations"
          }, this.model, null , [ 
          { 
            path : "driverId", 
            select : "avatar firstName lastName Car Seats"
          }
          ])
    
          return trip
    }


}

module.exports  =  new TripService(TripsRepository)