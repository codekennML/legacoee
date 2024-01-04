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

  convertCoordinatesToLineString(coordsArray) {
    return turf.lineString(coordsArray);
  }

  async getPointsAtDistance(polyline, percentages) {
    const decodedLine = turf.lineString(polyline);

    // Calculate line length
    const lineLength = turf.length(decodedLine);

    const points = [];

    // Calculate target distances for each percentage
    for (const percentage of percentages) {
      const targetDistance = lineLength * percentage;

      // Interpolate point at target distance
      const interpolatedPoint = turf.along(decodedLine, targetDistance);
      const [lon, lat] = turf.getCoord(interpolatedPoint);
      points.push([lat, lon]);
    }

    return points;
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

  async getDistanceTravelledAlongPolyline(currentLocation) {
    const decodedPolyline = await this.convertPolylineToCoordinates(polyline);

    //Get the nearest point on the polyline to the coordinates
    const location = turf.point([currentLocation.lat, currentLocation.lng]);

    const nearestPointOnLine = turf.nearestPointOnLine(
      location,
      decodedPolyline
    );

    const closestPointIndex = decodedPolyline.findIndex((coord) =>
      turf.booleanEqual(turf.point(coord), nearestPointOnLine)
    );

    const segmentCoordinates = decodedPolyline.slice(0, closestPointIndex + 1);

    const distanceTravelled = turf.length(
      turf.lineString([...segmentCoordinates], { units: "meters" })
    );

    return distanceTravelled;
  }

  calculateDistanceBetweenPoints(start, end, units) {
    const startPoint = turf.point([start.lat, start.lng]);
    const endPoint = turf.point([end.lat, end.lng]);

    const distance = turf.distance(startPoint, endPoint, { units });

    return distance;
  }

  async convertPolylineToH3CoveringCellsArray(polyline) {
    //Decode Polyline into array of coordinates

    const polylineArray = await this.convertPolylineToCoordinates(polyline);

    //Get all h3 cells in the polygon
    // const coveringH3Indexes = polylineArray.map((coord) =>
    //   h3.geoToH3(coord[0], coord[1], this.h3level)
    // );

    const coveringH3Indexes = h3.polyfill(polylineArray);

    return coveringH3Indexes;
  }

  async convertCoordinatesToH3CellId(coordinates, level) {
    const h3CellData = h3.latLngToCell(
      coordinates.lat,
      coordinates.lng,
      parseInt(level ?? this.h3level)
    );

    return h3CellData;
  }

  getParentCell(cellId, level) {
    return h3.cellToParent(cellId, parseInt(level));
  }

  getParentChildrenCells(parent, level) {
    return h3.cellToChilderen(parent, parseInt(level));
  }

  async getH3CentrePointOfSplitPolyline(lineString) {
    // const center =  turf.center(lineString)
    // const s2Data  =  await this.convertCoordinatesToS2CellId(center)
    // return s2Data
  }
  "";

  async getNeighbouringCellsInDistance(originCell, distance) {
    const cellsInVicinity = h3.gridDisk(originCell, parseInt(distance));

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

  async snapToRoads(rrouteArray, timestampArray) {
    //send request to our OSRM server to get the reconstructed route
    const reconstructedRoute = [];

    return await reconstructedRoute;
  }
}

module.exports = new PolylineUtils();
