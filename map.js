
function Coords(lat, lon) {
    this.lat = lat;
    this.lon = lon;
}

function Node(id, lat, lon) {
    this.id = id;
    this.lat = lat;
    this.lon = lon;
}

function Way(id, coordList) {
    this.id = id;
    this.coordList = coordList;
}

function Relation(id) {
    this.id = id;
}
