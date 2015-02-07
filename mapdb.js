
// requires osm-read-pbf.js
// requires map.js

var mapdb = new function () {
    var DBNAME = "maps";

    var WAYS_STORE = "ways";
    var WAY_ID_F = "id";
    var WAY_POINTS_F = "points";

    var db = null;

    this.onerror = function(e) {
        cosole.log(e);
    };

    this.open = function(onopen) {
        var version = 2;
        var request = indexedDB.open(DBNAME, version);

        request.onupgradeneeded = function(e) {
            db = e.target.result;

            e.target.transaction.onerror = onerror;

            for (var i = 0; i < db.objectStoreNames.length; ++i) {
                db.deleteObjectStore(db.item(i));
            }

            db.createObjectStore(WAYS_STORE, { keyPath: WAY_ID_F } );        

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
    }

    var loadDataToDB = function (mapData) {
        var trans = db.transaction([WAYS_STORE], "readwrite");
        var store = trans.objectStore(WAYS_STORE);

        mapData.ways.forEach(function (way) {
            var points = [];
            
            way.nodeRefs.forEach( function (id) {
                var node = mapData.nodes[id];
                points.push(new Coord(node.lat, node.lon));
            });
          
            var dbobj = {
                id : way.id,
                points : points
            };

            var request = store.put(dbobj);

            request.onerror = onerror;
        });
    };
};
