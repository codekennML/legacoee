const mongoose  = require("mongoose")

const placesSchema =  mongoose.Schema({
  
    user : {
        type : mongoose.Types.ObjectId,
        ref : "User",
        required : [true, "User Id is required for places entry"]
    }, 
    
    placeId : {
        type : String ,
        required : ["Place id is required"]
    }, 
    
    coordinates : [ 
        Number
    ], 

    name : {
     type : String,
     required : [ true, "Place Name is required"]
    } ,

    label : { 
     type : String
    }



}, {
    timestamps : true,
    versionKey : false
})

const Places =  mongoose.model("Place", placesSchema)


module.exports  =  Places