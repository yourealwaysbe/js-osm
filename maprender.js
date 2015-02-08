
// requires mapdb
// requires map

function MapRender(canvas, mapdb) {
    var canvas = canvas;
    var mapdb = mapdb;

    var lat = 50.8177;
    var lon = -.1373;
    var degPerPix = 0.0001;

    var context = canvas.getContext("2d");
    var centerX = canvas.width / 2;
    var centerY = canvas.height / 2;

    this.clear = function () {
        context.clearRect(0, 0, canvas.width, canvas.height);
    }

    this.render = function () {
        var startLat = lat - (canvas.width / 2) * degPerPix;
        var endLat = lat + (canvas.width / 2) * degPerPix;
        var startLon = lon - (canvas.height / 2) * degPerPix;
        var endLon = lon + (canvas.height / 2) * degPerPix;

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
    };

    this.zoom = function (factor) {
        degPerPix = factor * degPerPix;
        degPerPix = factor * degPerPix;
        this.clear();
        this.render();
    }

    this.move = function (offPixX, offPixY) {
        lat = lat + (degPerPix * offPixY);
        lon = lon + (degPerPix * offPixX);
        // imagedata = context.getImageData(0, 0, canvas.width, canvas.height);
        // context.putImageData(imagedata, -offPixX, -offPixY);
        this.clear();
        this.render();
    }


    function canvasCoord(coord) {
        var point = { };

        offsetLat = coord.lat - lat;
        point.y = centerY - (offsetLat / degPerPix);

        offsetLon = coord.lon - lon;
        point.x = centerX + (offsetLon / degPerPix);

        return point;
    };
};
