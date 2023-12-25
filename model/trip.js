const mongoose  =  require("mongoose") 

const tripSchema =  new mongoose.Schema({

    driverId : {
        type : mongoose.Types.ObjectId,
        required : [true, "Trip Driver Id required"],
        ref : "Driver"
    }, 

    tripLocations : {
      start : { 
        coordinates : {
            type : [Number], 
            required : ["true", "start Coordinates are required"]
        }, 
        name : { 
            type : String, 
            
        },

        placeId : String
      }, 
      end : { 
        coordinates : {
            type : [Number], 
            required : ["true", "End coordinates are required"]
        }, 
        name : { 
            type : String, 
       
        },
        placeId : String
      }, 
      polylines : []
    }, 

    ongoing : {
        type : Boolean,
        required : [true, "Trip status required"]

    },
    //This will hold the details of the tag along riders 
    rides : [

    ]
     
})

tripSchema.index({
    driverId : 1 , 
    ongoing : 1 
})

const Trips  = mongoose.model("Trip", tripSchema)

module.exports  = Trips