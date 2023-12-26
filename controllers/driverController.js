
const driverService  =  require("../services/DriverService")

class driverController  {
   
   async getOngoingDriverTrip (request) {
  
     const { driverId } =  request    

     const ongoingTrip  = await driverService.getDriverTrips({ 
          query : { 
            driverId : user,
            ongoing : { $eq : true}
          }, 
          aggregateData  :[
          { $limit : 1 }
        ]   
     })





   }

}

module.exports  =  driverController

