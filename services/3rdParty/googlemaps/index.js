
const client =  require("../../../config/axios")
const polylineDescriptor =  require("@mapbox/polyline")

const googleMapsAxiosClient =  client({ 
   baseURL : "https://maps.googleapis.com/maps/",
   timeout : 10000,
   headers : { 
     'Content-Type': 'application/json',
   }
}) 

class GoogleMapsService {

    constructor(client) {
        this.client  =  client

    } 

    async retrieveCoordinates(placeId) {
        
    //This can be retried up to two times max 
     
    const url =  `api/geocode/json?place_id=${placeId}&key=${process.env.GOOGLE_MAPS_API_KEY}`

      const data  =  await this.client.get(url)

      if(data.results.length < 1) throw new AppError(`Lol`)

      const location = data.results[0].geometry.location;
      const latitude = location.lat;
      const longitude = location.lng;


      return { latitude, longitude}
    
    } 

    async getDirections(lat, lng, place_id) {

       //start is a lat,lng object and must be without a space  , end is a placeId 

        const url =  `api/directions/json?destination=${lat},${lng}&mode=transit&transit_mode=bus&alternatives=true&units=metric&region=ng&origin=place_id:${place_id}&key=AIzaSyDdYME_PrW_WGGcJOdDpGLym58HFmFpdBw`
        // we will switch this to use mapbox here 

        const response =  await this.client.get(url)


const stringifiedData  = JSON.stringify(response.data)

const { geocoded_waypoints, routes } = JSON.parse(stringifiedData)


const polylines  =  []
const fareSet  =  new Set()

console.log(Object.keys(routes[0]))


//We need all three polylines to determine which route the driver currently is one 
for (const route of routes ){
  polylines.push(route.overview_polyline)
  fareSet.add(fare)
}


const {legs } = routes[0] 

const  { arrival_time ,  departure_time , distance , duration, end_location, start_location,start_address, end_address  } = legs[0]



// console.log(fare, geocoded_waypoints, legs)

//Get the place_id and coordinates of rider destination and current location  

//This data willbe stored and used for subsequent trips within the facourites places list on the frontend

const riderCurrentLocationData =  {
  
   placeId  : geocoded_waypoints[0].place_id,
   coordinates : { 
   lng : start_location.lng,
   lat : start_location.lat
   },
   name : start_address
}

const riderDestinationData =  { 
   placeId  : geocoded_waypoints[1].place_id,
   coordinates : { 
   lng : end_location.lng,
   lat : end_location.lat
   },
   name : end_address
}

if(fareSet.size > 1 && fareSet.set < 2 ) { 
  //Ensure the set has at least two fares so we can show an estimate 
  fareSet.add(parseInt(fareSet[0]) - 400)

}
//TODO : Save riders current Destination Data to the DB as favorite places


const data =  { 
  fare : Array.from(fareSet),
  riderDestinationData,
  riderCurrentLocationData,
  polylines,
  distance,
  duration,
  arrival_time,
  departure_time
}

console.log(data)

return data
  
    } 

    async decodePolyline(polyline){

      const polylineArray  =  polylineDescriptor.decode(polyline,7)

      return polylineArray

    }

  
}

module.exports =  new GoogleMapsService(googleMapsAxiosClient)