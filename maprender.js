
// requires mapdb
// requires map

function MapRender(canvas, mapdb) {
    var canvas = canvas;
    var mapdb = mapdb;

    console.log("mapdb = " + mapdb);

    var lat = 50.7021;
    var lon = -1.2968;
    var latDegPerPix = 0.001;
    var lonDegPerPix = latDegPerPix;

    var context = canvas.getContext("2d");
    var centerX = canvas.width / 2;
    var centerY = canvas.height / 2;

    this.render = function () {
        context.clearRect(0, 0, canvas.width, canvas.height);

        console.log("render begin");

        var startLat = lat - (canvas.width / 2) * latDegPerPix;
        var endLat = lat + (canvas.width / 2) * latDegPerPix;
        var startLon = lon - (canvas.height / 2) * lonDegPerPix;
        var endLon = lon + (canvas.height / 2) * lonDegPerPix;

        mapdb.forWays(startLat, startLon, endLat, endLon, function (way) {
            if (way.points.length > 0) {
                context.beginPath();

                var firstPoint = canvasCoord(way.points[0]);
                context.moveTo(firstPoint.x, firstPoint.y);

                for (var i = 1; i < way.points.length; ++i) {
                    var nextPoint = canvasCoord(way.points[i]);
                    context.lineTo(nextPoint.x, nextPoint.y);
                }

                context.stroke();
            }
        });
        console.log("render end");
    };

    this.zoom = function (factor) {
        latDegPerPix = factor * latDegPerPix;
        lonDegPerPix = factor * lonDegPerPix;
    }

    this.move = function (offPixX, offPixY) {
        lat = lat + (latDegPerPix * offPixY);
        lon = lon + (lonDegPerPix * offPixX);
    }


    function canvasCoord(coord) {
        var point = { };

        offsetLat = coord.lat - lat;
        point.y = centerY - (offsetLat / latDegPerPix);

        offsetLon = coord.lon - lon;
        point.x = centerX + (offsetLon / lonDegPerPix);

        return point;
    };
};
