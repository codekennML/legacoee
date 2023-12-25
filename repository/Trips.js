const TripModel  =  require("../model/trip")

class TripsRepository {
    constructor(model) {
       this.model  =  model
    }  

    async createTrip(tripData){

    }

    
}

module.exports =  new TripsRepository(TripModel)