const mongoose = require("mongoose");

//This Schema will be for both ride updates and driver updates

const routeSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.SchemaTypes.ObjectId,
      required: true,
      ref: "User",
      index : 1
    },

    trip_id: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: "Trip",
      required : true ,
      index : 1
    },

    route: [ 
      { 
        location : { 
         type  : {  type : String,  
          enum : ["Point"], 
          default : "Point"
        }, 
        coordinates : []
       } , 
        timestamp : Date
    }
    ]
},

  {
    timestamps: true,
    versionKey: false,
  }
);


const Route = mongoose.model("Route", routeSchema);

module.exports = Route;
