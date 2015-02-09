
// requires mapdb
// requires map

function MapRender(canvas, mapdb) {
    var MEDIUM_DEGPERPIX = 0.00009;
    var OVERVIEW_DEGPERPIX = 0.0005;

    var canvas = canvas;
    var mapdb = mapdb;

    var lat = 50.8204;
    var lon = -.1450;
    var degPerPix = 0.00003;

    var context = canvas.getContext("2d");
    var centerX = canvas.width / 2;
    var centerY = canvas.height / 2;

    this.getLat = function () { return lat; };
    this.getLon = function () { return lon; };
    this.getDpp = function () { return degPerPix; }

    this.clear = function () {
        context.clearRect(0, 0, canvas.width, canvas.height);
    };

    this.getBBox = function () {
        var minLat = lat - (canvas.height / 2) * degPerPix;
        var maxLat = lat + (canvas.height / 2) * degPerPix;
        var minLon = lon - (canvas.width / 2) * degPerPix;
        var maxLon = lon + (canvas.width / 2) * degPerPix;
        return new BBox(minLat, minLon, maxLat, maxLon);
    };

    this.render = function () {
        var bbox = this.getBBox();
        var zoom = getZoomLevel();

        mapdb.forWays(bbox, zoom, function (way) {
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

    this.center = function (offPixX, offPixY) {
        this.move(offPixX - centerX, centerY - offPixY);
    }


    var getZoomLevel = function () {
        if (degPerPix > OVERVIEW_DEGPERPIX)
            return ZoomLevel.OVERVIEW;
        if (degPerPix > MEDIUM_DEGPERPIX)
            return ZoomLevel.MEDIUM;
        return ZoomLevel.FULL;
    }

    var canvasCoord = function (coord) {
        var point = { };

        offsetLat = coord.lat - lat;
        point.y = centerY - (offsetLat / degPerPix);

        offsetLon = coord.lon - lon;
        point.x = centerX + (offsetLon / degPerPix);

        return point;
    };
};
