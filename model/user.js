const mongoose = require("mongoose") 

const userSchema  =  new mongoose.Schema({
 
    firstname:   { 
        type : String, 
        trim  : true,
        required : [true, "User firstname is required"] , 
        max : 100
     },
 
    lastname:   { 
        type : String, 
        trim  : true,
        required : [true, "User firstname is required"] , 
        max : 100
     }, 

     birthDate : { 
        type : Date, 
        required : [true,  "User Date of Birth required"]
     }, 

     phone_number : {
        type : Number, 
        max : 10 ,  // +2348105481234
        required : [true, "User Phone number is required"]
     }, 

     avatar : { 
        type : String, 
        default : ".......a...s..s.",
        required : [true, "User avatar is required" ]
     }, 


}, {
    timestamps : true , 

    versionKey : false 
})

const User  =  mongoose.model("User", userSchema)

module.exports  =  User