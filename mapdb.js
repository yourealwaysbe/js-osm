
// requires osm-read-xml.js
// requires osm-read-pbf.js
// requires map.js

// DB:
//
//      ways:
//          { id: <string>,
//            points: [<Coord>] }*
//      index:
//          { id: <lat>-<lon>,
//            ways: Set(<wayId>) }

var mapdb = new function () {
    var DBNAME = "maps";

    var WAYS_STORE = "ways";
    var INDEX_STORE = "index";

    // mult lat/lon by this number then floor
    var TILE_FACTOR = 100;
    var TILE_MIN = 180 * TILE_FACTOR

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
        var trans = db.transaction(WAYS_STORE, "readwrite");
        var store = trans.objectStore(WAYS_STORE);
        store.clear();
        trans = db.transaction(INDEX_STORE, "readwrite");
        store = trans.objectStore(INDEX_STORE);
        store.clear();
    };

    this.forWays = function (latLow, lonLow, latHigh, lonHigh, cb) {
        var startLat = getTileCoord(latLow);
        var endLat = getTileCoord(latHigh);
        var startLon = getTileCoord(lonLow);
        var endLon = getTileCoord(lonHigh);

        function doLat(tileLat) {
            if (tileLat > endLat)
                return;

            var trans = db.transaction(INDEX_STORE, "readonly");
            var store = trans.objectStore(INDEX_STORE);

            var lowerId = makeTileCoordId(tileLat, startLon);
            var upperId = makeTileCoordId(tileLat, endLon);
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

            way.nodeRefs.forEach(function (id) {
                var node = mapData.nodes[id];
                points.push(new Coords(node.lat, node.lon));

                var tileId = getContainingTileId(node.lat, node.lon);
                var index = newWayIndex[tileId];
                if (index) {
                    index.add(way.id);
                } else {
                    newWayIndex[tileId] = new Set([way.id]);
                }
            });

            var dbobj = {
                id : way.id,
                points : points
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

    var getTileCoord = function (x) {
        var newX = TILE_MIN + x * TILE_FACTOR;
        return Math.floor(newX);
    }

    var makeTileCoordId = function (tileCoordLat, tileCoordLon) {
        var lat = ("00000" + Math.abs(tileCoordLat)).slice(-5);
        var lon = ("00000" + Math.abs(tileCoordLon)).slice(-5);

        return lat + "#" + lon;
    }

    var getContainingTileId = function (lat, lon) {
        return makeTileCoordId(getTileCoord(lat), getTileCoord(lon));
    }

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
    }
};
