const turf = require("@turf/turf");
const polylineDescriptor = require("@mapbox/polyline");
const h3 = require("h3-js");

class PolylineUtils {
  constructor() {
    this.h3level = 7;
  }

  async convertPolylineToLineString(polyline) {
    const lineString = turf.lineString(polyline);
    return lineString;
  }

  async convertPolylineToCoordinates(polyline) {
    const coordinatesArray = polylineDescriptor.decode(polyline, 7);
    return coordinatesArray;
  }

  async chunkPolyline(lineString, distance) {
    const chunkedPolyline = turf.lineChunk(lineString, parseInt(distance), {
      units: "kilometres",
    });

    return chunkedPolyline;
  }

  async splitPolylineByNearestPoint(refCoordinates, lineString) {
    const referencePoint = turf.point(refCoordinates);

    const closestPointToCoordinates = turf.nearestPointOnLine(
      lineString,
      referencePoint
    );

    // Split the line at the closest point
    const splitResult = turf.lineSplit(lineString, closestPointToCoordinates);

    // Return the coordinates of the points after the split
    const newPolylineCoordinates = splitResult.features[1].geometry.coordinates;

    //TODO : Decode this back into a polyline using the mapbox/polyline decode

    const newPolyline = await polylineDescriptor.encode(
      newPolylineCoordinates,
      7
    );

    return newPolyline;

    //TODO : Store this back as the new driver location
  }

  async convertPolylineToH3CoveringCellsArray(polyline) {
    //Decode Polyline into array of coordinates

    const polylineArray = await this.convertPolylineToCoordinates(polyline);

    //Get all h3 cells in the polygon
    const coveringH3Indexes = polylineArray.map((coord) =>
      h3.geoToH3(coord[0], coord[1], this.h3level)
    );

    return coveringH3Indexes;
  }

  async convertCoordinatesToH3CellId(coordinates) {
    const h3CellData = h3.latLngToCell(coordinates.lat, coordinates.lng);

    return h3CellData;
  }

  async getH3CentrePointOfSplitPolyline(lineString) {
    // const center =  turf.center(lineString)
    // const s2Data  =  await this.convertCoordinatesToS2CellId(center)
    // return s2Data
  }
  "";

  async getNeighbouringCellsInDistance(originCell, distance) {
    const cellsInVicinity = h3.gridDisk(originCell, 3);

    return cellsInVicinity;
  }

  async getParentCellAtUpperLevel(originCell) {
    const parentCellId = h3.cellToParent(originCell);

    return parentCellId;
  }

  async checkPointInsideH3Covering(polyline, point) {
    const covering = await this.convertPolylineToH3CoveringCellsArray(polyline);

    const h3Cell = this.convertCoordinatesToH3CellId(point);

    const isPointInPolygon = covering.includes(h3Cell);

    return isPointInPolygon;
  }
}

module.exports = new PolylineUtils();
