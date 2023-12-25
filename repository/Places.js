const placesModel  =  require("../model/userPlaces")

class PlacesRepository {
  constructor(model){
    this.model = model
  } 

  async createNewUserPlace() {

  } 

  async findUserPlace(){
    
  }

}

module.exports  =  new PlacesRepository(placesModel)