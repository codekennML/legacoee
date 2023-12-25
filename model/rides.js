const mongoose =  require("mongoose") 

const rideSchema  =  new mongoose.Schema({
     
    riderId : {
        type : mongoose.SchemaTypes.ObjectId, 
        required : [true, "riderId is required to create new ride"]
     
    }, 
     ongoing : {

         type : Boolean,  

         required : [true, "Trip status is required"]
     }, 
     
     tripId :  { 
        type : mongoose.SchemaTypes.ObjectId, 
        required : [true, "tripId is required to create new ride"]
     }

}, { 
    timestamps : true,  
    versionKey : false
})

const Rides =  mongoose.model("Ride", rideSchema)

module.exports  =  Rides