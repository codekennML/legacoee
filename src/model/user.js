const  { Schema, Model, model, SchemaTypes } =  require("mongoose")



const userSchema = new Schema(
  {
    firstName: {
      type: String,
      trim: true,
      max: 100,
      immutable : true
    },

    email: {
      type: String,
      max: 255,
      required:  function(){
        return !this.mobile && !this.googleEmail
      },
      index: true,
      unique : true, 
      sparse : true,
      trim: true
    },

    lastName: {
      type: String,
      trim: true,
      max: 100,
      immutable : true
    },

    birthDate: {
      type: Date,
      immutable : true
    },

    roles: {
      type: Number,
      required: true,
    },

    countryCode: Number,

    subRole: {
      type: Number,
    },

    active: {
      type: Boolean,
      required: true,
      default: true,
    },

    mobile: {
      type: Number,
      unique: true,
      sparse : true,
      index: true
    },

    avatar: {
      type: String,
      default: ".......a...s..s.",
      required: true 
    },

    gender: {
      type: String,
      enum: ["male", "female", "other"],
    },

    archived : {
      type : Boolean, 
      required : true ,
      default : false
    },

    googleId: {
      type: String,
      index: true,
    },

    deviceToken: {
      type: String,
    },

    googleEmail: {
      type: String,
      required: function () {
        return this?.googleId;
      },
    },

    fbId: {
      type: String,
      index: true,
    },

    fbEmail: {
      type: String,
      required: function () {
        return this?.fbId;
      },
    },

    appleId: {
      type: String,
      index: true,
    },

    appleEmail: {
      type: String,
      required: function () {
        return this.appleId;
      },
    },

    socialName: String,

    verifyHash: {
      token: String,
      expires: Date,
    },

    verified: { type: Boolean, default: false },

    suspended: {
      type: Boolean,
      default: false,
    },

    banned: {
      type: Boolean,
      default: false,
      required: true,
    },

    mobileAuthId : String, 

    accessTokenExpiresAt : Date,


  
    emailVerifiedAt: Date,
    mobileVerifiedAt: Date,

    resetTokenHash: {
      type: String,
      index: true,
    },

    resetTokenData: {
      expiry: Date,
      used: Boolean,
    },

    paymentMethod: {
      authorization: Object,
      customer: Object,

      //This is for ensuring e capture a users payment accurately at all times
      isValid : {
        type : Boolean,
        required : true ,
        default : false
      }, 

      defaults: [
        {
          type: String,
          enum: ["subscription", "settlement"],
          required: false
        }
      ]
    },

    refreshToken: {
      index: true,
      type: String,
    },

    lastLoginAt: Date,

    serviceType: {
      type: [String],
      enum: ["dispatch", "ride"],
    },
    
    status : { 
      type : String, 
      enum :['new', 'verified'],
      default : 'new'
    },

    dispatchType: {
      type: [String],
      enum: ["STS", "HTH", "STH"],
    },

    street: String,

    town: {
      type: SchemaTypes.ObjectId,
      ref: "Town",
    },

    state: {
      type: SchemaTypes.ObjectId,
      ref: "State",
    },

    country: {
      type: SchemaTypes.ObjectId,
      ref: "Country",
    },

    rating: {
      type: Number,
      default: 5.0,
    },

    emergencyContacts: [],

    stateOfOrigin: String,

    about: {
      type: String,
      max: 640,
    },

    devices : [{
      
      type : String
    }, 


    ], 
    invitedBy : {
      type : SchemaTypes.ObjectId, 
      ref : "User", 
      required : false
    }
  },

  {
    timestamps: true,

    versionKey: false,
  }
);

userSchema.index({
  town: 1,
  archived : 1,
  country: 1,
  state: 1,
  gender: 1,
  roles: 1,
  banned: 1,
  suspended: 1,
  verified: 1,
  status: 1,
  accessTokenExpiresAt : 1,
  mobileAuthId : 1
});
// userSchema.pre("save", async function (next) {
//   if (this.password && this.isModified(this.password)) {
//     this.hashPassword(this.password);
//   }
//   next();
// });

// userSchema.methods.hashPassword = async (currentPassword: string) => {
//   await bcrypt.hash(currentPassword, 12);
// };

// userSchema.methods.comparePassword = async (
//   existingPassword: string,
//   newPassword: string
// ) => {
//   return await bcrypt.compare(existingPassword, newPassword);
// };

const User = model("User", userSchema);

module.exports =  User;
