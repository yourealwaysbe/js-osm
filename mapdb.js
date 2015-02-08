
// requires osm-read-xml.js
// requires osm-read-pbf.js
// requires map.js

// DB:
//
//      ways:
//          { id: <string>,
//            points: [<Coord>] }*
//            type: WayType
//      index:
//          { id: <lat>-<lon>,
//            ways: Set(<wayId>) }

var WayType = {
    BUILDING : 'B',
    HIGHWAY : 'H',
    LANDUSE : 'L',
    MISC : 'M'
};

var ZoomLevel = {
    FULL : 'F',
    OVERVIEW : 'O'
};


var mapdb = new function () {
    var DBNAME = "maps";

    var WAYS_STORE = "ways";
    var INDEX_STORE = "index";

    // mult lat/lon by this number then floor
    var TILE_FACTOR = { };
    TILE_FACTOR[ZoomLevel.FULL] = 100;
    TILE_FACTOR[ZoomLevel.OVERVIEW] = 10;

    var WAY_TYPES = { };
    WAY_TYPES[ZoomLevel.FULL] = new Set([WayType.BUILDING,
                                         WayType.LANDUSE,
                                         WayType.HIGHWAY,
                                         WayType.MISC]);
    WAY_TYPES[ZoomLevel.OVERVIEW] = new Set([WayType.LANDUSE,
                                             WayType.HIGHWAY]);

    var db = null;

    this.onerror = function(e) {
        cosole.log(e);
    };

    this.open = function(onopen) {
        var version = 4;
        var request = indexedDB.open(DBNAME, version);

        request.onupgradeneeded = function(e) {
            db = e.target.result;

            e.target.transaction.onerror = onerror;

            for (var i = 0; i < db.objectStoreNames.length; ++i) {
                db.deleteObjectStore(db.objectStoreNames.item(i));
            }

            db.createObjectStore(WAYS_STORE, { keyPath: "id" } );
            db.createObjectStore(INDEX_STORE, { keyPath: "id" } );

            onopen();
        };

        request.onsuccess = function(e) {
            db = e.target.result;
            onopen();
        };

        request.onerror = onerror;
    };

    this.loadPbf = function (pbfFile, onend) {
        var mapData = {
            nodes : {},
            ways : [],
            relations : []
        };

        pbfParser.parse({
            filePath: pbfFile,

            node: function(node) {
                mapData.nodes[node.id] = node;
            },

            way: function(way){
                mapData.ways.push(way);
            },

            relation: function(relation){
                // console.log(JSON.stringify(relation));
            },

            endDocument: function(){
                loadDataToDB(mapData);
                onend();
            },

            error: function(msg){
                console.error('error: ' + msg);
                throw msg;
            }
        });
    };

    this.clear = function () {
        var transWays = db.transaction(WAYS_STORE, "readwrite");
        var storeWays = transWays.objectStore(WAYS_STORE);
        storeWays.clear();
        var transIdx = db.transaction(INDEX_STORE, "readwrite");
        var storeIdx = transIdx.objectStore(INDEX_STORE);
        storeIdx.clear();
    };

    this.forWays = function (latLow, lonLow, latHigh, lonHigh, zoom, cb) {
        var startLat = getTileCoord(latLow, zoom);
        var endLat = getTileCoord(latHigh, zoom);
        var startLon = getTileCoord(lonLow, zoom);
        var endLon = getTileCoord(lonHigh, zoom);

        function doLat(tileLat) {
            if (tileLat > endLat)
                return;

            var trans = db.transaction(INDEX_STORE, "readonly");
            var store = trans.objectStore(INDEX_STORE);

            var lowerId = makeTileCoordId(tileLat, startLon, zoom);
            var upperId = makeTileCoordId(tileLat, endLon, zoom);
            var keyRange = IDBKeyRange.bound(lowerId, upperId);
            var request = store.openCursor(keyRange);

            request.onerror = onerror;

            request.onsuccess = function(e) {
                var result = e.target.result;
                if (!!result) {
                    result.value.ways.forEach(function (wayId) {
                        getWay(wayId, cb);
                    });
                    result.continue();
                } else {
                    doLat(tileLat + 1);
                }
            };
        }

        doLat(startLat);
    };

    var loadDataToDB = function (mapData) {
        var wayTrans = db.transaction([WAYS_STORE], "readwrite");
        var wayStore = wayTrans.objectStore(WAYS_STORE);

        var newWayIndex = { };

        mapData.ways.forEach(function (way) {
            var points = [];
            var wayType = getWayType(way);

            way.nodeRefs.forEach(function (id) {
                var node = mapData.nodes[id];
                points.push(new Coords(node.lat, node.lon));

                $.each(ZoomLevel, function (name, zoom) {
                    if (!WAY_TYPES[zoom].has(wayType))
                        return;

                    var tileId = getContainingTileId(node.lat, node.lon, zoom);
                    var index = newWayIndex[tileId];
                    if (index) {
                        index.add(way.id);
                    } else {
                        newWayIndex[tileId] = new Set([way.id]);
                    }
                });
            });

            var dbobj = {
                id : way.id,
                points : points,
                type : wayType
            };

            var request = wayStore.put(dbobj);

            request.onerror = onerror;
        });

        var idxTrans = db.transaction([INDEX_STORE], "readwrite");
        var idxStore = idxTrans.objectStore(INDEX_STORE);

        $.each(newWayIndex, function (tileId, tileWays) {
            var keyRange = IDBKeyRange.only(tileId);
            var request = idxStore.openCursor(keyRange);
            request.onsuccess = function (e) {
                var cursor = e.target.result;
                if (cursor) {
                    var tile = cursor.value;
                    tileWays.forEach(function (wayId) {
                        tile.ways.add(wayId);
                    });
                    cursor.update(tile);
                } else {
                    idxStore.put({
                        "id" : tileId,
                        "ways" : tileWays
                    });
                }
            }
        });
    };

    var getWayType = function (way) {
        if (!!way.tags.building)
            return WayType.BUILDING;
        if (!!way.tags.highway)
            return WayType.HIGHWAY;
        if (!!way.tags.landuse)
            return WayType.LANDUSE;
        return WayType.MISC;
    };

    var getTileCoord = function (x, zoom) {
        var tf = TILE_FACTOR[zoom];
        var newX = (180 * tf) + x * tf;
        return Math.floor(newX);
    };

    var makeTileCoordId = function (tileCoordLat, tileCoordLon, zoom) {
        var lat = ("00000" + Math.abs(tileCoordLat)).slice(-5);
        var lon = ("00000" + Math.abs(tileCoordLon)).slice(-5);

        return zoom + '#' + lat + "#" + lon;
    };

    var getContainingTileId = function (lat, lon, zoom) {
        return makeTileCoordId(getTileCoord(lat, zoom),
                               getTileCoord(lon, zoom),
                               zoom);
    };

    var getWay = function (wayId, cb) {
        var trans = db.transaction(WAYS_STORE, "readonly");
        var store = trans.objectStore(WAYS_STORE);
        var request = store.get(wayId);

        request.onerror = onerror;

        request.onsuccess = function(e) {
            var result = e.target.result;
            if (!!result)
                cb(result);
        };
    };
};
