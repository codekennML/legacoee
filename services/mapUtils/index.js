const turf =  require("@turf/turf")
const polylineDescriptor =  require("@mapbox/polyline")
const s2 = require('@radarlabs/s2');

class PolylineUtils {

   constructor() {
    this.s2Level =  14
   }

  async convertPolylineToLineString(polyline) {
    const lineString  =  turf.lineString(polyline)
    return lineString 
  } 

  async convertPolylineToCoordinates(polyline){
    const coordinatesArray =  polylineDescriptor.decode(polyline,7)
    return coordinatesArray 
  }
  

  async chunkPolyline(lineString, distance) {

    const chunkedPolyline  =  turf.lineChunk(lineString, parseInt(distance), { units : "kilometres"})

    return chunkedPolyline
  } 


  async splitPolylineByNearestPoint(refCoordinates, lineString) {

    const referencePoint  =  turf.point(refCoordinates)

    const closestPointToCoordinates =  turf.nearestPointOnLine(lineString, referencePoint)

     // Split the line at the closest point
    const splitResult = turf.lineSplit(lineString, closestPointToCoordinates);

    // Return the coordinates of the points after the split
    const newPolylineCoordinates =  splitResult.features[1].geometry.coordinates;

    //TODO : Decode this back into a polyline using the mapbox/polyline decode

    const newPolyline = await polylineDescriptor.encode(newPolylineCoordinates, 7)

     return newPolyline

     //TODO : Store this back as the new driver location

  } 

  async convertPolylineToS2Covering(polyline){ 
   
    //Decode Polyline into array of coordinates

    const polylineArray =  await this.convertPolylineToCoordinates(polyline)
  
    //Convert the coordinates to an s2 cell LatLng
    const s2LatLngs =  polylineArray.map(coords => new s2.latLng(coords[0], coords[1])) 
 //Get the polyline map  covering area 
    const s2Polyline   = new s2.Polyline(s2LatLngs) 

    const s2CellIds  =  s2.RegionCoverer.getCoveringTokens(s2Polyline, { min: this.s2Level, max: this.s2Level }); 

    return s2CellIds
      
  } 

  async convertCoordinatesToS2CellId(coordinates){

    const s2CellData =  new s2CellId(new s2.latLng(coordinates[0], coordinates[1])) 

    return s2CellData

  } 


  async getS2CentrePointOfSplitPolyline(lineString) {
    const center =  turf.center(lineString)
    const s2Data  =  await this.convertCoordinatesToS2CellId(center)
    return s2Data
  } 

  async checkPointInsideCovering(covering, point){

    const pointAtLevel = point.parent(this.s2Level)

   const coveringSet =  new Set(covering)

   return coveringSet.contains(pointAtLevel.token())

  }


} 


module.exports  =  PolylineUtils


