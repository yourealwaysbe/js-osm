!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.pbfParser=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(_dereq_,module,exports){
var buf = _dereq_('./buffer.js');

function readBlobHeaderSize(fd, position, size, callback){
    var headerSize = new DataView(fd).getInt32(position, false);
    return callback(null, headerSize);
}

function readPBFElement(fd, position, size, pbfDecode, callback){
    //var buffer = new Uint8Array(fd, position, size);
    var buffer = new Uint8Array(size);
    buffer.set(new Uint8Array(fd, position, size));
    return buf.readPBFElementFromBuffer(buffer, pbfDecode, callback);
}

function getFileSize(fd, callback){
    return callback(null, fd.byteLength);
}

function get(url, callback) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.responseType = 'arraybuffer';
    xhr.onerror = function(evt) {
        callback(new Error(this.status + ': ' + this.statusText));
    };
    xhr.onload = function(evt) {
        callback(null, this.response);
    };
    xhr.send();
}

function open(opts, callback){
    if (opts.filePath) {
        get(opts.filePath, callback);
    } else if (opts.buffer) {
        callback(null, opts.buffer);
    } else {
        callback(new Error('Use either the "filePath" option to pass an URL'
            + ' or the "buffer" option to pass an ArrayBuffer.'));
    }
}

function close(fd, callback){
    if (callback) {
        callback(null);
    }
}

module.exports = {
    readBlobHeaderSize: readBlobHeaderSize,
    readPBFElement: readPBFElement,
    getFileSize: getFileSize,
    open: open,
    close: close
};

},{"./buffer.js":2}],2:[function(_dereq_,module,exports){
function readPBFElementFromBuffer(buffer, pbfDecode, callback){
    return callback(null, pbfDecode(buffer));
}

function blobDataToBuffer(blob){
    return new Uint8Array(blob.toArrayBuffer());
}

module.exports = {
    readPBFElementFromBuffer: readPBFElementFromBuffer,
    blobDataToBuffer: blobDataToBuffer
};

},{}],3:[function(_dereq_,module,exports){
// don't use npm 'zlibjs' module, would require shims for the Node.js wrappers
var Zlib = _dereq_('../../node_modules/zlibjs/bin/inflate.min.js').Zlib;
var buf = _dereq_('./buffer.js');

function inflateBlob(blob, callback){
    var infl = new Zlib.Inflate(buf.blobDataToBuffer(blob.zlib_data), {
        bufferSize: blob.raw_size
    });
    return callback(null, infl.decompress());
}

module.exports = {
    inflateBlob: inflateBlob
};

},{"../../node_modules/zlibjs/bin/inflate.min.js":14,"./buffer.js":2}],4:[function(_dereq_,module,exports){
(function (Buffer){
function toArrayBuffer(buffer) {
    /*
     * took this function from
     * http://stackoverflow.com/questions/8609289/convert-a-binary-nodejs-buffer-to-javascript-arraybuffer
     */
    var ab = new ArrayBuffer(buffer.length);
    var view = new Uint8Array(ab);
    for (var i = 0; i < buffer.length; ++i) {
        view[i] = buffer[i];
    }
    return ab;
}

function readPBFElementFromBuffer(buffer, pbfDecode, callback){
    return callback(null, pbfDecode(toArrayBuffer(buffer)));
}

function pbfBufferToBuffer(src, srcOffset, len){
    var from, to, i;

    from = src.view;
    to = new Buffer(len);

    for(i = 0; i < len; ++i){
        to.writeUInt8(from.getUint8(i + srcOffset), i);
    }

    return to;
}

function blobDataToBuffer(blob){
    var from, len, offset;

    from = blob.view;

    // TODO find out where the offset comes from!?!
    offset = 0; //6; // 4
    for(offset = 0; offset < from.byteLength - 1; ++offset){
        if(from.getUint16(offset) === 0x789c){
            break;
        }
    }

    len = from.byteLength - offset;

    return pbfBufferToBuffer(blob, offset, len);
}

module.exports = {
    readPBFElementFromBuffer: readPBFElementFromBuffer,
    blobDataToBuffer: blobDataToBuffer
};

}).call(this,_dereq_("buffer").Buffer)
},{}],5:[function(_dereq_,module,exports){
(function (Buffer){
var fs = _dereq_('fs');
var buf = _dereq_('./buffer.js');

function bytesReadFail(callback, expectedBytes, readBytes){
    return callback(new Error('Expected ' + expectedBytes + ' bytes but got ' + readBytes));
}

function readBlobHeaderSize(fd, position, size, callback){
    var buffer;

    buffer = new Buffer(size);

    fs.read(fd, buffer, 0, size, position, function(err, bytesRead, buffer){
        if(bytesRead !== size){
            return bytesReadFail(callback, size, bytesRead);
        }

        return callback(null, buffer.readInt32BE(0));
    });
}

function readPBFElement(fd, position, size, pbfDecode, callback){
    var buffer;

    if(size > 32 * 1024 * 1024){
        return callback(new Error('PBF element too big: ' + size + ' bytes'));
    }

    buffer = new Buffer(size);

    fs.read(fd, buffer, 0, size, position, function(err, bytesRead, buffer){
        if(bytesRead !== size){
            return bytesReadFail(callback, size, bytesRead);
        }

        return buf.readPBFElementFromBuffer(buffer, pbfDecode, callback);
    });
}

function getFileSize(fd, callback){
    fs.fstat(fd, function(err, fdStatus){
        return callback(err, fdStatus.size);
    });
}

function open(opts, callback){
    fs.open(opts.filePath, 'r', callback);
}

function close(fd, callback){
    return fs.close(fd, callback);
}

module.exports = {
    readBlobHeaderSize: readBlobHeaderSize,
    readPBFElement: readPBFElement,
    getFileSize: getFileSize,
    open: open,
    close: close
};

}).call(this,_dereq_("buffer").Buffer)
},{"./buffer.js":4}],6:[function(_dereq_,module,exports){
var zlib = _dereq_('zlib');
var buf = _dereq_('./buffer.js');

function inflateBlob(blob, callback){
    zlib.inflate(buf.blobDataToBuffer(blob.zlib_data), callback);
}

module.exports = {
    inflateBlob: inflateBlob
};
},{"./buffer.js":4}],7:[function(_dereq_,module,exports){
/*
 * The following little overview extends the osm pbf file structure description
 * from http://wiki.openstreetmap.org/wiki/PBF_Format:
 *
 * - [1] file
 *   - [n] file blocks
 *     - [1] blob header
 *     - [1] blob
 */

var blockFormat = _dereq_('./proto/osmformat.js');
var fileFormat = _dereq_('./proto/fileformat.js');
var protoBuf = _dereq_("protobufjs");

var zlib, buf, reader;

// check if running in Browser or Node.js (use self not window because of Web Workers)
if (typeof self !== 'undefined') {
    zlib = _dereq_('./browser/zlib.js');
    buf = _dereq_('./browser/buffer.js');
    reader = _dereq_('./browser/arrayBufferReader.js');
} else {
    zlib = _dereq_('./nodejs/zlib.js');
    buf = _dereq_('./nodejs/buffer.js');
    reader = _dereq_('./nodejs/fsReader.js');
}

function parse(opts){
    var paused, resumeCallback, documentEndReached;

    documentEndReached = false;
    paused = false;
    resumeCallback = null;

    createPathParser({
        filePath: opts.filePath,
        buffer: opts.buffer,
        callback: function(err, parser){
            var nextFileBlockIndex;

            function fail(err){
                if( parser ){
                    parser.close();
                }

                return opts.error(err);
            }
            
            if(err){
                return fail(err);
            }

            nextFileBlockIndex = 0;

            function visitNextBlock(){
                var fileBlock;

                if(documentEndReached || paused){
                    return;
                }

                if(nextFileBlockIndex >= parser.fileBlocks.length){
                    documentEndReached = true;

                    parser.close();

                    opts.endDocument();

                    return;
                }

                fileBlock = parser.fileBlocks[nextFileBlockIndex];

                parser.readBlock(fileBlock, function(err, block){
                    if(err){
                        return fail(err);
                    }

                    visitBlock(fileBlock, block, opts);

                    nextFileBlockIndex += 1;

                    visitNextBlock();
                });
            }

            resumeCallback = visitNextBlock;

            visitNextBlock();
        }
    });

    function pause(){
        paused = true;
    }

    function resume(){
        paused = false;

        if(resumeCallback){
            resumeCallback();
        }
    }

    return {
        pause: pause,

        resume: resume
    };
}

function createPathParser(opts){
    reader.open(opts, function(err, fd){
        createFileParser(fd, function(err, parser){
            if(err){
                return opts.callback(err);
            }

            parser.close = function(callback){
                return reader.close(fd, callback);
            };

            return opts.callback(null, parser);
        });
    });
}

function visitBlock(fileBlock, block, opts){
    BLOCK_VISITORS_BY_TYPE[fileBlock.blobHeader.type](block, opts);
}

function visitOSMHeaderBlock(block, opts){
    // TODO
}

function visitOSMDataBlock(block, opts){
    var i;

    for(i = 0; i < block.primitivegroup.length; ++i){
        visitPrimitiveGroup(block.primitivegroup[i], opts);
    }
}

function visitPrimitiveGroup(pg, opts){
    var i;

    // visit nodes
    if(opts.node){
        for(i = 0; i < pg.nodesView.length; ++i){
            opts.node(pg.nodesView.get(i));
        }
    }

    // visit ways
    if(opts.way){
        for(i = 0; i < pg.waysView.length; ++i){
            opts.way(pg.waysView.get(i));
        }
    }

    // visit relations
    if(opts.relation){
        for(i = 0; i < pg.relationsView.length; ++i){
            opts.relation(pg.relationsView.get(i));
        }
    }
}

var BLOCK_VISITORS_BY_TYPE = {
    OSMHeader: visitOSMHeaderBlock,
    OSMData: visitOSMDataBlock
};

var BLOB_HEADER_SIZE_SIZE = 4;

function readBlobHeaderContent(fd, position, size, callback){
    return reader.readPBFElement(fd, position, size, fileFormat.BlobHeader.decode, callback);
}

function readFileBlock(fd, position, callback){
    reader.readBlobHeaderSize(fd, position, BLOB_HEADER_SIZE_SIZE, function(err, blobHeaderSize){
        if(err){
            return callback(err);
        }

        return readBlobHeaderContent(fd, position + BLOB_HEADER_SIZE_SIZE, blobHeaderSize, function(err, blobHeader){
            if(err){
                return callback(err);
            }

            blobHeader.position = position + BLOB_HEADER_SIZE_SIZE + blobHeaderSize;

            return callback(err, {
                position: position,
                size: BLOB_HEADER_SIZE_SIZE + blobHeaderSize + blobHeader.datasize,
                blobHeader: blobHeader
            });
        });
    });
}

function readFileBlocks(fd, callback){
    reader.getFileSize(fd, function(err, fileSize){
        var position, fileBlocks;

        position = 0;
        fileBlocks = [];

        function readNextFileBlock(){
            readFileBlock(fd, position, function(err, fileBlock){
                if(err){
                    return callback(err);
                }

                fileBlocks.push(fileBlock);

                position = fileBlock.position + fileBlock.size;

                if(position < fileSize){
                    readNextFileBlock();
                }
                else{
                    return callback(null, fileBlocks);
                }
            });
        }

        readNextFileBlock();
    });
}

function getStringTableEntry(i){
    var s, str;

    // decode StringTable entry only once and cache
    if (i in this.cache) {
        str = this.cache[i];
    } else {
        s = this.s[i];

        // obviously someone is missinterpreting the meanding of 'offset'
        // and 'length'. they should be named 'start' and 'end' instead.
        str = s.readUTF8StringBytes(s.length - s.offset, s.offset).string;
        this.cache[i] = str;
    }

    return str;
}

function extendStringTable(st){
    st.cache = {};
    st.getEntry = getStringTableEntry;
}

function createNodesView(pb, pg){
    var length, tagsList, deltaData;

    if(pg.nodes.length !== 0){
        throw new Error('primitivegroup.nodes.length !== 0 not supported yet');
    }

    length = 0;

    if(pg.dense){
        length = pg.dense.id.length;
    }

    function createTagsList(){
        var tagsList, i, tagsListI, tags, keyId, keysVals, valId, key, val;

        if(!pg.dense){
            return null;
        }

        keysVals = pg.dense.keys_vals;
        tags = {};
        tagsList = [];

        for(i = 0; i < keysVals.length;){
            keyId = keysVals[i++];

            if(keyId === 0){
                tagsList.push(tags);

                tags = {};

                continue;
            }
            
            valId = keysVals[i++];

            key = pb.stringtable.getEntry(keyId);
            val = pb.stringtable.getEntry(valId);

            tags[key] = val;
        }

        return tagsList;
    }

    tagsList = createTagsList();

    function collectDeltaData(){
        var i, id, timestamp, changeset, uid, userIndex, deltaDataList, deltaData, lat, lon;

        if(!pg.dense){
            return null;
        }

        id = 0;
        lat = 0;
        lon = 0;

        if(pg.dense.denseinfo){
            timestamp = 0;
            changeset = 0;
            uid = 0;
            userIndex = 0;
        }

        deltaDataList = [];

        for(i = 0; i < length; ++i){
            // TODO we should test wheather adding 64bit numbers works fine with high values
            id += pg.dense.id[i].toNumber();

            lat += pg.dense.lat[i].toNumber();
            lon += pg.dense.lon[i].toNumber();

            deltaData = {
                id: id,
                lat: lat,
                lon: lon
            };

            if(pg.dense.denseinfo){
                // TODO we should test wheather adding 64bit numbers works fine with high values
                timestamp += pg.dense.denseinfo.timestamp[i].toNumber();
                changeset += pg.dense.denseinfo.changeset[i].toNumber();

                // TODO we should test wheather adding 64bit numbers works fine with high values
                uid += pg.dense.denseinfo.uid[i];

                userIndex += pg.dense.denseinfo.user_sid[i];

                deltaData.timestamp = timestamp * pb.date_granularity;
                deltaData.changeset = changeset;
                deltaData.uid = uid;
                deltaData.userIndex = userIndex;
            }

            deltaDataList.push(deltaData);
        }

        return deltaDataList;
    }

    deltaData = collectDeltaData();

    function get(i){
        var node, nodeDeltaData;

        nodeDeltaData = deltaData[i];

        node = {
            id: '' + nodeDeltaData.id,
            lat: (pb.lat_offset.toNumber() + (pb.granularity * nodeDeltaData.lat)) / 1000000000,
            lon: (pb.lon_offset.toNumber() + (pb.granularity * nodeDeltaData.lon)) / 1000000000,
            tags: tagsList[i]
        };

        if(pg.dense.denseinfo){
            node.version = pg.dense.denseinfo.version[i];
            node.timestamp = nodeDeltaData.timestamp;
            node.changeset = nodeDeltaData.changeset;
            node.uid = '' + nodeDeltaData.uid;
            node.user = pb.stringtable.getEntry(nodeDeltaData.userIndex);
        }

        return node;
    }

    return {
        length: length,
        get: get
    };
}

function createTagsObject(pb, entity){
    var tags, i, len, keyI, valI, key, val;

    tags = {};

    for(i = 0, len = entity.keys.length; i < len; ++i){
        keyI = entity.keys[i];
        valI = entity.vals[i];

        key = pb.stringtable.getEntry(keyI);
        val = pb.stringtable.getEntry(valI);

        tags[key] = val;
    }

    return tags;
}

function addInfo(pb, result, info){
    if (info) {
        if (info.version) {
            result.version = info.version;
        }
        if (info.timestamp) {
            result.timestamp = info.timestamp.toNumber() * pb.date_granularity;
        }
        if (info.changeset) {
            result.changeset = info.changeset.toNumber();
        }
        if (info.uid) {
            result.uid = '' + info.uid;
        }
        if (info.user_sid) {
            result.user = pb.stringtable.getEntry(info.user_sid);
        }
    }
}

function createWaysView(pb, pg){
    var length;

    length = pg.ways.length;

    function get(i){
        var way, result, info;

        way = pg.ways[i];

        function createNodeRefIds(){
            var nodeIds, lastRefId, i;

            nodeIds = [];
            lastRefId = 0;

            for(i = 0; i < way.refs.length; ++i){
                // TODO we should test wheather adding 64bit numbers works fine with high values
                lastRefId += way.refs[i].toNumber();

                nodeIds.push('' + lastRefId);
            }

            return nodeIds;
        }

        result = {
            id: way.id.toString(),
            tags: createTagsObject(pb, way),
            nodeRefs: createNodeRefIds()
        };

        addInfo(pb, result, way.info);

        return result;
    }

    return {
        length: length,
        get: get
    };
}

function createRelationsView(pb, pg){
    var length;

    length = pg.relations.length;

    function get(i){
        var relation, result, info;

        relation = pg.relations[i];

        function createMembers(){
            var members, memberObj, lastRefId, i, MemberType, type;

            MemberType = blockFormat.Relation.MemberType;
            members = [];
            lastRefId = 0;

            for(i = 0; i < relation.memids.length; ++i){
                memberObj = {};

                // TODO we should test wheather adding 64bit numbers works fine with high values
                lastRefId += relation.memids[i].toNumber();
                memberObj.ref = '' + lastRefId;

                memberObj.role = pb.stringtable.getEntry(relation.roles_sid[i]);

                type = relation.types[i];
                if (MemberType.NODE === type) {
                    memberObj.type = 'node';
                } else if(MemberType.WAY === type) {
                    memberObj.type = 'way';
                } else if(MemberType.RELATION === type) {
                    memberObj.type = 'relation';
                }

                members.push(memberObj);
            }

            return members;
        }

        result = {
            id: relation.id.toString(),
            tags: createTagsObject(pb, relation),
            members: createMembers()
        };

        addInfo(pb, result, relation.info);

        return result;
    }

    return {
        length: length,
        get: get
    };
}

function extendPrimitiveGroup(pb, pg){
    pg.nodesView = createNodesView(pb, pg);
    pg.waysView = createWaysView(pb, pg);
    pg.relationsView = createRelationsView(pb, pg);
}

function decodePrimitiveBlock(buffer){
    var data, i;

    data = blockFormat.PrimitiveBlock.decode(buffer);

    // extend stringtable
    extendStringTable(data.stringtable);

    // extend primitivegroup
    for(i = 0; i < data.primitivegroup.length; ++i){
        extendPrimitiveGroup(data, data.primitivegroup[i]);
    }

    return data;
}

var OSM_BLOB_DECODER_BY_TYPE = {
    'OSMHeader': blockFormat.HeaderBlock.decode,
    'OSMData': decodePrimitiveBlock
};

function createFileParser(fd, callback){
    readFileBlocks(fd, function(err, fileBlocks){
        if(err){
            return callback(err);
        }

        function findFileBlocksByBlobType(blobType){
            var blocks, i, block;

            blocks = [];

            for(i = 0; i < fileBlocks.length; ++i){
                block = fileBlocks[i];

                if(block.blobHeader.type !== blobType){
                    continue;
                }

                blocks.push(block);
            }

            return blocks;
        }

        function readBlob(fileBlock, callback){
            return reader.readPBFElement(fd, fileBlock.blobHeader.position, fileBlock.blobHeader.datasize, fileFormat.Blob.decode, callback);
        }

        function readBlock(fileBlock, callback){
            return readBlob(fileBlock, function(err, blob){
                if(err){
                    return callback(err);
                }

                if(blob.raw_size === 0){
                    return callback('Uncompressed pbfs are currently not supported.');
                }

                zlib.inflateBlob(blob, function(err, data){
                    if(err){
                        return callback(err);
                    }

                    return buf.readPBFElementFromBuffer(data, OSM_BLOB_DECODER_BY_TYPE[fileBlock.blobHeader.type], callback);
                });
            });
        }

        return callback(null, {
            fileBlocks: fileBlocks,
            
            findFileBlocksByBlobType: findFileBlocksByBlobType,

            readBlock: readBlock
        });
    });
}

module.exports = {
    parse: parse,

    createParser: createPathParser
};

},{"./browser/arrayBufferReader.js":1,"./browser/buffer.js":2,"./browser/zlib.js":3,"./nodejs/buffer.js":4,"./nodejs/fsReader.js":5,"./nodejs/zlib.js":6,"./proto/fileformat.js":8,"./proto/osmformat.js":9,"protobufjs":10}],8:[function(_dereq_,module,exports){
module.exports = _dereq_("protobufjs").newBuilder().import({
    "package": "OSMPBF",
    "messages": [
        {
            "name": "Blob",
            "fields": [
                {
                    "rule": "optional",
                    "type": "bytes",
                    "name": "raw",
                    "id": 1,
                    "options": {}
                },
                {
                    "rule": "optional",
                    "type": "int32",
                    "name": "raw_size",
                    "id": 2,
                    "options": {}
                },
                {
                    "rule": "optional",
                    "type": "bytes",
                    "name": "zlib_data",
                    "id": 3,
                    "options": {}
                },
                {
                    "rule": "optional",
                    "type": "bytes",
                    "name": "lzma_data",
                    "id": 4,
                    "options": {}
                },
                {
                    "rule": "optional",
                    "type": "bytes",
                    "name": "OBSOLETE_bzip2_data",
                    "id": 5,
                    "options": {
                        "deprecated": true
                    }
                }
            ],
            "enums": [],
            "messages": [],
            "options": {}
        },
        {
            "name": "BlobHeader",
            "fields": [
                {
                    "rule": "required",
                    "type": "string",
                    "name": "type",
                    "id": 1,
                    "options": {}
                },
                {
                    "rule": "optional",
                    "type": "bytes",
                    "name": "indexdata",
                    "id": 2,
                    "options": {}
                },
                {
                    "rule": "required",
                    "type": "int32",
                    "name": "datasize",
                    "id": 3,
                    "options": {}
                }
            ],
            "enums": [],
            "messages": [],
            "options": {}
        }
    ],
    "enums": [],
    "imports": [],
    "options": {
        "optimize_for": "LITE_RUNTIME",
        "java_package": "org.openstreetmap.osmosis.osmbinary"
    },
    "services": []
}).build("OSMPBF");

},{"protobufjs":10}],9:[function(_dereq_,module,exports){
module.exports = _dereq_("protobufjs").newBuilder().import({
    "package": "OSMPBF",
    "messages": [
        {
            "name": "HeaderBlock",
            "fields": [
                {
                    "rule": "optional",
                    "type": "HeaderBBox",
                    "name": "bbox",
                    "id": 1,
                    "options": {}
                },
                {
                    "rule": "repeated",
                    "type": "string",
                    "name": "required_features",
                    "id": 4,
                    "options": {}
                },
                {
                    "rule": "repeated",
                    "type": "string",
                    "name": "optional_features",
                    "id": 5,
                    "options": {}
                },
                {
                    "rule": "optional",
                    "type": "string",
                    "name": "writingprogram",
                    "id": 16,
                    "options": {}
                },
                {
                    "rule": "optional",
                    "type": "string",
                    "name": "source",
                    "id": 17,
                    "options": {}
                },
                {
                    "rule": "optional",
                    "type": "int64",
                    "name": "osmosis_replication_timestamp",
                    "id": 32,
                    "options": {}
                },
                {
                    "rule": "optional",
                    "type": "int64",
                    "name": "osmosis_replication_sequence_number",
                    "id": 33,
                    "options": {}
                },
                {
                    "rule": "optional",
                    "type": "string",
                    "name": "osmosis_replication_base_url",
                    "id": 34,
                    "options": {}
                }
            ],
            "enums": [],
            "messages": [],
            "options": {}
        },
        {
            "name": "HeaderBBox",
            "fields": [
                {
                    "rule": "required",
                    "type": "sint64",
                    "name": "left",
                    "id": 1,
                    "options": {}
                },
                {
                    "rule": "required",
                    "type": "sint64",
                    "name": "right",
                    "id": 2,
                    "options": {}
                },
                {
                    "rule": "required",
                    "type": "sint64",
                    "name": "top",
                    "id": 3,
                    "options": {}
                },
                {
                    "rule": "required",
                    "type": "sint64",
                    "name": "bottom",
                    "id": 4,
                    "options": {}
                }
            ],
            "enums": [],
            "messages": [],
            "options": {}
        },
        {
            "name": "PrimitiveBlock",
            "fields": [
                {
                    "rule": "required",
                    "type": "StringTable",
                    "name": "stringtable",
                    "id": 1,
                    "options": {}
                },
                {
                    "rule": "repeated",
                    "type": "PrimitiveGroup",
                    "name": "primitivegroup",
                    "id": 2,
                    "options": {}
                },
                {
                    "rule": "optional",
                    "type": "int32",
                    "name": "granularity",
                    "id": 17,
                    "options": {
                        "default": 100
                    }
                },
                {
                    "rule": "optional",
                    "type": "int64",
                    "name": "lat_offset",
                    "id": 19,
                    "options": {
                        "default": 0
                    }
                },
                {
                    "rule": "optional",
                    "type": "int64",
                    "name": "lon_offset",
                    "id": 20,
                    "options": {
                        "default": 0
                    }
                },
                {
                    "rule": "optional",
                    "type": "int32",
                    "name": "date_granularity",
                    "id": 18,
                    "options": {
                        "default": 1000
                    }
                }
            ],
            "enums": [],
            "messages": [],
            "options": {}
        },
        {
            "name": "PrimitiveGroup",
            "fields": [
                {
                    "rule": "repeated",
                    "type": "Node",
                    "name": "nodes",
                    "id": 1,
                    "options": {}
                },
                {
                    "rule": "optional",
                    "type": "DenseNodes",
                    "name": "dense",
                    "id": 2,
                    "options": {}
                },
                {
                    "rule": "repeated",
                    "type": "Way",
                    "name": "ways",
                    "id": 3,
                    "options": {}
                },
                {
                    "rule": "repeated",
                    "type": "Relation",
                    "name": "relations",
                    "id": 4,
                    "options": {}
                },
                {
                    "rule": "repeated",
                    "type": "ChangeSet",
                    "name": "changesets",
                    "id": 5,
                    "options": {}
                }
            ],
            "enums": [],
            "messages": [],
            "options": {}
        },
        {
            "name": "StringTable",
            "fields": [
                {
                    "rule": "repeated",
                    "type": "bytes",
                    "name": "s",
                    "id": 1,
                    "options": {}
                }
            ],
            "enums": [],
            "messages": [],
            "options": {}
        },
        {
            "name": "Info",
            "fields": [
                {
                    "rule": "optional",
                    "type": "int32",
                    "name": "version",
                    "id": 1,
                    "options": {
                        "default": -1
                    }
                },
                {
                    "rule": "optional",
                    "type": "int64",
                    "name": "timestamp",
                    "id": 2,
                    "options": {}
                },
                {
                    "rule": "optional",
                    "type": "int64",
                    "name": "changeset",
                    "id": 3,
                    "options": {}
                },
                {
                    "rule": "optional",
                    "type": "int32",
                    "name": "uid",
                    "id": 4,
                    "options": {}
                },
                {
                    "rule": "optional",
                    "type": "uint32",
                    "name": "user_sid",
                    "id": 5,
                    "options": {}
                },
                {
                    "rule": "optional",
                    "type": "bool",
                    "name": "visible",
                    "id": 6,
                    "options": {}
                }
            ],
            "enums": [],
            "messages": [],
            "options": {}
        },
        {
            "name": "DenseInfo",
            "fields": [
                {
                    "rule": "repeated",
                    "type": "int32",
                    "name": "version",
                    "id": 1,
                    "options": {
                        "packed": true
                    }
                },
                {
                    "rule": "repeated",
                    "type": "sint64",
                    "name": "timestamp",
                    "id": 2,
                    "options": {
                        "packed": true
                    }
                },
                {
                    "rule": "repeated",
                    "type": "sint64",
                    "name": "changeset",
                    "id": 3,
                    "options": {
                        "packed": true
                    }
                },
                {
                    "rule": "repeated",
                    "type": "sint32",
                    "name": "uid",
                    "id": 4,
                    "options": {
                        "packed": true
                    }
                },
                {
                    "rule": "repeated",
                    "type": "sint32",
                    "name": "user_sid",
                    "id": 5,
                    "options": {
                        "packed": true
                    }
                },
                {
                    "rule": "repeated",
                    "type": "bool",
                    "name": "visible",
                    "id": 6,
                    "options": {
                        "packed": true
                    }
                }
            ],
            "enums": [],
            "messages": [],
            "options": {}
        },
        {
            "name": "ChangeSet",
            "fields": [
                {
                    "rule": "required",
                    "type": "int64",
                    "name": "id",
                    "id": 1,
                    "options": {}
                }
            ],
            "enums": [],
            "messages": [],
            "options": {}
        },
        {
            "name": "Node",
            "fields": [
                {
                    "rule": "required",
                    "type": "sint64",
                    "name": "id",
                    "id": 1,
                    "options": {}
                },
                {
                    "rule": "repeated",
                    "type": "uint32",
                    "name": "keys",
                    "id": 2,
                    "options": {
                        "packed": true
                    }
                },
                {
                    "rule": "repeated",
                    "type": "uint32",
                    "name": "vals",
                    "id": 3,
                    "options": {
                        "packed": true
                    }
                },
                {
                    "rule": "optional",
                    "type": "Info",
                    "name": "info",
                    "id": 4,
                    "options": {}
                },
                {
                    "rule": "required",
                    "type": "sint64",
                    "name": "lat",
                    "id": 8,
                    "options": {}
                },
                {
                    "rule": "required",
                    "type": "sint64",
                    "name": "lon",
                    "id": 9,
                    "options": {}
                }
            ],
            "enums": [],
            "messages": [],
            "options": {}
        },
        {
            "name": "DenseNodes",
            "fields": [
                {
                    "rule": "repeated",
                    "type": "sint64",
                    "name": "id",
                    "id": 1,
                    "options": {
                        "packed": true
                    }
                },
                {
                    "rule": "optional",
                    "type": "DenseInfo",
                    "name": "denseinfo",
                    "id": 5,
                    "options": {}
                },
                {
                    "rule": "repeated",
                    "type": "sint64",
                    "name": "lat",
                    "id": 8,
                    "options": {
                        "packed": true
                    }
                },
                {
                    "rule": "repeated",
                    "type": "sint64",
                    "name": "lon",
                    "id": 9,
                    "options": {
                        "packed": true
                    }
                },
                {
                    "rule": "repeated",
                    "type": "int32",
                    "name": "keys_vals",
                    "id": 10,
                    "options": {
                        "packed": true
                    }
                }
            ],
            "enums": [],
            "messages": [],
            "options": {}
        },
        {
            "name": "Way",
            "fields": [
                {
                    "rule": "required",
                    "type": "int64",
                    "name": "id",
                    "id": 1,
                    "options": {}
                },
                {
                    "rule": "repeated",
                    "type": "uint32",
                    "name": "keys",
                    "id": 2,
                    "options": {
                        "packed": true
                    }
                },
                {
                    "rule": "repeated",
                    "type": "uint32",
                    "name": "vals",
                    "id": 3,
                    "options": {
                        "packed": true
                    }
                },
                {
                    "rule": "optional",
                    "type": "Info",
                    "name": "info",
                    "id": 4,
                    "options": {}
                },
                {
                    "rule": "repeated",
                    "type": "sint64",
                    "name": "refs",
                    "id": 8,
                    "options": {
                        "packed": true
                    }
                }
            ],
            "enums": [],
            "messages": [],
            "options": {}
        },
        {
            "name": "Relation",
            "fields": [
                {
                    "rule": "required",
                    "type": "int64",
                    "name": "id",
                    "id": 1,
                    "options": {}
                },
                {
                    "rule": "repeated",
                    "type": "uint32",
                    "name": "keys",
                    "id": 2,
                    "options": {
                        "packed": true
                    }
                },
                {
                    "rule": "repeated",
                    "type": "uint32",
                    "name": "vals",
                    "id": 3,
                    "options": {
                        "packed": true
                    }
                },
                {
                    "rule": "optional",
                    "type": "Info",
                    "name": "info",
                    "id": 4,
                    "options": {}
                },
                {
                    "rule": "repeated",
                    "type": "int32",
                    "name": "roles_sid",
                    "id": 8,
                    "options": {
                        "packed": true
                    }
                },
                {
                    "rule": "repeated",
                    "type": "sint64",
                    "name": "memids",
                    "id": 9,
                    "options": {
                        "packed": true
                    }
                },
                {
                    "rule": "repeated",
                    "type": "MemberType",
                    "name": "types",
                    "id": 10,
                    "options": {
                        "packed": true
                    }
                }
            ],
            "enums": [
                {
                    "name": "MemberType",
                    "values": [
                        {
                            "name": "NODE",
                            "id": 0
                        },
                        {
                            "name": "WAY",
                            "id": 1
                        },
                        {
                            "name": "RELATION",
                            "id": 2
                        }
                    ],
                    "options": {}
                }
            ],
            "messages": [],
            "options": {}
        }
    ],
    "enums": [],
    "imports": [],
    "options": {
        "optimize_for": "LITE_RUNTIME",
        "java_package": "org.openstreetmap.osmosis.osmbinary"
    },
    "services": []
}).build("OSMPBF");

},{"protobufjs":10}],10:[function(_dereq_,module,exports){
(function (process){
/*
 ProtoBuf.js (c) 2013 Daniel Wirtz <dcode@dcode.io>
 Released under the Apache License, Version 2.0
 see: https://github.com/dcodeIO/ProtoBuf.js for details
*/
(function(q){function r(p){var k={VERSION:"2.0.5",WIRE_TYPES:{}};k.WIRE_TYPES.VARINT=0;k.WIRE_TYPES.BITS64=1;k.WIRE_TYPES.LDELIM=2;k.WIRE_TYPES.STARTGROUP=3;k.WIRE_TYPES.ENDGROUP=4;k.WIRE_TYPES.BITS32=5;k.TYPES={int32:{name:"int32",wireType:k.WIRE_TYPES.VARINT},uint32:{name:"uint32",wireType:k.WIRE_TYPES.VARINT},sint32:{name:"sint32",wireType:k.WIRE_TYPES.VARINT},int64:{name:"int64",wireType:k.WIRE_TYPES.VARINT},uint64:{name:"uint64",wireType:k.WIRE_TYPES.VARINT},sint64:{name:"sint64",wireType:k.WIRE_TYPES.VARINT},
bool:{name:"bool",wireType:k.WIRE_TYPES.VARINT},"double":{name:"double",wireType:k.WIRE_TYPES.BITS64},string:{name:"string",wireType:k.WIRE_TYPES.LDELIM},bytes:{name:"bytes",wireType:k.WIRE_TYPES.LDELIM},fixed32:{name:"fixed32",wireType:k.WIRE_TYPES.BITS32},sfixed32:{name:"sfixed32",wireType:k.WIRE_TYPES.BITS32},fixed64:{name:"fixed64",wireType:k.WIRE_TYPES.BITS64},sfixed64:{name:"sfixed64",wireType:k.WIRE_TYPES.BITS64},"float":{name:"float",wireType:k.WIRE_TYPES.BITS32},"enum":{name:"enum",wireType:k.WIRE_TYPES.VARINT},
message:{name:"message",wireType:k.WIRE_TYPES.LDELIM}};k.Long=p.Long;k.convertFieldsToCamelCase=!1;k.Util=function(){Object.create||(Object.create=function(c){function m(){}if(1<arguments.length)throw Error("Object.create implementation only accepts the first parameter.");m.prototype=c;return new m});var c={};c.IS_NODE=("undefined"===typeof window||!window.window)&&"function"===typeof _dereq_&&"undefined"!==typeof process&&"function"===typeof process.nextTick;c.XHR=function(){for(var c=[function(){return new XMLHttpRequest},
function(){return new ActiveXObject("Msxml2.XMLHTTP")},function(){return new ActiveXObject("Msxml3.XMLHTTP")},function(){return new ActiveXObject("Microsoft.XMLHTTP")}],m=null,l=0;l<c.length;l++){try{m=c[l]()}catch(a){continue}break}if(!m)throw Error("XMLHttpRequest is not supported");return m};c.fetch=function(h,m){m&&"function"!=typeof m&&(m=null);if(c.IS_NODE)if(m)_dereq_("fs").readFile(h,function(a,c){a?m(null):m(""+c)});else try{return _dereq_("fs").readFileSync(h)}catch(l){return null}else{var a=
c.XHR();a.open("GET",h,m?!0:!1);a.setRequestHeader("Accept","text/plain");"function"===typeof a.overrideMimeType&&a.overrideMimeType("text/plain");if(m)a.onreadystatechange=function(){4==a.readyState&&(200==a.status||0==a.status&&"string"===typeof a.responseText?m(a.responseText):m(null))},4!=a.readyState&&a.send(null);else return a.send(null),200==a.status||0==a.status&&"string"===typeof a.responseText?a.responseText:null}};c.isArray=function(c){return c?c instanceof Array?!0:Array.isArray?Array.isArray(c):
"[object Array]"===Object.prototype.toString.call(c):!1};return c}();k.Lang={OPEN:"{",CLOSE:"}",OPTOPEN:"[",OPTCLOSE:"]",OPTEND:",",EQUAL:"=",END:";",STRINGOPEN:'"',STRINGCLOSE:'"',COPTOPEN:"(",COPTCLOSE:")",DELIM:/[\s\{\}=;\[\],"\(\)]/g,KEYWORD:/^(?:package|option|import|message|enum|extend|service|syntax|extensions)$/,RULE:/^(?:required|optional|repeated)$/,TYPE:/^(?:double|float|int32|uint32|sint32|int64|uint64|sint64|fixed32|sfixed32|fixed64|sfixed64|bool|string|bytes)$/,NAME:/^[a-zA-Z][a-zA-Z_0-9]*$/,
OPTNAME:/^(?:[a-zA-Z][a-zA-Z_0-9]*|\([a-zA-Z][a-zA-Z_0-9]*\))$/,TYPEDEF:/^[a-zA-Z][a-zA-Z_0-9]*$/,TYPEREF:/^(?:\.?[a-zA-Z][a-zA-Z_0-9]*)+$/,FQTYPEREF:/^(?:\.[a-zA-Z][a-zA-Z_0-9]*)+$/,NUMBER:/^-?(?:[1-9][0-9]*|0|0x[0-9a-fA-F]+|0[0-7]+|[0-9]*\.[0-9]+)$/,NUMBER_DEC:/^(?:[1-9][0-9]*|0)$/,NUMBER_HEX:/^0x[0-9a-fA-F]+$/,NUMBER_OCT:/^0[0-7]+$/,NUMBER_FLT:/^[0-9]*\.[0-9]+$/,ID:/^(?:[1-9][0-9]*|0|0x[0-9a-fA-F]+|0[0-7]+)$/,NEGID:/^\-?(?:[1-9][0-9]*|0|0x[0-9a-fA-F]+|0[0-7]+)$/,WHITESPACE:/\s/,STRING:/"([^"\\]*(\\.[^"\\]*)*)"/g,
BOOL:/^(?:true|false)$/i,ID_MIN:1,ID_MAX:536870911};k.Reflect=function(c){var h={},m=function(b,f){this.parent=b;this.name=f};m.prototype.fqn=function(){var b=this.name,f=this;do{f=f.parent;if(null==f)break;b=f.name+"."+b}while(1);return b};m.prototype.toString=function(b){var f=this.fqn();b&&(this instanceof a?f="Message "+f:this instanceof a.Field?f="Message.Field "+f:this instanceof d?f="Enum "+f:this instanceof d.Value?f="Enum.Value "+f:this instanceof g?f="Service "+f:this instanceof g.Method?
f=this instanceof g.RPCMethod?"Service.RPCMethod "+f:"Service.Method "+f:this instanceof l&&(f="Namespace "+f));return f};m.prototype.build=function(){throw Error(this.toString(!0)+" cannot be built directly");};h.T=m;var l=function(b,f,a){m.call(this,b,f);this.children=[];this.options=a||{}};l.prototype=Object.create(m.prototype);l.prototype.getChildren=function(b){b=b||null;if(null==b)return this.children.slice();for(var f=[],a=0;a<this.children.length;a++)this.children[a]instanceof b&&f.push(this.children[a]);
return f};l.prototype.addChild=function(b){var f;if(f=this.getChild(b.name))if(f instanceof a.Field&&f.name!==f.originalName&&!this.hasChild(f.originalName))f.name=f.originalName;else if(b instanceof a.Field&&b.name!==b.originalName&&!this.hasChild(b.originalName))b.name=b.originalName;else throw Error("Duplicate name in namespace "+this.toString(!0)+": "+b.name);this.children.push(b)};l.prototype.hasChild=function(b){var f;if("number"==typeof b)for(f=0;f<this.children.length;f++){if("undefined"!==
typeof this.children[f].id&&this.children[f].id==b)return!0}else for(f=0;f<this.children.length;f++)if("undefined"!==typeof this.children[f].name&&this.children[f].name==b)return!0;return!1};l.prototype.getChild=function(b){var f;if("number"==typeof b)for(f=0;f<this.children.length;f++){if("undefined"!==typeof this.children[f].id&&this.children[f].id==b)return this.children[f]}else for(f=0;f<this.children.length;f++)if("undefined"!==typeof this.children[f].name&&this.children[f].name==b)return this.children[f];
return null};l.prototype.resolve=function(b,f){var a=b.split("."),c=this,d=0;if(""==a[d]){for(;null!=c.parent;)c=c.parent;d++}do{do{c=c.getChild(a[d]);if(!(c&&c instanceof h.T)||f&&c instanceof h.Message.Field){c=null;break}d++}while(d<a.length);if(null!=c)break;if(null!==this.parent)return this.parent.resolve(b,f)}while(null!=c);return c};l.prototype.build=function(){for(var b={},f=this.getChildren(),a,c=0;c<f.length;c++)a=f[c],a instanceof l&&(b[a.name]=a.build());Object.defineProperty&&Object.defineProperty(b,
"$options",{value:this.buildOpt(),enumerable:!1,configurable:!1,writable:!1});return b};l.prototype.buildOpt=function(){for(var b={},f=Object.keys(this.options),a=0;a<f.length;a++)b[f[a]]=this.options[f[a]];return b};l.prototype.getOption=function(b){return"undefined"==typeof b?this.options:"undefined"!=typeof this.options[b]?this.options[b]:null};h.Namespace=l;var a=function(b,f,a){l.call(this,b,f,a);this.extensions=[c.Lang.ID_MIN,c.Lang.ID_MAX];this.clazz=null};a.prototype=Object.create(l.prototype);
a.prototype.build=function(b){if(this.clazz&&!b)return this.clazz;b=function(b,f){var a=f.getChildren(h.Message.Field),c=function(f){b.Builder.Message.call(this);var c,d;for(c=0;c<a.length;c++)d=a[c],this[d.name]=d.repeated?[]:null;for(c=0;c<a.length;c++)if(d=a[c],"undefined"!=typeof d.options["default"])try{this.set(d.name,d.options["default"])}catch(n){throw Error("[INTERNAL] "+n);}if(1!=arguments.length||"object"!=typeof f||"function"==typeof f.encode||b.Util.isArray(f)||f instanceof p||f instanceof
ArrayBuffer||b.Long&&f instanceof b.Long)for(c=0;c<arguments.length;c++)c<a.length&&this.set(a[c].name,arguments[c]);else for(d=Object.keys(f),c=0;c<d.length;c++)this.set(d[c],f[d[c]])};c.prototype=Object.create(b.Builder.Message.prototype);c.prototype.add=function(a,c){var d=f.getChild(a);if(!d)throw Error(this+"#"+a+" is undefined");if(!(d instanceof b.Reflect.Message.Field))throw Error(this+"#"+a+" is not a field: "+d.toString(!0));if(!d.repeated)throw Error(this+"#"+a+" is not a repeated field");
null===this[d.name]&&(this[d.name]=[]);this[d.name].push(d.verifyValue(c,!0))};c.prototype.set=function(a,c){var d=f.getChild(a);if(!d)throw Error(this+"#"+a+" is not a field: undefined");if(!(d instanceof b.Reflect.Message.Field))throw Error(this+"#"+a+" is not a field: "+d.toString(!0));this[d.name]=d.verifyValue(c)};c.prototype.get=function(a){var c=f.getChild(a);if(!(c&&c instanceof b.Reflect.Message.Field))throw Error(this+"#"+a+" is not a field: undefined");if(!(c instanceof b.Reflect.Message.Field))throw Error(this+
"#"+a+" is not a field: "+c.toString(!0));return this[c.name]};for(var d=0;d<a.length;d++)(function(b){var a=b.originalName.replace(/(_[a-zA-Z])/g,function(b){return b.toUpperCase().replace("_","")}),a=a.substring(0,1).toUpperCase()+a.substring(1),d=b.originalName.replace(/([A-Z])/g,function(b){return"_"+b});f.hasChild("set"+a)||(c.prototype["set"+a]=function(a){this.set(b.name,a)});f.hasChild("set_"+d)||(c.prototype["set_"+d]=function(a){this.set(b.name,a)});f.hasChild("get"+a)||(c.prototype["get"+
a]=function(){return this.get(b.name)});f.hasChild("get_"+d)||(c.prototype["get_"+d]=function(){return this.get(b.name)})})(a[d]);c.prototype.encode=function(b){b=b||new p;var a=b.littleEndian;try{return f.encode(this,b.LE()).flip().LE(a)}catch(c){throw b.LE(a),c;}};c.prototype.encodeAB=function(){try{return this.encode().toArrayBuffer()}catch(b){throw b.encoded&&(b.encoded=b.encoded.toArrayBuffer()),b;}};c.prototype.toArrayBuffer=c.prototype.encodeAB;c.prototype.encodeNB=function(){try{return this.encode().toBuffer()}catch(b){throw b.encoded&&
(b.encoded=b.encoded.toBuffer()),b;}};c.prototype.toBuffer=c.prototype.encodeNB;c.prototype.encode64=function(){try{return this.encode().toBase64()}catch(b){throw b.encoded&&(b.encoded=b.encoded.toBase64()),b;}};c.prototype.toBase64=c.prototype.encode64;c.prototype.encodeHex=function(){try{return this.encode().toHex()}catch(b){throw b.encoded&&(b.encoded=b.encoded.toHex()),b;}};c.prototype.toHex=c.prototype.encodeHex;c.decode=function(b,a){if(null===b)throw Error("buffer must not be null");"string"===
typeof b&&(b=p.wrap(b,a?a:"base64"));b=b instanceof p?b:p.wrap(b);var c=b.littleEndian;try{var d=f.decode(b.LE());b.LE(c);return d}catch(n){throw b.LE(c),n;}};c.decode64=function(b){return c.decode(b,"base64")};c.decodeHex=function(b){return c.decode(b,"hex")};c.prototype.toString=function(){return f.toString()};Object.defineProperty&&Object.defineProperty(c,"$options",{value:f.buildOpt(),enumerable:!1,configurable:!1,writable:!1});return c}(c,this);for(var f=this.getChildren(),n=0;n<f.length;n++)if(f[n]instanceof
d)b[f[n].name]=f[n].build();else if(f[n]instanceof a)b[f[n].name]=f[n].build();else if(!(f[n]instanceof a.Field))throw Error("Illegal reflect child of "+this.toString(!0)+": "+f[n].toString(!0));return this.clazz=b};a.prototype.encode=function(b,f){for(var c=this.getChildren(a.Field),d=null,e=0;e<c.length;e++){var h=b.get(c[e].name);c[e].required&&null===h?null===d&&(d=c[e]):c[e].encode(h,f)}if(null!==d)throw c=Error("Missing at least one required field for "+this.toString(!0)+": "+d),c.encoded=f,
c;return f};a.prototype.decode=function(b,a){a="number"===typeof a?a:-1;for(var d=b.offset,e=new this.clazz;b.offset<d+a||-1==a&&0<b.remaining();){var h=b.readVarint32(),g=h&7,h=h>>3,l=this.getChild(h);if(l)l.repeated&&!l.options.packed?e.add(l.name,l.decode(g,b)):e.set(l.name,l.decode(g,b));else switch(g){case c.WIRE_TYPES.VARINT:b.readVarint32();break;case c.WIRE_TYPES.BITS32:b.offset+=4;break;case c.WIRE_TYPES.BITS64:b.offset+=8;break;case c.WIRE_TYPES.LDELIM:g=b.readVarint32();b.offset+=g;break;
default:throw Error("Illegal wire type of unknown field "+h+" in "+this.toString(!0)+"#decode: "+g);}}d=this.getChildren(c.Reflect.Field);for(g=0;g<d.length;g++)if(d[g].required&&null===e[d[g].name])throw d=Error("Missing at least one required field for "+this.toString(!0)+": "+d[g].name),d.decoded=e,d;return e};h.Message=a;var e=function(b,a,d,e,g,h){m.call(this,b,e);this.required="required"==a;this.repeated="repeated"==a;this.type=d;this.resolvedType=null;this.id=g;this.options=h||{};this.originalName=
this.name;c.convertFieldsToCamelCase&&(this.name=this.name.replace(/_([a-zA-Z])/g,function(b,a){return a.toUpperCase()}))};e.prototype=Object.create(m.prototype);e.prototype.verifyValue=function(b,a){a=a||!1;if(null===b){if(this.required)throw Error("Illegal value for "+this.toString(!0)+": "+b+" (required)");return null}var e;if(this.repeated&&!a){c.Util.isArray(b)||(b=[b]);var g=[];for(e=0;e<b.length;e++)g.push(this.verifyValue(b[e],!0));return g}if(!this.repeated&&c.Util.isArray(b))throw Error("Illegal value for "+
this.toString(!0)+": "+b+" (no array expected)");if(this.type==c.TYPES.int32||this.type==c.TYPES.sint32||this.type==c.TYPES.sfixed32)return isNaN(e=parseInt(b,10))?e:e|0;if(this.type==c.TYPES.uint32||this.type==c.TYPES.fixed32)return isNaN(e=parseInt(b,10))?e:e>>>0;if(c.Long){if(this.type==c.TYPES.int64||this.type==c.TYPES.sint64||this.type==c.TYPES.sfixed64)return"object"==typeof b&&b instanceof c.Long?b.unsigned?b.toSigned():b:c.Long.fromNumber(b,!1);if(this.type==c.TYPES.uint64||this.type==c.TYPES.fixed64)return"object"==
typeof b&&b instanceof c.Long?b.unsigned?b:b.toUnsigned():c.Long.fromNumber(b,!0)}if(this.type==c.TYPES.bool)return"string"===typeof b?"true"===b:!!b;if(this.type==c.TYPES["float"]||this.type==c.TYPES["double"])return parseFloat(b);if(this.type==c.TYPES.string)return""+b;if(this.type==c.TYPES.bytes)return b&&b instanceof p?b:p.wrap(b);if(this.type==c.TYPES["enum"]){g=this.resolvedType.getChildren(d.Value);for(e=0;e<g.length;e++)if(g[e].name==b||g[e].id==b)return g[e].id;throw Error("Illegal value for "+
this.toString(!0)+": "+b+" (not a valid enum value)");}if(this.type==c.TYPES.message){if("object"!==typeof b)throw Error("Illegal value for "+this.toString(!0)+": "+b+" (object expected)");return b instanceof this.resolvedType.clazz?b:new this.resolvedType.clazz(b)}throw Error("[INTERNAL] Illegal value for "+this.toString(!0)+": "+b+" (undefined type "+this.type+")");};e.prototype.encode=function(b,a){b=this.verifyValue(b);if(null==this.type||"object"!=typeof this.type)throw Error("[INTERNAL] Unresolved type in "+
this.toString(!0)+": "+this.type);if(null===b||this.repeated&&0==b.length)return a;try{if(this.repeated){var d;if(this.options.packed){a.writeVarint32(this.id<<3|c.WIRE_TYPES.LDELIM);a.ensureCapacity(a.offset+=1);var e=a.offset;for(d=0;d<b.length;d++)this.encodeValue(b[d],a);var g=a.offset-e,h=p.calculateVarint32(g);if(1<h){var l=a.slice(e,a.offset),e=e+(h-1);a.offset=e;a.append(l)}a.writeVarint32(g,e-h)}else for(d=0;d<b.length;d++)a.writeVarint32(this.id<<3|this.type.wireType),this.encodeValue(b[d],
a)}else a.writeVarint32(this.id<<3|this.type.wireType),this.encodeValue(b,a)}catch(m){throw Error("Illegal value for "+this.toString(!0)+": "+b+" ("+m+")");}return a};e.prototype.encodeValue=function(b,a){if(null!==b){if(this.type==c.TYPES.int32||this.type==c.TYPES.uint32)a.writeVarint32(b);else if(this.type==c.TYPES.sint32)a.writeZigZagVarint32(b);else if(this.type==c.TYPES.fixed32)a.writeUint32(b);else if(this.type==c.TYPES.sfixed32)a.writeInt32(b);else if(this.type==c.TYPES.int64||this.type==c.TYPES.uint64)a.writeVarint64(b);
else if(this.type==c.TYPES.sint64)a.writeZigZagVarint64(b);else if(this.type==c.TYPES.fixed64)a.writeUint64(b);else if(this.type==c.TYPES.sfixed64)a.writeInt64(b);else if(this.type==c.TYPES.bool)"string"===typeof b?a.writeVarint32("false"===b.toLowerCase()?0:!!b):a.writeVarint32(b?1:0);else if(this.type==c.TYPES["enum"])a.writeVarint32(b);else if(this.type==c.TYPES["float"])a.writeFloat32(b);else if(this.type==c.TYPES["double"])a.writeFloat64(b);else if(this.type==c.TYPES.string)a.writeVString(b);
else if(this.type==c.TYPES.bytes)b.offset>b.length&&(a=a.clone().flip()),a.writeVarint32(b.remaining()),a.append(b);else if(this.type==c.TYPES.message){var d=(new p).LE();this.resolvedType.encode(b,d);a.writeVarint32(d.offset);a.append(d.flip())}else throw Error("[INTERNAL] Illegal value to encode in "+this.toString(!0)+": "+b+" (unknown type)");return a}};e.prototype.decode=function(b,a,d){if(b!=this.type.wireType&&(d||b!=c.WIRE_TYPES.LDELIM||!this.repeated))throw Error("Illegal wire type for field "+
this.toString(!0)+": "+b+" ("+this.type.wireType+" expected)");if(b==c.WIRE_TYPES.LDELIM&&this.repeated&&this.options.packed&&!d){b=a.readVarint32();b=a.offset+b;for(d=[];a.offset<b;)d.push(this.decode(this.type.wireType,a,!0));return d}if(this.type==c.TYPES.int32)return a.readVarint32()|0;if(this.type==c.TYPES.uint32)return a.readVarint32()>>>0;if(this.type==c.TYPES.sint32)return a.readZigZagVarint32()|0;if(this.type==c.TYPES.fixed32)return a.readUint32()>>>0;if(this.type==c.TYPES.sfixed32)return a.readInt32()|
0;if(this.type==c.TYPES.int64)return a.readVarint64();if(this.type==c.TYPES.uint64)return a.readVarint64().toUnsigned();if(this.type==c.TYPES.sint64)return a.readZigZagVarint64();if(this.type==c.TYPES.fixed64)return a.readUint64();if(this.type==c.TYPES.sfixed64)return a.readInt64();if(this.type==c.TYPES.bool)return!!a.readVarint32();if(this.type==c.TYPES["enum"])return a.readVarint32();if(this.type==c.TYPES["float"])return a.readFloat();if(this.type==c.TYPES["double"])return a.readDouble();if(this.type==
c.TYPES.string)return a.readVString();if(this.type==c.TYPES.bytes){b=a.readVarint32();if(a.remaining()<b)throw Error("Illegal number of bytes for "+this.toString(!0)+": "+b+" required but got only "+a.remaining());d=a.clone();d.length=d.offset+b;a.offset+=b;return d}if(this.type==c.TYPES.message)return b=a.readVarint32(),this.resolvedType.decode(a,b);throw Error("[INTERNAL] Illegal wire type for "+this.toString(!0)+": "+b);};h.Message.Field=e;var d=function(a,c,d){l.call(this,a,c,d);this.object=null};
d.prototype=Object.create(l.prototype);d.prototype.build=function(){for(var a={},c=this.getChildren(d.Value),e=0;e<c.length;e++)a[c[e].name]=c[e].id;Object.defineProperty&&Object.defineProperty(a,"$options",{value:this.buildOpt(),enumerable:!1,configurable:!1,writable:!1});return this.object=a};h.Enum=d;e=function(a,c,d){m.call(this,a,c);this.id=d};e.prototype=Object.create(m.prototype);h.Enum.Value=e;var g=function(a,c,d){l.call(this,a,c,d);this.clazz=null};g.prototype=Object.create(l.prototype);
g.prototype.build=function(a){return this.clazz&&!a?this.clazz:this.clazz=function(a,b){var c=function(b){a.Builder.Service.call(this);this.rpcImpl=b||function(a,b,c){setTimeout(c.bind(this,Error("Not implemented, see: https://github.com/dcodeIO/ProtoBuf.js/wiki/Services")),0)}};c.prototype=Object.create(a.Builder.Service.prototype);Object.defineProperty&&(Object.defineProperty(c,"$options",{value:b.buildOpt(),enumerable:!1,configurable:!1,writable:!1}),Object.defineProperty(c.prototype,"$options",
{value:c.$options,enumerable:!1,configurable:!1,writable:!1}));for(var d=b.getChildren(h.Service.RPCMethod),e=0;e<d.length;e++)(function(a){c.prototype[a.name]=function(c,d){try{c&&c instanceof a.resolvedRequestType.clazz||setTimeout(d.bind(this,Error("Illegal request type provided to service method "+b.name+"#"+a.name))),this.rpcImpl(a.fqn(),c,function(c,e){if(c)d(c);else{try{e=a.resolvedResponseType.clazz.decode(e)}catch(f){}e&&e instanceof a.resolvedResponseType.clazz?d(null,e):d(Error("Illegal response type received in service method "+
b.name+"#"+a.name))}})}catch(e){setTimeout(d.bind(this,e),0)}};c[a.name]=function(b,d,e){(new c(b))[a.name](d,e)};Object.defineProperty&&(Object.defineProperty(c[a.name],"$options",{value:a.buildOpt(),enumerable:!1,configurable:!1,writable:!1}),Object.defineProperty(c.prototype[a.name],"$options",{value:c[a.name].$options,enumerable:!1,configurable:!1,writable:!1}))})(d[e]);return c}(c,this)};h.Service=g;var k=function(a,c,d){m.call(this,a,c);this.options=d||{}};k.prototype=Object.create(m.prototype);
k.prototype.buildOpt=l.prototype.buildOpt;h.Service.Method=k;e=function(a,c,d,e,g){k.call(this,a,c,g);this.requestName=d;this.responseName=e;this.resolvedResponseType=this.resolvedRequestType=null};e.prototype=Object.create(k.prototype);h.Service.RPCMethod=e;return h}(k);k.Builder=function(c,h,m){var l=function(){this.ptr=this.ns=new m.Namespace(null,"");this.resolved=!1;this.result=null;this.files={};this.importRoot=null};l.prototype.reset=function(){this.ptr=this.ns};l.prototype.define=function(a,
c){if("string"!==typeof a||!h.TYPEREF.test(a))throw Error("Illegal package name: "+a);var d=a.split("."),g;for(g=0;g<d.length;g++)if(!h.NAME.test(d[g]))throw Error("Illegal package name: "+d[g]);for(g=0;g<d.length;g++)this.ptr.hasChild(d[g])||this.ptr.addChild(new m.Namespace(this.ptr,d[g],c)),this.ptr=this.ptr.getChild(d[g]);return this};l.isValidMessage=function(a){if("string"!==typeof a.name||!h.NAME.test(a.name)||"undefined"!==typeof a.values||"undefined"!==typeof a.rpc)return!1;var e;if("undefined"!==
typeof a.fields){if(!c.Util.isArray(a.fields))return!1;var d=[],g;for(e=0;e<a.fields.length;e++){if(!l.isValidMessageField(a.fields[e]))return!1;g=parseInt(a.id,10);if(0<=d.indexOf(g))return!1;d.push(g)}}if("undefined"!==typeof a.enums){if(!c.Util.isArray(a.enums))return!1;for(e=0;e<a.enums.length;e++)if(!l.isValidEnum(a.enums[e]))return!1}if("undefined"!==typeof a.messages){if(!c.Util.isArray(a.messages))return!1;for(e=0;e<a.messages.length;e++)if(!l.isValidMessage(a.messages[e])&&!l.isValidExtend(a.messages[e]))return!1}return"undefined"===
typeof a.extensions||c.Util.isArray(a.extensions)&&2===a.extensions.length&&"number"===typeof a.extensions[0]&&"number"===typeof a.extensions[1]?!0:!1};l.isValidMessageField=function(a){if("string"!==typeof a.rule||"string"!==typeof a.name||"string"!==typeof a.type||"undefined"===typeof a.id||!(h.RULE.test(a.rule)&&h.NAME.test(a.name)&&h.TYPEREF.test(a.type)&&h.ID.test(""+a.id)))return!1;if("undefined"!=typeof a.options){if("object"!=typeof a.options)return!1;for(var c=Object.keys(a.options),d=0;d<
c.length;d++)if(!h.OPTNAME.test(c[d])||"string"!==typeof a.options[c[d]]&&"number"!==typeof a.options[c[d]]&&"boolean"!==typeof a.options[c[d]])return!1}return!0};l.isValidEnum=function(a){if("string"!==typeof a.name||!h.NAME.test(a.name)||"undefined"===typeof a.values||!c.Util.isArray(a.values)||0==a.values.length)return!1;for(var e=0;e<a.values.length;e++)if("object"!=typeof a.values[e]||"string"!==typeof a.values[e].name||"undefined"===typeof a.values[e].id||!h.NAME.test(a.values[e].name)||!h.NEGID.test(""+
a.values[e].id))return!1;return!0};l.prototype.create=function(a){if(a&&(c.Util.isArray(a)||(a=[a]),0!=a.length)){var e=[],d,g,k,b,f;for(e.push(a);0<e.length;){a=e.pop();if(c.Util.isArray(a))for(;0<a.length;)if(d=a.shift(),l.isValidMessage(d)){g=new m.Message(this.ptr,d.name,d.options);if(d.fields&&0<d.fields.length)for(b=0;b<d.fields.length;b++){if(g.hasChild(d.fields[b].id))throw Error("Duplicate field id in message "+g.name+": "+d.fields[b].id);if(d.fields[b].options)for(k=Object.keys(d.fields[b].options),
f=0;f<k.length;f++){if(!h.OPTNAME.test(k[f]))throw Error("Illegal field option name in message "+g.name+"#"+d.fields[b].name+": "+k[f]);if("string"!==typeof d.fields[b].options[k[f]]&&"number"!==typeof d.fields[b].options[k[f]]&&"boolean"!==typeof d.fields[b].options[k[f]])throw Error("Illegal field option value in message "+g.name+"#"+d.fields[b].name+"#"+k[f]+": "+d.fields[b].options[k[f]]);}g.addChild(new m.Message.Field(g,d.fields[b].rule,d.fields[b].type,d.fields[b].name,d.fields[b].id,d.fields[b].options))}k=
[];if("undefined"!==typeof d.enums&&0<d.enums.length)for(b=0;b<d.enums.length;b++)k.push(d.enums[b]);if(d.messages&&0<d.messages.length)for(b=0;b<d.messages.length;b++)k.push(d.messages[b]);d.extensions&&(g.extensions=d.extensions,g.extensions[0]<c.Lang.ID_MIN&&(g.extensions[0]=c.Lang.ID_MIN),g.extensions[1]>c.Lang.ID_MAX&&(g.extensions[1]=c.Lang.ID_MAX));this.ptr.addChild(g);0<k.length&&(e.push(a),a=k,this.ptr=g)}else if(l.isValidEnum(d)){g=new m.Enum(this.ptr,d.name,d.options);for(b=0;b<d.values.length;b++)g.addChild(new m.Enum.Value(g,
d.values[b].name,d.values[b].id));this.ptr.addChild(g)}else if(l.isValidService(d)){g=new m.Service(this.ptr,d.name,d.options);for(b in d.rpc)d.rpc.hasOwnProperty(b)&&g.addChild(new m.Service.RPCMethod(g,b,d.rpc[b].request,d.rpc[b].response,d.rpc[b].options));this.ptr.addChild(g)}else if(l.isValidExtend(d))if(g=this.ptr.resolve(d.ref))for(b=0;b<d.fields.length;b++){if(g.hasChild(d.fields[b].id))throw Error("Duplicate extended field id in message "+g.name+": "+d.fields[b].id);if(d.fields[b].id<g.extensions[0]||
d.fields[b].id>g.extensions[1])throw Error("Illegal extended field id in message "+g.name+": "+d.fields[b].id+" ("+g.extensions.join(" to ")+" expected)");g.addChild(new m.Message.Field(g,d.fields[b].rule,d.fields[b].type,d.fields[b].name,d.fields[b].id,d.fields[b].options))}else{if(!/\.?google\.protobuf\./.test(d.ref))throw Error("Extended message "+d.ref+" is not defined");}else throw Error("Not a valid message, enum, service or extend definition: "+JSON.stringify(d));else throw Error("Not a valid namespace definition: "+
JSON.stringify(a));this.ptr=this.ptr.parent}this.resolved=!1;this.result=null;return this}};l.isValidImport=function(a){return!/google\/protobuf\//.test(a)};l.prototype["import"]=function(a,e){if("string"===typeof e){c.Util.IS_NODE&&(e=_dereq_("path").resolve(e));if(this.files[e])return this.reset(),this;this.files[e]=!0}if(a.imports&&0<a.imports.length){var d,g="/",h=!1;if("object"===typeof e){if(this.importRoot=e.root,h=!0,d=this.importRoot,e=e.file,0<=d.indexOf("\\")||0<=e.indexOf("\\"))g="\\"}else"string"===
typeof e?this.importRoot?d=this.importRoot:0<=e.indexOf("/")?(d=e.replace(/\/[^\/]*$/,""),""===d&&(d="/")):0<=e.indexOf("\\")?(d=e.replace(/\\[^\\]*$/,""),g="\\"):d=".":d=null;for(var b=0;b<a.imports.length;b++)if("string"===typeof a.imports[b]){if(!d)throw Error("Cannot determine import root: File name is unknown");var f=d+g+a.imports[b];if(l.isValidImport(f)){/\.proto$/i.test(f)&&!c.DotProto&&(f=f.replace(/\.proto$/,".json"));var k=c.Util.fetch(f);if(null===k)throw Error("Failed to import '"+f+
"' in '"+e+"': File not found");if(/\.json$/i.test(f))this["import"](JSON.parse(k+""),f);else this["import"]((new c.DotProto.Parser(k+"")).parse(),f)}}else if(e)if(/\.(\w+)$/.test(e))this["import"](a.imports[b],e.replace(/^(.+)\.(\w+)$/,function(a,c,d){return c+"_import"+b+"."+d}));else this["import"](a.imports[b],e+"_import"+b);else this["import"](a.imports[b]);h&&(this.importRoot=null)}a.messages&&(a["package"]&&this.define(a["package"],a.options),this.create(a.messages),this.reset());a.enums&&
(a["package"]&&this.define(a["package"],a.options),this.create(a.enums),this.reset());a.services&&(a["package"]&&this.define(a["package"],a.options),this.create(a.services),this.reset());a["extends"]&&(a["package"]&&this.define(a["package"],a.options),this.create(a["extends"]),this.reset());return this};l.isValidService=function(a){return"string"===typeof a.name&&h.NAME.test(a.name)&&"object"===typeof a.rpc?!0:!1};l.isValidExtend=function(a){if("string"!==typeof a.ref||!h.TYPEREF.test(a.name))return!1;
var e;if("undefined"!==typeof a.fields){if(!c.Util.isArray(a.fields))return!1;var d=[],g;for(e=0;e<a.fields.length;e++){if(!l.isValidMessageField(a.fields[e]))return!1;g=parseInt(a.id,10);if(0<=d.indexOf(g))return!1;d.push(g)}}return!0};l.prototype.resolveAll=function(){var a;if(null!=this.ptr&&"object"!==typeof this.ptr.type){if(this.ptr instanceof m.Namespace){a=this.ptr.getChildren();for(var e=0;e<a.length;e++)this.ptr=a[e],this.resolveAll()}else if(this.ptr instanceof m.Message.Field)if(h.TYPE.test(this.ptr.type))this.ptr.type=
c.TYPES[this.ptr.type];else{if(!h.TYPEREF.test(this.ptr.type))throw Error("Illegal type reference in "+this.ptr.toString(!0)+": "+this.ptr.type);a=this.ptr.parent.resolve(this.ptr.type,!0);if(!a)throw Error("Unresolvable type reference in "+this.ptr.toString(!0)+": "+this.ptr.type);this.ptr.resolvedType=a;if(a instanceof m.Enum)this.ptr.type=c.TYPES["enum"];else if(a instanceof m.Message)this.ptr.type=c.TYPES.message;else throw Error("Illegal type reference in "+this.ptr.toString(!0)+": "+this.ptr.type);
}else if(!(this.ptr instanceof c.Reflect.Enum.Value))if(this.ptr instanceof c.Reflect.Service.Method)if(this.ptr instanceof c.Reflect.Service.RPCMethod){a=this.ptr.parent.resolve(this.ptr.requestName);if(!(a&&a instanceof c.Reflect.Message))throw Error("Illegal request type reference in "+this.ptr.toString(!0)+": "+this.ptr.requestName);this.ptr.resolvedRequestType=a;a=this.ptr.parent.resolve(this.ptr.responseName);if(!(a&&a instanceof c.Reflect.Message))throw Error("Illegal response type reference in "+
this.ptr.toString(!0)+": "+this.ptr.responseName);this.ptr.resolvedResponseType=a}else throw Error("Illegal service method type in "+this.ptr.toString(!0));else throw Error("Illegal object type in namespace: "+typeof this.ptr+":"+this.ptr);this.reset()}};l.prototype.build=function(a){this.reset();this.resolved||(this.resolveAll(),this.resolved=!0,this.result=null);null==this.result&&(this.result=this.ns.build());if(a){a=a.split(".");for(var c=this.result,d=0;d<a.length;d++)if(c[a[d]])c=c[a[d]];else{c=
null;break}return c}return this.result};l.prototype.lookup=function(a){return a?this.ns.resolve(a):this.ns};l.prototype.toString=function(){return"Builder"};l.Message=function(){};l.Service=function(){};return l}(k,k.Lang,k.Reflect);k.newBuilder=function(c,h){var m=new k.Builder;"undefined"!==typeof c&&null!==c&&m.define(c,h);return m};k.loadJson=function(c,h,m){if("string"===typeof h||h&&"string"===typeof h.file&&"string"===typeof h.root)m=h,h=null;h&&"object"===typeof h||(h=k.newBuilder());"string"===
typeof c&&(c=JSON.parse(c));h["import"](c,m);h.resolveAll();h.build();return h};k.loadJsonFile=function(c,h,m){h&&"object"===typeof h?(m=h,h=null):h&&"function"===typeof h||(h=null);if(h)k.Util.fetch("object"===typeof c?c.root+"/"+c.file:c,function(a){try{h(k.loadJson(JSON.parse(a),m,c))}catch(e){h(e)}});else{var l=k.Util.fetch("object"===typeof c?c.root+"/"+c.file:c);return null!==l?k.loadJson(JSON.parse(l),m,c):null}};return k}"undefined"!=typeof module&&module.exports?module.exports=r(_dereq_("bytebuffer")):
"undefined"!=typeof define&&define.amd?define("ProtoBuf",["ByteBuffer"],r):(q.dcodeIO||(q.dcodeIO={}),q.dcodeIO.ProtoBuf=r(q.dcodeIO.ByteBuffer))})(this);

}).call(this,_dereq_("NPEqJt"))
},{"NPEqJt":15,"bytebuffer":11}],11:[function(_dereq_,module,exports){
/*
 Copyright 2013 Daniel Wirtz <dcode@dcode.io>

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
 */

/**
 * @license ByteBuffer.js (c) 2013 Daniel Wirtz <dcode@dcode.io>
 * Released under the Apache License, Version 2.0
 * see: https://github.com/dcodeIO/ByteBuffer.js for details
 */ //
(function(global) {
    "use strict";

    // Note that this library carefully avoids using the array access operator
    // (i.e. buffer[x]) on ArrayBufferView subclasses (e.g. Uint8Array), and
    // uses DataView instead. This is required for IE 8 compatibility.

    /**
     * @param {Function=} Long
     * @returns {Function}
     * @inner
     */
    function loadByteBuffer(Long) {

        // Support node's Buffer if available, see http://nodejs.org/api/buffer.html
        var Buffer = null;
        if (typeof _dereq_ === 'function') {
            try {
                var nodeBuffer = _dereq_("buffer");
                Buffer = nodeBuffer && typeof nodeBuffer['Buffer'] === 'function' &&
                    typeof nodeBuffer['Buffer']['isBuffer'] === 'function' ? nodeBuffer['Buffer'] : null;
            } catch (e) {}
        }

        /**
         * Constructs a new ByteBuffer.
         * @class A full-featured ByteBuffer implementation in JavaScript using typed arrays.
         * @exports ByteBuffer
         * @param {number=} capacity Initial capacity. Defaults to {@link ByteBuffer.DEFAULT_CAPACITY}.
         * @param {boolean=} littleEndian `true` to use little endian multi byte values, defaults to `false` for big
         *  endian.
         * @param {boolean=} sparse If set to `true`, a ByteBuffer with array=view=null will be created which have to be
         *  set manually afterwards. Defaults to `false`.
         * @expose
         */
        var ByteBuffer = function(capacity, littleEndian, sparse) {
            capacity = typeof capacity !== 'undefined' ? parseInt(capacity, 10) : ByteBuffer.DEFAULT_CAPACITY;
            if (capacity < 1) capacity = ByteBuffer.DEFAULT_CAPACITY;

            /**
             * Backing ArrayBuffer.
             * @type {?ArrayBuffer}
             * @expose
             */
            this.array = sparse ? null : new ArrayBuffer(capacity);

            /**
             * DataView to mess with the ArrayBuffer.
             * @type {?DataView}
             * @expose
             */
            this.view = sparse ? null : new DataView(this.array);

            /**
             * Current read/write offset. Length- and capacity-independent index. Contents are the bytes between offset
             *  and length, which are both absolute indexes. There is no capacity property, use
             *  {@link ByteBuffer#capacity} instead.
             * @type {number}
             * @expose
             */
            this.offset = 0;

            /**
             * Marked offset set through {@link ByteBuffer#mark}. Defaults to `-1` (no marked offset).
             * @type {number}
             * @expose
             */
            this.markedOffset = -1;

            /**
             * Length of the contained data. Offset- and capacity-independent index. Contents are the bytes between
             *  offset and length, which are both absolute indexes. There is no capacity property, use
             *  {@link ByteBuffer#capacity} instead.
             * @type {number}
             * @expose
             */
            this.length = 0;

            /**
             * Whether to use little endian multi byte values, defaults to `false` for big endian.
             * @type {boolean}
             * @expose
             */
            this.littleEndian = typeof littleEndian != 'undefined' ? !!littleEndian : false;
        };

        /**
         * Version string.
         * @type {string}
         * @const
         * @expose
         */
        ByteBuffer.VERSION = "2.3.2";

        /**
         * Default buffer capacity of `16`. The ByteBuffer will be automatically resized by a factor of 2 if required.
         * @type {number}
         * @const
         * @expose
         */
        ByteBuffer.DEFAULT_CAPACITY = 16;

        /**
         * Little endian constant for usage in constructors instead of a boolean value. Evaluates to `true`.
         * @type {boolean}
         * @const
         * @expose
         */
        ByteBuffer.LITTLE_ENDIAN = true;

        /**
         * Big endian constant for usage in constructors instead of a boolean value. Evaluates to `false`.
         * @type {boolean}
         * @const
         * @expose
         */
        ByteBuffer.BIG_ENDIAN = false;

        /**
         * Long class for int64 support. May be `null` if the Long class has not been loaded and int64 support is
         *  not available.
         * @type {?Long}
         * @const
         * @expose
         */
        ByteBuffer.Long = Long || null;

        /**
         * Tests if the specified type is a ByteBuffer or ByteBuffer-like.
         * @param {*} bb ByteBuffer to test
         * @returns {boolean} true if it is a ByteBuffer or ByteBuffer-like, otherwise false
         * @expose
         */
        ByteBuffer.isByteBuffer = function(bb) {
            return bb && (
                (bb instanceof ByteBuffer) || (
                    typeof bb === 'object' &&
                    (bb.array === null || bb.array instanceof ArrayBuffer) &&
                    (bb.view === null || bb.view instanceof DataView) &&
                    typeof bb.offset === 'number' &&
                    typeof bb.markedOffset === 'number' &&
                    typeof bb.length === 'number' &&
                    typeof bb.littleEndian === 'boolean'
                )
            );
        };

        /**
         * Allocates a new ByteBuffer.
         * @param {number=} capacity Initial capacity. Defaults to {@link ByteBuffer.DEFAULT_CAPACITY}.
         * @param {boolean=} littleEndian `true` to use little endian multi byte values, defaults to `false` for big
         *  endian.
         * @returns {!ByteBuffer}
         * @expose
         */
        ByteBuffer.allocate = function(capacity, littleEndian) {
            return new ByteBuffer(capacity, littleEndian);
        };

        /**
         * Converts a node.js <= 0.8 Buffer to an ArrayBuffer.
         * @param {!Buffer} b Buffer to convert
         * @returns {?ArrayBuffer} Converted buffer
         * @inner
         */
        function b2ab(b) {
            var ab = new ArrayBuffer(b.length),
                view = new Uint8Array(ab);
            for (var i=0, k=b.length; i < k; ++i) view[i] = b[i];
            return ab;
        }

        /**
         * Wraps an ArrayBuffer, any object containing an ArrayBuffer, a node buffer or a string. Sets the created
         *  ByteBuffer's offset to 0 and its length to the wrapped object's byte length.
         * @param {!ArrayBuffer|!Buffer|!{array: !ArrayBuffer}|!{buffer: !ArrayBuffer}|string} buffer Anything that can
         *  be wrapped
         * @param {(string|boolean)=} enc String encoding if a string is provided (hex, utf8, binary, defaults to base64)
         * @param {boolean=} littleEndian `true` to use little endian multi byte values, defaults to `false` for big
         *  endian.
         * @returns {!ByteBuffer}
         * @throws {Error} If the specified object cannot be wrapped
         * @expose
         */
        ByteBuffer.wrap = function(buffer, enc, littleEndian) {
            if (typeof enc === 'boolean') {
                littleEndian = enc;
                enc = "utf8";
            }
            // Wrap a string
            if (typeof buffer === 'string') {
                switch (enc) {
                    case "base64":
                        return ByteBuffer.decode64(buffer, littleEndian);
                    case "hex":
                        return ByteBuffer.decodeHex(buffer, littleEndian);
                    case "binary":
                        return ByteBuffer.decodeBinary(buffer, littleEndian);
                    default:
                        return new ByteBuffer(ByteBuffer.DEFAULT_CAPACITY, littleEndian).writeUTF8String(buffer).flip();
                }
            }
            var b;
            // Wrap Buffer
            if (Buffer && Buffer.isBuffer(buffer)) {
                b = new Uint8Array(buffer).buffer; // noop on node <= 0.8
                buffer = (b === buffer) ? b2ab(buffer) : b;
            }
            // Refuse to wrap anything that's null or not an object
            if (buffer === null || typeof buffer !== 'object') {
                throw(new Error("Cannot wrap null or non-object"));
            }
            // Wrap ByteBuffer by cloning (preserve offsets)
            if (ByteBuffer.isByteBuffer(buffer)) {
                return ByteBuffer.prototype.clone.call(buffer); // Also makes ByteBuffer-like a ByteBuffer
            }
            // Wrap any object that is or contains an ArrayBuffer
            if (!!buffer["array"]) {
                buffer = buffer["array"];
            } else if (!!buffer["buffer"]) {
                buffer = buffer["buffer"];
            }
            if (!(buffer instanceof ArrayBuffer)) {
                throw(new Error("Cannot wrap buffer of type "+typeof(buffer)+", "+buffer.constructor.name));
            }
            b = new ByteBuffer(0, littleEndian, true);
            b.array = buffer;
            b.view = b.array.byteLength > 0 ? new DataView(b.array) : null;
            b.offset = 0;
            b.length = buffer.byteLength;
            return b;
        };

        /**
         * Switches little endian byte order.
         * @param {boolean=} littleEndian Defaults to `true`, otherwise uses big endian
         * @returns {!ByteBuffer} this
         * @expose
         */
        ByteBuffer.prototype.LE = function(littleEndian) {
            this.littleEndian = typeof littleEndian !== 'undefined' ? !!littleEndian : true;
            return this;
        };

        /**
         * Switches big endian byte order.
         * @param {boolean=} bigEndian Defaults to `true`, otherwise uses little endian
         * @returns {!ByteBuffer} this
         * @expose
         */
        ByteBuffer.prototype.BE = function(bigEndian) {
            this.littleEndian = typeof bigEndian !== 'undefined' ? !bigEndian : false;
            return this;
        };

        /**
         * Resizes the ByteBuffer to the given capacity. Will do nothing if already that large or larger.
         * @param {number} capacity New capacity
         * @returns {!ByteBuffer} this
         * @expose
         */
        ByteBuffer.prototype.resize = function(capacity) {
            if (capacity < 1) return false;
            if (this.array === null) { // Silently recreate
                this.array = new ArrayBuffer(capacity);
                this.view = new DataView(this.array);
            }
            if (this.array.byteLength < capacity) {
                var src = this.array;
                var srcView = new Uint8Array(src);
                var dst = new ArrayBuffer(capacity);
                var dstView = new Uint8Array(dst);
                dstView.set(srcView);
                this.array = dst;
                this.view = new DataView(dst);
            }
            return this;
        };

        /**
         * Slices the ByteBuffer. This is independent of the ByteBuffer's actual offsets. Does not compact the underlying
         *  ArrayBuffer (use {@link ByteBuffer#compact} or {@link ByteBuffer.wrap} instead).
         * @param {number=} begin Begin offset, defaults to {@link ByteBuffer#offset}.
         * @param {number=} end End offset, defaults to {@link ByteBuffer#length}.
         * @returns {!ByteBuffer} Clone of this ByteBuffer with slicing applied, backed by the same ArrayBuffer
         * @throws {Error} If the buffer cannot be sliced
         * @expose
         */
        ByteBuffer.prototype.slice = function(begin, end) {
            if (this.array == null) {
                throw(new Error(this+" cannot be sliced: Already destroyed"));
            }
            if (typeof begin === 'undefined') begin = this.offset;
            if (typeof end === 'undefined') end = this.length;
            if (end <= begin) {
                var t = end; end = begin; begin = t;
            }
            if (begin < 0 || begin > this.array.byteLength || end < 1 || end > this.array.byteLength) {
                throw(new Error(this+" cannot be sliced: Index out of bounds (0-"+this.array.byteLength+" -> "+begin+"-"+end+")"));
            }
            var b = this.clone();
            b.offset = begin;
            b.length = end;
            return b;
        };

        /**
         * Makes sure that the specified capacity is available. If the current capacity is exceeded, it will be doubled.
         *  If double the previous capacity is less than the required capacity, the required capacity will be used.
         * @param {number} capacity Required capacity
         * @returns {!ByteBuffer} this
         * @expose
         */
        ByteBuffer.prototype.ensureCapacity = function(capacity) {
            if (this.array === null)
                return this.resize(capacity);
            if (this.array.byteLength < capacity)
                return this.resize(this.array.byteLength*2 >= capacity ? this.array.byteLength*2 : capacity);
            return this;
        };

        /**
         * Makes the buffer ready for a new sequence of write or relative read operations. Sets `length=offset` and
         *  `offset=0`. Always make sure to flip a buffer when all relative writing operations are complete.
         * @returns {!ByteBuffer} this
         * @expose
         */
        ByteBuffer.prototype.flip = function() {
            this.length = this.array == null ? 0 : this.offset;
            this.offset = 0;
            return this;
        };

        /**
         * Marks an offset to be used with {@link ByteBuffer#reset}.
         * @param {number=} offset Offset to mark. Defaults to {@link ByteBuffer#offset}.
         * @returns {!ByteBuffer} this
         * @throws {Error} If the mark cannot be set
         * @see ByteBuffer#reset
         * @expose
         */
        ByteBuffer.prototype.mark = function(offset) {
            if (this.array == null) {
                throw(new Error(this+" cannot be marked: Already destroyed"));
            }
            offset = typeof offset !== 'undefined' ? parseInt(offset, 10) : this.offset;
            if (offset < 0 || offset > this.array.byteLength) {
                throw(new Error(this+" cannot be marked: Offset to mark is less than 0 or bigger than the capacity ("+this.array.byteLength+"): "+offset));
            }
            this.markedOffset = offset;
            return this;
        };

        /**
         * Resets the ByteBuffer. If an offset has been marked through {@link ByteBuffer#mark} before, the offset will
         *  be set to the marked offset and the marked offset will be discarded. Length will not be altered. If there is
         *  no marked offset, sets `offset=0` and `length=0`.
         * @returns {!ByteBuffer} this
         * @see ByteBuffer#mark
         * @expose
         */
        ByteBuffer.prototype.reset = function() {
            if (this.array === null) {
                throw(new Error(this+" cannot be reset: Already destroyed"));
            }
            if (this.markedOffset >= 0) {
                this.offset = this.markedOffset;
                this.markedOffset = -1;
            } else {
                this.offset = 0;
                this.length = 0;
            }
            return this;
        };

        /**
         * Clones this ByteBuffer. The returned cloned ByteBuffer shares the same backing array but will have its own
         *  offsets.
         * @returns {!ByteBuffer} Clone
         * @expose
         */
        ByteBuffer.prototype.clone = function() {
            var b = new ByteBuffer(-1, this.littleEndian, /* no init, undocumented */ true);
            b.array = this.array;
            b.view = this.view;
            b.offset = this.offset;
            b.markedOffset = this.markedOffset;
            b.length = this.length;
            return b;
        };

        /**
         * Copies this ByteBuffer. The copy has its own backing array and uses the same offsets as this one.
         * @returns {!ByteBuffer} Copy
         * @expose
         */
        ByteBuffer.prototype.copy = function() {
            if (this.array == null) {
                return this.clone();
            }
            var b = new ByteBuffer(this.array.byteLength, this.littleEndian);
            var src = new Uint8Array(this.array);
            var dst = new Uint8Array(b.array);
            dst.set(src);
            b.offset = this.offset;
            b.markedOffset = this.markedOffset;
            b.length = this.length;
            return b;
        };

        /**
         * Gets the number of remaining readable bytes. Contents are the bytes between offset and length, so this
         *  returns `length-offset`.
         * @returns {number} Remaining readable bytes. May be negative if `offset>length`.
         * @expose
         */
        ByteBuffer.prototype.remaining = function() {
            if (this.array === null) return 0;
            return this.length - this.offset;
        };

        /**
         * Gets the capacity of the backing buffer. This is independent from {@link ByteBuffer#length} and returns the
         *  size of the entire backing array.
         * @returns {number} Capacity of the backing array or 0 if destroyed
         * @expose
         */
        ByteBuffer.prototype.capacity = function() {
            return this.array != null ? this.array.byteLength : 0;
        };

        /**
         * Compacts the ByteBuffer to be backed by an ArrayBuffer of its actual length. Will set `offset=0` and
         *  `length=capacity`.
         * @returns {!ByteBuffer} this
         * @throws {Error} If the buffer cannot be compacted
         * @expose
         */
        ByteBuffer.prototype.compact = function() {
            if (this.array == null) {
                throw(new Error(this+" cannot be compacted: Already destroyed"));
            }
            if (this.offset > this.length) {
                this.flip();
            }
            if (this.offset === this.length) {
                this.array = new ArrayBuffer(0);
                this.view = null; // A DataView on a zero-length AB would throw
                return this;
            }
            if (this.offset === 0 && this.length === this.array.byteLength) {
                return this; // Already compacted
            }
            var srcView = new Uint8Array(this.array);
            var dst = new ArrayBuffer(this.length-this.offset);
            var dstView = new Uint8Array(dst);
            dstView.set(srcView.subarray(this.offset, this.length));
            this.array = dst;
            if (this.markedOffset >= this.offset) {
                this.markedOffset -= this.offset;
            } else {
                this.markedOffset = -1;
            }
            this.offset = 0;
            this.length = this.array.byteLength;
            return this;
        };

        /**
         * Manually destroys the ByteBuffer, releasing references to the backing array. Manually destroying a ByteBuffer
         *  is usually not required but may be useful in limited memory environments. Most successive operations will
         *  rise an error until {@link ByteBuffer#resize} or {@link ByteBuffer#ensureCapacity} is called to reinitialize
         *  the backing array.
         * @returns {!ByteBuffer} this
         * @expose
         */
        ByteBuffer.prototype.destroy = function() {
            if (this.array !== null) {
                this.array = null;
                this.view = null;
                this.offset = 0;
                this.markedOffset = -1;
                this.length = 0;
            }
            return this;
        };

        /**
         * Reverses the backing array and adapts offset and length to retain the same relative position on the reversed
         *  data in inverse order. Example: "00<01 02>03 04".reverse() = "04 03<02 01>00". Also clears the marked
         *  offset.
         * @returns {!ByteBuffer} this
         * @throws {Error} If the buffer is already destroyed
         * @expose
         */
        ByteBuffer.prototype.reverse = function() {
            if (this.array === null) {
                throw(new Error(this+" cannot be reversed: Already destroyed"));
            }
            Array.prototype.reverse.call(new Uint8Array(this.array));
            var o = this.offset;
            this.offset = this.array.byteLength - this.length;
            this.markedOffset = -1;
            this.length = this.array.byteLength - o;
            this.view = new DataView(this.array);
            return this;
        };

        /**
         * Appends another ByteBuffer to this one. Appends only the portion between offset and length of the specified
         *  ByteBuffer and overwrites any contents behind the specified offset up to the number of bytes contained in
         *  the specified ByteBuffer. Offset and length of the specified ByteBuffer will remain the same.
         * @param {!*} src ByteBuffer or any object that can be wrapped to append
         * @param {number=} offset Offset to append at. Defaults to {@link ByteBuffer#offset}.
         * @returns {!ByteBuffer} this
         * @throws {Error} If the specified buffer is already destroyed
         * @expose
         */
        ByteBuffer.prototype.append = function(src, offset) {
            if (!(src instanceof ByteBuffer)) {
                src = ByteBuffer.wrap(src);
            }
            if (src.array === null) {
                throw(new Error(src+" cannot be appended to "+this+": Already destroyed"));
            }
            var n = src.length - src.offset;
            if (n == 0) return this; // Nothing to append
            if (n < 0) {
                src = src.clone().flip();
                n = src.length - src.offset;
            }
            offset = typeof offset !== 'undefined' ? offset : (this.offset+=n)-n;
            this.ensureCapacity(offset+n); // Reinitializes if required
            var srcView = new Uint8Array(src.array);
            var dstView = new Uint8Array(this.array);
            dstView.set(srcView.subarray(src.offset, src.length), offset);
            return this;
        };

        /**
         * Prepends another ByteBuffer to this one. Prepends only the portion between offset and length of the specified
         *  ByteBuffer and overwrites any contents before the specified offsets up to the number of bytes contained in
         *  the specified ByteBuffer. Offset and length of the specified ByteBuffer will remain the same.
         * @param {!*} src ByteBuffer or any object that can be wrapped to prepend
         * @param {number=} offset Offset to prepend at. Defaults to {@link ByteBuffer#offset}.
         * @returns {!ByteBuffer} this
         * @throws {Error} If the specified buffer is already destroyed
         * @expose
         */
        ByteBuffer.prototype.prepend = function(src, offset) {
            if (!(src instanceof ByteBuffer)) {
                src = ByteBuffer.wrap(src);
            }
            if (src.array === null) {
                throw(src+" cannot be prepended to "+this+": Already destroyed");
            }
            var n = src.length - src.offset;
            if (n == 0) return this; // Nothing to prepend
            if (n < 0) {
                src = src.clone().flip();
                n = src.length - src.offset;
            }
            var modify = typeof offset === 'undefined';
            offset = typeof offset !== 'undefined' ? offset : this.offset;
            var diff = n-offset;
            if (diff > 0) {
                // Doesn't fit, so maybe resize and move the contents that are already contained
                this.ensureCapacity(this.length+diff);
                this.append(this, n);
                this.offset += diff;
                this.length += diff;
                this.append(src, 0);
            } else {
                this.append(src, offset-n);
            }
            if (modify) {
                this.offset -= n;
            }
            return this;
        };

        /**
         * Writes an 8bit signed integer.
         * @param {number} value Value
         * @param {number=} offset Offset to write to. Will use and advance {@link ByteBuffer#offset} if
         *  omitted.
         * @returns {!ByteBuffer} this
         * @expose
         */
        ByteBuffer.prototype.writeInt8 = function(value, offset) {
            offset = typeof offset != 'undefined' ? offset : (this.offset+=1)-1;
            this.ensureCapacity(offset+1);
            this.view.setInt8(offset, value);
            return this;
        };

        /**
         * Reads an 8bit signed integer.
         * @param {number=} offset Offset to read from. Will use and advance {@link ByteBuffer#offset} if omitted.
         * @returns {number}
         * @throws {Error} If offset is out of bounds
         * @expose
         */
        ByteBuffer.prototype.readInt8 = function(offset) {
            offset = typeof offset !== 'undefined' ? offset : (this.offset+=1)-1;
            if (offset >= this.array.byteLength) {
                throw(new Error("Cannot read int8 from "+this+" at "+offset+": Capacity overflow"));
            }
            return this.view.getInt8(offset);
        };

        /**
         * Writes a byte. This is an alias of {ByteBuffer#writeInt8}.
         * @function
         * @param {number} value Value to write
         * @param {number=} offset Offset to write to. Will use and advance {@link ByteBuffer#offset} if omitted.
         * @returns {!ByteBuffer} this
         * @expose
         */
        ByteBuffer.prototype.writeByte = ByteBuffer.prototype.writeInt8;

        /**
         * Reads a byte. This is an alias of {@link ByteBuffer#readInt8}.
         * @function
         * @param {number=} offset Offset to read from. Will use and advance {@link ByteBuffer#offset} if omitted.
         * @returns {number}
         * @throws {Error} If offset is out of bounds
         * @expose
         */
        ByteBuffer.prototype.readByte = ByteBuffer.prototype.readInt8;

        /**
         * Writes an 8bit unsigned integer.
         * @param {number} value Value to write
         * @param {number=} offset Offset to write to. Will use and advance {@link ByteBuffer#offset} if omitted.
         * @returns {!ByteBuffer} this
         * @expose
         */
        ByteBuffer.prototype.writeUint8 = function(value, offset) {
            offset = typeof offset !== 'undefined' ? offset : (this.offset+=1)-1;
            this.ensureCapacity(offset+1);
            this.view.setUint8(offset, value);
            return this;
        };

        /**
         * Reads an 8bit unsigned integer.
         * @param {number=} offset Offset to read from. Will use and advance {@link ByteBuffer#offset} if omitted.
         * @returns {number}
         * @throws {Error} If offset is out of bounds
         * @expose
         */
        ByteBuffer.prototype.readUint8 = function(offset) {
            offset = typeof offset !== 'undefined' ? offset : (this.offset+=1)-1;
            if (offset+1 > this.array.byteLength) {
                throw(new Error("Cannot read uint8 from "+this+" at "+offset+": Capacity overflow"));
            }
            return this.view.getUint8(offset);
        };

        /**
         * Writes a 16bit signed integer.
         * @param {number} value Value to write
         * @param {number=} offset Offset to write to. Will use and advance {@link ByteBuffer#offset} if omitted.
         * @returns {!ByteBuffer} this
         * @expose
         */
        ByteBuffer.prototype.writeInt16 = function(value, offset) {
            offset = typeof offset !== 'undefined' ? offset : (this.offset+=2)-2;
            this.ensureCapacity(offset+2);
            this.view.setInt16(offset, value, this.littleEndian);
            return this;
        };

        /**
         * Reads a 16bit signed integer.
         * @param {number=} offset Offset to read from. Will use and advance {@link ByteBuffer#offset} if omitted.
         * @returns {number}
         * @throws {Error} If offset is out of bounds
         * @expose
         */
        ByteBuffer.prototype.readInt16 = function(offset) {
            offset = typeof offset !== 'undefined' ? offset : (this.offset+=2)-2;
            if (offset+2 > this.array.byteLength) {
                throw(new Error("Cannot read int16 from "+this+" at "+offset+": Capacity overflow"));
            }
            return this.view.getInt16(offset, this.littleEndian);
        };

        /**
         * Writes a short value. This is an alias of {@link ByteBuffer#writeInt16}.
         * @function
         * @param {number} value Value to write
         * @param {number=} offset Offset to write to. Will use and advance {@link ByteBuffer#offset} if omitted.
         * @returns {!ByteBuffer} this
         * @expose
         */
        ByteBuffer.prototype.writeShort = ByteBuffer.prototype.writeInt16;

        /**
         * Reads a short value. This is an alias of {@link ByteBuffer#readInt16}.
         * @function
         * @param {number=} offset Offset to read from. Will use and advance {@link ByteBuffer#offset} if omitted.
         * @returns {number}
         * @throws {Error} If offset is out of bounds
         * @expose
         */
        ByteBuffer.prototype.readShort = ByteBuffer.prototype.readInt16;

        /**
         * Writes a 16bit unsigned integer.
         * @param {number} value Value to write
         * @param {number=} offset Offset to write to. Will use and advance {@link ByteBuffer#offset} if omitted.
         * @returns {!ByteBuffer} this
         * @expose
         */
        ByteBuffer.prototype.writeUint16 = function(value, offset) {
            offset = typeof offset !== 'undefined' ? offset : (this.offset+=2)-2;
            this.ensureCapacity(offset+2);
            this.view.setUint16(offset, value, this.littleEndian);
            return this;
        };

        /**
         * Reads a 16bit unsigned integer.
         * @param {number=} offset Offset to read from. Will use and advance {@link ByteBuffer#offset} if omitted.
         * @returns {number}
         * @throws {Error} If offset is out of bounds
         * @expose
         */
        ByteBuffer.prototype.readUint16 = function(offset) {
            offset = typeof offset !== 'undefined' ? offset : (this.offset+=2)-2;
            if (offset+2 > this.array.byteLength) {
                throw(new Error("Cannot read int16 from "+this+" at "+offset+": Capacity overflow"));
            }
            return this.view.getUint16(offset, this.littleEndian);
        };

        /**
         * Writes a 32bit signed integer.
         * @param {number} value Value to write
         * @param {number=} offset Offset to write to. Will use and advance {@link ByteBuffer#offset} if omitted.
         * @returns {!ByteBuffer} this
         * @expose
         */
        ByteBuffer.prototype.writeInt32 = function(value, offset) {
            offset = typeof offset !== 'undefined' ? offset : (this.offset+=4)-4;
            this.ensureCapacity(offset+4);
            this.view.setInt32(offset, value, this.littleEndian);
            return this;
        };

        /**
         * Reads a 32bit signed integer.
         * @param {number=} offset Offset to read from. Will use and advance {@link ByteBuffer#offset} if omitted.
         * @returns {number}
         * @throws {Error} If offset is out of bounds
         * @expose
         */
        ByteBuffer.prototype.readInt32 = function(offset) {
            offset = typeof offset !== 'undefined' ? offset : (this.offset+=4)-4;
            if (offset+4 > this.array.byteLength) {
                throw(new Error("Cannot read int32 from "+this+" at "+offset+": Capacity overflow"));
            }
            return this.view.getInt32(offset, this.littleEndian);
        };

        /**
         * Writes an integer. This is an alias of {@link ByteBuffer#writeInt32}.
         * @function
         * @param {number} value Value to write
         * @param {number=} offset Offset to write to. Will use and advance {@link ByteBuffer#offset} if omitted.
         * @returns {!ByteBuffer} this
         * @expose
         */
        ByteBuffer.prototype.writeInt = ByteBuffer.prototype.writeInt32;

        /**
         * Reads an integer. This is an alias of {@link ByteBuffer#readInt32}.
         * @function
         * @param {number=} offset Offset to read from. Will use and advance {@link ByteBuffer#offset} if omitted.
         * @returns {number}
         * @throws {Error} If offset is out of bounds
         * @expose
         */
        ByteBuffer.prototype.readInt = ByteBuffer.prototype.readInt32;

        /**
         * Writes a 32bit unsigned integer.
         * @param {number} value Value to write
         * @param {number=} offset Offset to write to. Will use and advance {@link ByteBuffer#offset} if omitted.
         * @returns {!ByteBuffer} this
         * @expose
         */
        ByteBuffer.prototype.writeUint32 = function(value, offset) {
            offset = typeof offset != 'undefined' ? offset : (this.offset+=4)-4;
            this.ensureCapacity(offset+4);
            this.view.setUint32(offset, value, this.littleEndian);
            return this;
        };

        /**
         * Reads a 32bit unsigned integer.
         * @param {number=} offset Offset to read from. Will use and advance {@link ByteBuffer#offset} if omitted.
         * @returns {number}
         * @throws {Error} If offset is out of bounds
         * @expose
         */
        ByteBuffer.prototype.readUint32 = function(offset) {
            offset = typeof offset !== 'undefined' ? offset : (this.offset+=4)-4;
            if (offset+4 > this.array.byteLength) {
                throw(new Error("Cannot read uint32 from "+this+" at "+offset+": Capacity overflow"));
            }
            return this.view.getUint32(offset, this.littleEndian);
        };

        /**
         * Writes a 32bit float.
         * @param {number} value Value to write
         * @param {number=} offset Offset to write to. Will use and advance {@link ByteBuffer#offset} if omitted.
         * @returns {!ByteBuffer} this
         * @expose
         */
        ByteBuffer.prototype.writeFloat32 = function(value, offset) {
            offset = typeof offset !== 'undefined' ? offset : (this.offset+=4)-4;
            this.ensureCapacity(offset+4);
            this.view.setFloat32(offset, value, this.littleEndian);
            return this;
        };

        /**
         * Reads a 32bit float.
         * @param {number=} offset Offset to read from. Will use and advance {@link ByteBuffer#offset} if omitted.
         * @returns {number}
         * @throws {Error} If offset is out of bounds
         * @expose
         */
        ByteBuffer.prototype.readFloat32 = function(offset) {
            offset = typeof offset !== 'undefined' ? offset : (this.offset+=4)-4;
            if (this.array === null || offset+4 > this.array.byteLength) {
                throw(new Error("Cannot read float32 from "+this+" at "+offset+": Capacity overflow"));
            }
            return this.view.getFloat32(offset, this.littleEndian);
        };

        /**
         * Writes a float. This is an alias of {@link ByteBuffer#writeFloat32}.
         * @function
         * @param {number} value Value to write
         * @param {number=} offset Offset to write to. Will use and advance {@link ByteBuffer#offset} if omitted.
         * @returns {!ByteBuffer} this
         * @expose
         */
        ByteBuffer.prototype.writeFloat = ByteBuffer.prototype.writeFloat32;

        /**
         * Reads a float. This is an alias of {@link ByteBuffer#readFloat32}.
         * @function
         * @param {number=} offset Offset to read from. Will use and advance {@link ByteBuffer#offset} if omitted.
         * @returns {number}
         * @throws {Error} If offset is out of bounds
         * @expose
         */
        ByteBuffer.prototype.readFloat = ByteBuffer.prototype.readFloat32;

        /**
         * Writes a 64bit float.
         * @param {number} value Value to write
         * @param {number=} offset Offset to write to. Will use and advance {@link ByteBuffer#offset} if omitted.
         * @returns {!ByteBuffer} this
         * @expose
         */
        ByteBuffer.prototype.writeFloat64 = function(value, offset) {
            offset = typeof offset !== 'undefined' ? offset : (this.offset+=8)-8;
            this.ensureCapacity(offset+8);
            this.view.setFloat64(offset, value, this.littleEndian);
            return this;
        };

        /**
         * Reads a 64bit float.
         * @param {number=} offset Offset to read from. Will use and advance {@link ByteBuffer#offset} if omitted.
         * @returns {number}
         * @throws {Error} If offset is out of bounds
         * @expose
         */
        ByteBuffer.prototype.readFloat64 = function(offset) {
            offset = typeof offset !== 'undefined' ? offset : (this.offset+=8)-8;
            if (this.array === null || offset+8 > this.array.byteLength) {
                throw(new Error("Cannot read float64 from "+this+" at "+offset+": Capacity overflow"));
            }
            return this.view.getFloat64(offset, this.littleEndian);
        };

        /**
         * Writes a double. This is an alias of {@link ByteBuffer#writeFloat64}.
         * @function
         * @param {number} value Value to write
         * @param {number=} offset Offset to write to. Will use and advance {@link ByteBuffer#offset} if omitted.
         * @returns {!ByteBuffer} this
         * @expose
         */
        ByteBuffer.prototype.writeDouble = ByteBuffer.prototype.writeFloat64;

        /**
         * Reads a double. This is an alias of {@link ByteBuffer#readFloat64}.
         * @function
         * @param {number=} offset Offset to read from. Will use and advance {@link ByteBuffer#offset} if omitted.
         * @returns {number}
         * @throws {Error} If offset is out of bounds
         * @expose
         */
        ByteBuffer.prototype.readDouble = ByteBuffer.prototype.readFloat64;

        // Available with Long.js only
        if (Long) {

            /**
             * Writes a 64bit integer. Requires Long.js.
             * @function
             * @param {number|!Long} value Value to write
             * @param {number=} offset Offset to write to. Will use and advance {@link ByteBuffer#offset} if omitted.
             * @returns {!ByteBuffer} this
             * @expose
             */
            ByteBuffer.prototype.writeInt64 = function(value, offset) {
                offset = typeof offset !== 'undefined' ? offset : (this.offset+=8)-8;
                if (!(typeof value === 'object' && value instanceof Long)) value = Long.fromNumber(value, false);
                this.ensureCapacity(offset+8);
                if (this.littleEndian) {
                    this.view.setInt32(offset, value.getLowBits(), true);
                    this.view.setInt32(offset+4, value.getHighBits(), true);
                } else {
                    this.view.setInt32(offset, value.getHighBits(), false);
                    this.view.setInt32(offset+4, value.getLowBits(), false);
                }
                return this;
            };

            /**
             * Reads a 64bit integer. Requires Long.js.
             * @param {number=} offset Offset to read from. Will use and advance {@link ByteBuffer#offset} if omitted.
             * @returns {!Long}
             * @throws {Error} If offset is out of bounds
             * @expose
             */
            ByteBuffer.prototype.readInt64 = function(offset) {
                offset = typeof offset !== 'undefined' ? offset : (this.offset+=8)-8;
                if (this.array === null || offset+8 > this.array.byteLength) {
                    this.offset -= 8;
                    throw(new Error("Cannot read int64 from "+this+" at "+offset+": Capacity overflow"));
                }
                var value;
                if (this.littleEndian) {
                    value = Long.fromBits(this.view.getInt32(offset, true), this.view.getInt32(offset+4, true), false);
                } else {
                    value = Long.fromBits(this.view.getInt32(offset+4, false), this.view.getInt32(offset, false), false);
                }
                return value;
            };

            /**
             * Writes a 64bit unsigned integer. Requires Long.js.
             * @function
             * @param {number|!Long} value Value to write
             * @param {number=} offset Offset to write to. Will use and advance {@link ByteBuffer#offset} if omitted.
             * @returns {!ByteBuffer} this
             * @expose
             */
            ByteBuffer.prototype.writeUint64 = function(value, offset) {
                offset = typeof offset !== 'undefined' ? offset : (this.offset+=8)-8;
                if (!(typeof value === 'object' && value instanceof Long)) value = Long.fromNumber(value, true);
                this.ensureCapacity(offset+8);
                if (this.littleEndian) {
                    this.view.setUint32(offset, value.getLowBitsUnsigned(), true);
                    this.view.setUint32(offset+4, value.getHighBitsUnsigned(), true);
                } else {
                    this.view.setUint32(offset, value.getHighBitsUnsigned(), false);
                    this.view.setUint32(offset+4, value.getLowBitsUnsigned(), false);
                }
                return this;
            };

            /**
             * Reads a 64bit unsigned integer. Requires Long.js.
             * @param {number=} offset Offset to read from. Will use and advance {@link ByteBuffer#offset} if omitted.
             * @returns {!Long}
             * @throws {Error} If offset is out of bounds
             * @expose
             */
            ByteBuffer.prototype.readUint64 = function(offset) {
                offset = typeof offset !== 'undefined' ? offset : (this.offset+=8)-8;
                if (this.array === null || offset+8 > this.array.byteLength) {
                    this.offset -= 8;
                    throw(new Error("Cannot read int64 from "+this+" at "+offset+": Capacity overflow"));
                }
                var value;
                if (this.littleEndian) {
                    value = Long.fromBits(this.view.getUint32(offset, true), this.view.getUint32(offset+4, true), true);
                } else {
                    value = Long.fromBits(this.view.getUint32(offset+4, false), this.view.getUint32(offset, false), true);
                }
                return value;
            };

            /**
             * Writes a long. This is an alias of {@link ByteBuffer#writeInt64}.
             * @function
             * @param {number|!Long} value Value to write
             * @param {number=} offset Offset to write to. Will use and advance {@link ByteBuffer#offset} if omitted.
             * @returns {!ByteBuffer} this
             * @expose
             */
            ByteBuffer.prototype.writeLong = ByteBuffer.prototype.writeInt64;

            /**
             * Reads a long. This is an alias of {@link ByteBuffer#readInt64}.
             * @function
             * @param {number=} offset Offset to read from. Will use and advance {@link ByteBuffer#offset} if omitted.
             * @returns {!Long}
             * @throws {Error} If offset is out of bounds
             * @expose
             */
            ByteBuffer.prototype.readLong = ByteBuffer.prototype.readInt64;

        }

        /**
         * Maximum number of bytes used by 32bit base 128 variable-length integer.
         * @type {number}
         * @const
         * @expose
         */
        ByteBuffer.MAX_VARINT32_BYTES = 5;

        /**
         * Writes a 32bit base 128 variable-length integer as used in protobuf.
         * @param {number} value Value to write
         * @param {number=} offset Offset to write to. Will use and advance {@link ByteBuffer#offset} if omitted.
         * @returns {!ByteBuffer|number} this if offset is omitted, else the actual number of bytes written.
         * @expose
         */
        ByteBuffer.prototype.writeVarint32 = function(value, offset) {
            var advance = typeof offset === 'undefined';
            offset = typeof offset !== 'undefined' ? offset : this.offset;
            // ref: http://code.google.com/searchframe#WTeibokF6gE/trunk/src/google/protobuf/io/coded_stream.cc
            value = value >>> 0;
            this.ensureCapacity(offset+ByteBuffer.calculateVarint32(value));
            var dst = this.view,
                size = 0;
            dst.setUint8(offset, value | 0x80);
            if (value >= (1 << 7)) {
                dst.setUint8(offset+1, (value >> 7) | 0x80);
                if (value >= (1 << 14)) {
                    dst.setUint8(offset+2, (value >> 14) | 0x80);
                    if (value >= (1 << 21)) {
                        dst.setUint8(offset+3, (value >> 21) | 0x80);
                        if (value >= (1 << 28)) {
                            dst.setUint8(offset+4, (value >> 28) & 0x7F);
                            size = 5;
                        } else {
                            dst.setUint8(offset+3, dst.getUint8(offset+3) & 0x7F);
                            size = 4;
                        }
                    } else {
                        dst.setUint8(offset+2, dst.getUint8(offset+2) & 0x7F);
                        size = 3;
                    }
                } else {
                    dst.setUint8(offset+1, dst.getUint8(offset+1) & 0x7F);
                    size = 2;
                }
            } else {
                dst.setUint8(offset, dst.getUint8(offset) & 0x7F);
                size = 1;
            }
            if (advance) {
                this.offset += size;
                return this;
            } else {
                return size;
            }
        };

        /**
         * Reads a 32bit base 128 variable-length integer as used in protobuf.
         * @param {number=} offset Offset to read from. Will use and advance {@link ByteBuffer#offset} if omitted.
         * @returns {number|!{value: number, length: number}} The value read if offset is omitted, else the value read
         *  and the actual number of bytes read.
         * @throws {Error} If it's not a valid varint
         * @expose
         */
        ByteBuffer.prototype.readVarint32 = function(offset) {
            var advance = typeof offset === 'undefined';
            offset = typeof offset !== 'undefined' ? offset : this.offset;
            // ref: src/google/protobuf/io/coded_stream.cc

            var count = 0, b,
                src = this.view;
            var value = 0 >>> 0;
            do {
                b = src.getUint8(offset+count);
                if (count < ByteBuffer.MAX_VARINT32_BYTES) {
                    value |= ((b&0x7F)<<(7*count)) >>> 0;
                }
                ++count;
            } while (b & 0x80);
            value = value | 0; // Make sure to discard the higher order bits
            if (advance) {
                this.offset += count;
                return value;
            } else {
                return {
                    "value": value,
                    "length": count
                };
            }
        };

        /**
         * Writes a zigzag encoded 32bit base 128 encoded variable-length integer as used in protobuf.
         * @param {number} value Value to write
         * @param {number=} offset Offset to write to. Will use and advance {@link ByteBuffer#offset} if omitted.
         * @returns {!ByteBuffer|number} this if offset is omitted, else the actual number of bytes written.
         * @expose
         */
        ByteBuffer.prototype.writeZigZagVarint32 = function(value, offset) {
            return this.writeVarint32(ByteBuffer.zigZagEncode32(value), offset);
        };

        /**
         * Reads a zigzag encoded 32bit base 128 variable-length integer as used in protobuf.
         * @param {number=} offset Offset to read from. Will use and advance {@link ByteBuffer#offset} if omitted.
         * @returns {number|!{value: number, length: number}} The value read if offset is omitted, else the value read
         *  and the actual number of bytes read.
         * @throws {Error} If it's not a valid varint
         * @expose
         */
        ByteBuffer.prototype.readZigZagVarint32 = function(offset) {
            var dec = this.readVarint32(offset);
            if (typeof dec === 'object') {
                dec['value'] = ByteBuffer.zigZagDecode32(dec['value']);
                return dec;
            }
            return ByteBuffer.zigZagDecode32(dec);
        };

        /**
         * Maximum number of bytes used by a 64bit base 128 variable-length integer.
         * @type {number}
         * @const
         * @expose
         */
        ByteBuffer.MAX_VARINT64_BYTES = 10;

        /**
         * @type {number}
         * @const
         * @inner
         */
        var TWO_PWR_7_DBL = 1 << 7;

        /**
         * @type {number}
         * @const
         * @inner
         */
        var TWO_PWR_14_DBL = TWO_PWR_7_DBL * TWO_PWR_7_DBL;

        /**
         * @type {number}
         * @const
         * @inner
         */
        var TWO_PWR_21_DBL = TWO_PWR_7_DBL * TWO_PWR_14_DBL;

        /**
         * @type {number}
         * @const
         * @inner
         */
        var TWO_PWR_28_DBL = TWO_PWR_14_DBL * TWO_PWR_14_DBL;

        // Available with Long.js only
        if (Long) {

            /**
             * Writes a 64bit base 128 variable-length integer as used in protobuf.
             * @param {number|Long} value Value to write
             * @param {number=} offset Offset to write to. Will use and advance {@link ByteBuffer#offset} if omitted.
             * @returns {!ByteBuffer|number} this if offset is omitted, else the actual number of bytes written.
             * @expose
             */
            ByteBuffer.prototype.writeVarint64 = function(value, offset) {
                var advance = typeof offset === 'undefined';
                offset = typeof offset !== 'undefined' ? offset : this.offset;
                if (!(typeof value === 'object' && value instanceof Long)) value = Long.fromNumber(value, false);
    
                var part0 = value.toInt() >>> 0,
                    part1 = value.shiftRightUnsigned(28).toInt() >>> 0,
                    part2 = value.shiftRightUnsigned(56).toInt() >>> 0,
                    size = ByteBuffer.calculateVarint64(value);
    
                this.ensureCapacity(offset+size);
                var dst = this.view;
                switch (size) {
                    case 10: dst.setUint8(offset+9, (part2 >>>  7) | 0x80);
                    case 9 : dst.setUint8(offset+8, (part2       ) | 0x80);
                    case 8 : dst.setUint8(offset+7, (part1 >>> 21) | 0x80);
                    case 7 : dst.setUint8(offset+6, (part1 >>> 14) | 0x80);
                    case 6 : dst.setUint8(offset+5, (part1 >>>  7) | 0x80);
                    case 5 : dst.setUint8(offset+4, (part1       ) | 0x80);
                    case 4 : dst.setUint8(offset+3, (part0 >>> 21) | 0x80);
                    case 3 : dst.setUint8(offset+2, (part0 >>> 14) | 0x80);
                    case 2 : dst.setUint8(offset+1, (part0 >>>  7) | 0x80);
                    case 1 : dst.setUint8(offset+0, (part0       ) | 0x80);
                }
                dst.setUint8(offset+size-1, dst.getUint8(offset+size-1) & 0x7F);
                if (advance) {
                    this.offset += size;
                    return this;
                } else {
                    return size;
                }
            };
    
            /**
             * Reads a 32bit base 128 variable-length integer as used in protobuf. Requires Long.js.
             * @param {number=} offset Offset to read from. Will use and advance {@link ByteBuffer#offset} if omitted.
             * @returns {!Long|!{value: Long, length: number}} The value read if offset is omitted, else the value read and
             *  the actual number of bytes read.
             * @throws {Error} If it's not a valid varint
             * @expose
             */
            ByteBuffer.prototype.readVarint64 = function(offset) {
                var advance = typeof offset === 'undefined';
                offset = typeof offset !== 'undefined' ? offset : this.offset;
                var start = offset;
                // ref: src/google/protobuf/io/coded_stream.cc
    
                var src = this.view,
                    part0, part1 = 0, part2 = 0, b;
                b = src.getUint8(offset++); part0  = (b & 0x7F)      ; if (b & 0x80) {
                b = src.getUint8(offset++); part0 |= (b & 0x7F) <<  7; if (b & 0x80) {
                b = src.getUint8(offset++); part0 |= (b & 0x7F) << 14; if (b & 0x80) {
                b = src.getUint8(offset++); part0 |= (b & 0x7F) << 21; if (b & 0x80) {
                b = src.getUint8(offset++); part1  = (b & 0x7F)      ; if (b & 0x80) {
                b = src.getUint8(offset++); part1 |= (b & 0x7F) <<  7; if (b & 0x80) {
                b = src.getUint8(offset++); part1 |= (b & 0x7F) << 14; if (b & 0x80) {
                b = src.getUint8(offset++); part1 |= (b & 0x7F) << 21; if (b & 0x80) {
                b = src.getUint8(offset++); part2  = (b & 0x7F)      ; if (b & 0x80) {
                b = src.getUint8(offset++); part2 |= (b & 0x7F) <<  7; if (b & 0x80) {
                throw(new Error("Data must be corrupt: Buffer overrun")); }}}}}}}}}}
                
                var value = Long.from28Bits(part0, part1, part2, false);
                if (advance) {
                    this.offset = offset;
                    return value;
                } else {
                    return {
                        "value": value,
                        "length": offset-start
                    };
                }
            };
    
            /**
             * Writes a zigzag encoded 64bit base 128 encoded variable-length integer as used in protobuf.
             * @param {number} value Value to write
             * @param {number=} offset Offset to write to. Defaults to {@link ByteBuffer#offset} which will be modified only if omitted.
             * @returns {!ByteBuffer|number} this if offset is omitted, else the actual number of bytes written.
             * @expose
             */
            ByteBuffer.prototype.writeZigZagVarint64 = function(value, offset) {
                return this.writeVarint64(ByteBuffer.zigZagEncode64(value), offset);
            };
    
            /**
             * Reads a zigzag encoded 64bit base 128 variable-length integer as used in protobuf.
             * @param {number=} offset Offset to read from. Defaults to {@link ByteBuffer#offset} which will be modified only if omitted.
             * @returns {Long|!{value: Long, length: number}} The value read if offset is omitted, else the value read and the actual number of bytes read.
             * @throws {Error} If it's not a valid varint
             * @expose
             */
            ByteBuffer.prototype.readZigZagVarint64 = function(offset) {
                var dec = this.readVarint64(offset);
                if (typeof dec === 'object' && !(dec instanceof Long)) {
                    dec['value'] = ByteBuffer.zigZagDecode64(dec['value']);
                    return dec;
                }
                return ByteBuffer.zigZagDecode64(dec);
            };
                
         }

        /**
         * Writes a base 128 variable-length integer as used in protobuf. This is an alias of {@link ByteBuffer#writeVarint32}.
         * @function
         * @param {number} value Value to write
         * @param {number=} offset Offset to write to. Defaults to {@link ByteBuffer#offset} which will be modified only if omitted.
         * @returns {!ByteBuffer|number} this if offset is omitted, else the actual number of bytes written.
         * @expose
         */
        ByteBuffer.prototype.writeVarint = ByteBuffer.prototype.writeVarint32;

        /**
         * Reads a base 128 variable-length integer as used in protobuf. This is an alias of {@link ByteBuffer#readVarint32}.
         * @function
         * @param {number=} offset Offset to read from. Defaults to {@link ByteBuffer#offset} which will be modified only if omitted.
         * @returns {number|{value: number, length: number}} The value read if offset is omitted, else the value read and the actual number of bytes read.
         * @expose
         */
        ByteBuffer.prototype.readVarint = ByteBuffer.prototype.readVarint32;

        /**
         * Writes a zigzag encoded base 128 encoded variable-length integer as used in protobuf. This is an alias of {@link ByteBuffer#writeZigZagVarint32}.
         * @function
         * @param {number} value Value to write
         * @param {number=} offset Offset to write to. Defaults to {@link ByteBuffer#offset} which will be modified only if omitted.
         * @returns {!ByteBuffer|number} this if offset is omitted, else the actual number of bytes written.
         * @expose
         */
        ByteBuffer.prototype.writeZigZagVarint = ByteBuffer.prototype.writeZigZagVarint32;

        /**
         * Reads a zigzag encoded base 128 variable-length integer as used in protobuf. This is an alias of {@link ByteBuffer#readZigZagVarint32}.
         * @function
         * @param {number=} offset Offset to read from. Defaults to {@link ByteBuffer#offset} which will be modified only if omitted.
         * @returns {number|{value: number, length: number}} The value read if offset is omitted, else the value read and the actual number of bytes read.
         * @throws {Error} If it's not a valid varint
         * @expose
         */
        ByteBuffer.prototype.readZigZagVarint = ByteBuffer.prototype.readZigZagVarint32;

        /**
         * Calculates the actual number of bytes required to encode a 32bit base 128 variable-length integer.
         * @param {number} value Value to encode
         * @returns {number} Number of bytes required. Capped to {@link ByteBuffer.MAX_VARINT32_BYTES}
         * @expose
         */
        ByteBuffer.calculateVarint32 = function(value) {
            // ref: src/google/protobuf/io/coded_stream.cc
            value = value >>> 0;
            if (value < TWO_PWR_7_DBL) {
                return 1;
            } else if (value < TWO_PWR_14_DBL) {
                return 2;
            } else if (value < TWO_PWR_21_DBL) {
                return 3;
            } else if (value < TWO_PWR_28_DBL) {
                return 4;
            } else {
                return 5;
            }
        };
        
        // Available with Long.js only
        if (Long) {
    
            /**
             * Calculates the actual number of bytes required to encode a 64bit base 128 variable-length integer.
             * @param {number|!Long} value Value to encode
             * @returns {number} Number of bytes required. Capped to {@link ByteBuffer.MAX_VARINT64_BYTES}
             * @expose
             */
            ByteBuffer.calculateVarint64 = function(value) {
                // ref: src/google/protobuf/io/coded_stream.cc
                if (!(typeof value === 'object' && value instanceof Long)) value = Long.fromNumber(value, false);
    
                var part0 = value.toInt() >>> 0,
                    part1 = value.shiftRightUnsigned(28).toInt() >>> 0,
                    part2 = value.shiftRightUnsigned(56).toInt() >>> 0;
    
                if (part2 == 0) {
                    if (part1 == 0) {
                        if (part0 < TWO_PWR_14_DBL) {
                            return part0 < TWO_PWR_7_DBL ? 1 : 2;
                        } else {
                            return part0 < TWO_PWR_21_DBL ? 3 : 4;
                        }
                    } else {
                        if (part1 < TWO_PWR_14_DBL) {
                            return part1 < TWO_PWR_7_DBL ? 5 : 6;
                        } else {
                            return part1 < TWO_PWR_21_DBL ? 7 : 8;
                        }
                    }
                } else {
                    return part2 < TWO_PWR_7_DBL ? 9 : 10;
                }
            };
            
        }

        /**
         * Encodes a signed 32bit integer so that it can be effectively used with varint encoding.
         * @param {number} n Signed 32bit integer
         * @returns {number} Unsigned zigzag encoded 32bit integer
         * @expose
         */
        ByteBuffer.zigZagEncode32 = function(n) {
            // ref: src/google/protobuf/wire_format_lite.h
            return (((n |= 0) << 1) ^ (n >> 31)) >>> 0;
        };

        /**
         * Decodes a zigzag encoded signed 32bit integer.
         * @param {number} n Unsigned zigzag encoded 32bit integer
         * @returns {number} Signed 32bit integer
         * @expose
         */
        ByteBuffer.zigZagDecode32 = function(n) {
            // ref: src/google/protobuf/wire_format_lite.h
            return ((n >>> 1) ^ -(n & 1)) | 0;
        };
        
        // Available with Long.js only
        if (Long) {
    
            /**
             * Encodes a signed 64bit integer so that it can be effectively used with varint encoding.
             * @param {number|!Long} n Signed long
             * @returns {!Long} Unsigned zigzag encoded long
             * @expose
             */
            ByteBuffer.zigZagEncode64 = function(n) {
                // ref: src/google/protobuf/wire_format_lite.h
                if (typeof n === 'object' && n instanceof Long) {
                    if (n.unsigned) n = n.toSigned();
                } else {
                    n = Long.fromNumber(n, false);
                }
                return n.shiftLeft(1).xor(n.shiftRight(63)).toUnsigned();
            };
    
            /**
             * Decodes a zigzag encoded signed 64bit integer.
             * @param {!Long|number} n Unsigned zigzag encoded long or JavaScript number
             * @returns {!Long} Signed long
             * @throws {Error} If long support is not available
             * @expose
             */
            ByteBuffer.zigZagDecode64 = function(n) {
                // ref: src/google/protobuf/wire_format_lite.h
                if (typeof n === 'object' && n instanceof Long) {
                    if (!n.unsigned) n = n.toUnsigned();
                } else {
                    n = Long.fromNumber(n, true);
                }
                return n.shiftRightUnsigned(1).xor(n.and(Long.ONE).toSigned().negate()).toSigned();
            };
            
        }

        /**
         * Decodes a single UTF8 character from the specified ByteBuffer. The ByteBuffer's offsets are not modified.
         * @param {!ByteBuffer} src
         * @param {number} offset Offset to read from
         * @returns {!{char: number, length: number}} Decoded char code and the actual number of bytes read
         * @throws {Error} If the character cannot be decoded or there is a capacity overflow
         * @expose
         */
        ByteBuffer.decodeUTF8Char = function(src, offset) {
            var a = src.readUint8(offset), b, c, d, e, f, start = offset, charCode;
            // ref: http://en.wikipedia.org/wiki/UTF-8#Description
            // It's quite huge but should be pretty fast.
            if ((a&0x80)==0) {
                charCode = a;
                offset += 1;
            } else if ((a&0xE0)==0xC0) {
                b = src.readUint8(offset+1);
                charCode = ((a&0x1F)<<6) | (b&0x3F);
                offset += 2;
            } else if ((a&0xF0)==0xE0) {
                b = src.readUint8(offset+1);
                c = src.readUint8(offset+2);
                charCode = ((a&0x0F)<<12) | ((b&0x3F)<<6) | (c&0x3F);
                offset += 3;
            } else if ((a&0xF8)==0xF0) {
                b = src.readUint8(offset+1);
                c = src.readUint8(offset+2);
                d = src.readUint8(offset+3);
                charCode = ((a&0x07)<<18) | ((b&0x3F)<<12) | ((c&0x3F)<<6) | (d&0x3F);
                offset += 4;
            } else if ((a&0xFC)==0xF8) {
                b = src.readUint8(offset+1);
                c = src.readUint8(offset+2);
                d = src.readUint8(offset+3);
                e = src.readUint8(offset+4);
                charCode = ((a&0x03)<<24) | ((b&0x3F)<<18) | ((c&0x3F)<<12) | ((d&0x3F)<<6) | (e&0x3F);
                offset += 5;
            } else if ((a&0xFE)==0xFC) {
                b = src.readUint8(offset+1);
                c = src.readUint8(offset+2);
                d = src.readUint8(offset+3);
                e = src.readUint8(offset+4);
                f = src.readUint8(offset+5);
                charCode = ((a&0x01)<<30) | ((b&0x3F)<<24) | ((c&0x3F)<<18) | ((d&0x3F)<<12) | ((e&0x3F)<<6) | (f&0x3F);
                offset += 6;
            } else {
                throw(new Error("Cannot decode UTF8 character at offset "+offset+": charCode (0x"+a.toString(16)+") is invalid"));
            }
            return {
                "char": charCode ,
                "length": offset-start
            };
        };

        /**
         * Encodes a single UTF8 character to the specified ByteBuffer. The ByteBuffer's offsets are not modified.
         * @param {number} charCode Character to encode as char code
         * @param {!ByteBuffer} dst ByteBuffer to encode to
         * @param {number} offset Offset to write to
         * @returns {number} Actual number of bytes written
         * @throws {Error} If the character cannot be encoded
         * @expose
         */
        ByteBuffer.encodeUTF8Char = function(charCode, dst, offset) {
            var start = offset;
            // ref: http://en.wikipedia.org/wiki/UTF-8#Description
            // It's quite huge but should be pretty fast.
            if (charCode < 0) {
                throw(new Error("Cannot encode UTF8 character: charCode ("+charCode+") is negative"));
            }
            if (charCode < 0x80) {
                dst.writeUint8(charCode&0x7F, offset);
                offset += 1;
            } else if (charCode < 0x800) {
                dst.writeUint8(((charCode>>6)&0x1F)|0xC0, offset)
                    .writeUint8((charCode&0x3F)|0x80, offset+1);
                offset += 2;
            } else if (charCode < 0x10000) {
                dst.writeUint8(((charCode>>12)&0x0F)|0xE0, offset)
                    .writeUint8(((charCode>>6)&0x3F)|0x80, offset+1)
                    .writeUint8((charCode&0x3F)|0x80, offset+2);
                offset += 3;
            } else if (charCode < 0x200000) {
                dst.writeUint8(((charCode>>18)&0x07)|0xF0, offset)
                    .writeUint8(((charCode>>12)&0x3F)|0x80, offset+1)
                    .writeUint8(((charCode>>6)&0x3F)|0x80, offset+2)
                    .writeUint8((charCode&0x3F)|0x80, offset+3);
                offset += 4;
            } else if (charCode < 0x4000000) {
                dst.writeUint8(((charCode>>24)&0x03)|0xF8, offset)
                    .writeUint8(((charCode>>18)&0x3F)|0x80, offset+1)
                    .writeUint8(((charCode>>12)&0x3F)|0x80, offset+2)
                    .writeUint8(((charCode>>6)&0x3F)|0x80, offset+3)
                    .writeUint8((charCode&0x3F)|0x80, offset+4);
                offset += 5;
            } else if (charCode < 0x80000000) {
                dst.writeUint8(((charCode>>30)&0x01)|0xFC, offset)
                    .writeUint8(((charCode>>24)&0x3F)|0x80, offset+1)
                    .writeUint8(((charCode>>18)&0x3F)|0x80, offset+2)
                    .writeUint8(((charCode>>12)&0x3F)|0x80, offset+3)
                    .writeUint8(((charCode>>6)&0x3F)|0x80, offset+4)
                    .writeUint8((charCode&0x3F)|0x80, offset+5);
                offset += 6;
            } else {
                throw(new Error("Cannot encode UTF8 character: charCode (0x"+charCode.toString(16)+") is too large (>= 0x80000000)"));
            }
            return offset-start;
        };

        /**
         * Calculates the actual number of bytes required to encode the specified char code.
         * @param {number} charCode Character to encode as char code
         * @returns {number} Number of bytes required to encode the specified char code
         * @throws {Error} If the character cannot be calculated (too large)
         * @expose
         */
        ByteBuffer.calculateUTF8Char = function(charCode) {
            if (charCode < 0) {
                throw(new Error("Cannot calculate length of UTF8 character: charCode ("+charCode+") is negative"));
            }
            if (charCode < 0x80) {
                return 1;
            } else if (charCode < 0x800) {
                return 2;
            } else if (charCode < 0x10000) {
                return 3;
            } else if (charCode < 0x200000) {
                return 4;
            } else if (charCode < 0x4000000) {
                return 5;
            } else if (charCode < 0x80000000) {
                return 6;
            } else {
                throw(new Error("Cannot calculate length of UTF8 character: charCode (0x"+charCode.toString(16)+") is too large (>= 0x80000000)"));
            }
        };

        /**
         * Calculates the number of bytes required to store an UTF8 encoded string.
         * @param {string} str String to calculate
         * @returns {number} Number of bytes required
         */
        ByteBuffer.calculateUTF8String = function(str) {
            str = ""+str;
            var bytes = 0;
            for (var i=0, k=str.length; i<k; ++i) {
                // Does not throw since JS strings are already UTF8 encoded
                bytes += ByteBuffer.calculateUTF8Char(str.charCodeAt(i));
            }
            return bytes;
        };

        /**
         * Base64 alphabet.
         * @type {string}
         * @inner
         */
        var B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
        B64 = B64+""; // Prevent CC from inlining this for less code size

        /**
         * Encodes a ByteBuffer's contents to a base64 string.
         * @param {!ByteBuffer} bb ByteBuffer to encode. Will be cloned and flipped if length < offset.
         * @returns {string} Base64 encoded string
         * @throws {Error} If the argument is not a valid ByteBuffer
         * @expose
         */
        ByteBuffer.encode64 = function(bb) {
            // ref: http://phpjs.org/functions/base64_encode/
             if (!(bb instanceof ByteBuffer)) {
                bb = ByteBuffer.wrap(bb);
            } else if (bb.length < bb.offset) {
                 bb = bb.clone().flip();
             }
            var o1, o2, o3, h1, h2, h3, h4, bits, i = bb.offset,
                oi = 0,
                out = [];
            do {
                o1 = bb.readUint8(i++);
                o2 = bb.length > i ? bb.readUint8(i++) : 0;
                o3 = bb.length > i ? bb.readUint8(i++) : 0;
                bits = o1 << 16 | o2 << 8 | o3;
                h1 = bits >> 18 & 0x3f;
                h2 = bits >> 12 & 0x3f;
                h3 = bits >> 6 & 0x3f;
                h4 = bits & 0x3f;
                out[oi++] = B64.charAt(h1) + B64.charAt(h2) + B64.charAt(h3) + B64.charAt(h4);
            } while (i < bb.length);
            var enc = out.join(''),
                r = (bb.length - bb.offset) % 3;
            return (r ? enc.slice(0, r - 3) : enc) + '==='.slice(r || 3);
        };

        /**
         * Decodes a base64 encoded string to a ByteBuffer.
         * @param {string} str Base64 encoded string
         * @param {boolean=} littleEndian `true` to use little endian byte order, defaults to `false` for big endian.
         * @returns {!ByteBuffer} ByteBuffer
         * @throws {Error} If the argument is not a valid base64 encoded string
         * @expose
         */
        ByteBuffer.decode64 = function(str, littleEndian) {
            // ref: http://phpjs.org/functions/base64_decode/
            if (typeof str !== 'string') {
                throw(new Error("Illegal argument: Not a string"));
            }
            var o1, o2, o3, h1, h2, h3, h4, bits, i = 0,
                out = new ByteBuffer(Math.ceil(str.length / 3), littleEndian);
            do {
                h1 = B64.indexOf(str.charAt(i++));
                h2 = B64.indexOf(str.charAt(i++));
                h3 = B64.indexOf(str.charAt(i++));
                h4 = B64.indexOf(str.charAt(i++));
                if (h1 < 0 || h2 < 0 || h3 < 0 || h4 < 0) {
                    throw(new Error("Illegal argument: Not a valid base64 encoded string"));
                }
                bits = h1 << 18 | h2 << 12 | h3 << 6 | h4;
                o1 = bits >> 16 & 0xff;
                o2 = bits >> 8 & 0xff;
                o3 = bits & 0xff;
                if (h3 == 64) {
                    out.writeUint8(o1);
                } else if (h4 == 64) {
                    out.writeUint8(o1)
                        .writeUint8(o2);
                } else {
                    out.writeUint8(o1)
                        .writeUint8(o2)
                        .writeUint8(o3);
                }
            } while (i < str.length);
            return out.flip();
        };

        /**
         * Encodes a ByteBuffer to a hex encoded string.
         * @param {!ByteBuffer} bb ByteBuffer to encode. Will be cloned and flipped if length < offset.
         * @returns {string} Hex encoded string
         * @throws {Error} If the argument is not a valid ByteBuffer
         * @expose
         */
        ByteBuffer.encodeHex = function(bb) {
            if (!(bb instanceof ByteBuffer)) {
                bb = ByteBuffer.wrap(bb);
            } else if (bb.length < bb.offset) {
                bb = bb.clone().flip();
            }
            if (bb.array === null) return "";
            var val, out = [];
            for (var i=bb.offset, k=bb.length; i<k; ++i) {
                val = bb.view.getUint8(i).toString(16).toUpperCase();
                if (val.length < 2) val = "0"+val;
                out.push(val);
            }
            return out.join('');
        };

        /**
         * Decodes a hex encoded string to a ByteBuffer.
         * @param {string} str Hex encoded string
         * @param {boolean=} littleEndian `true` to use little endian byte order, defaults to `false` for big endian.
         * @returns {!ByteBuffer} ByteBuffer
         * @throws {Error} If the argument is not a valid hex encoded string
         * @expose
         */
        ByteBuffer.decodeHex = function(str, littleEndian) {
            if (typeof str !== 'string') {
                throw(new Error("Illegal argument: Not a string"));
            }
            if (str.length % 2 !== 0) {
                throw(new Error("Illegal argument: Not a hex encoded string"));
            }
            var o,
                out = new ByteBuffer(str.length/2, littleEndian);
            for (var i=0, k=str.length; i<k; i+=2) {
                out.writeUint8(parseInt(str.substring(i, i+2), 16));
            }
            return out.flip();
        };

        // NOTE on binary strings: Binary strings as used here have nothing to do with frequently asked questions about
        // conversion between ArrayBuffer and String. What we do here is what libraries like node-forge do to simulate a
        // byte buffer: Conversion between 8 bit unsigned integers and the low 8 bit UTF8/UCS2 characters. This is not
        // perfect as it effectively uses 16 bit per character in memory to store the 8 bit values, but that's not our
        // concern as we just want it to be compatible. It's always better to use ArrayBuffer/Buffer (!) while base64
        // and hex should be slightly worse regarding memory consumption and encoding speed.

        /**
         * Encodes a ByteBuffer to a binary string. A binary string in this case is a string composed of 8bit values
         *  as characters with a char code between 0 and 255 inclusive.
         * @param {!ByteBuffer} bb ByteBuffer to encode. Will be cloned and flipped if length < offset.
         * @returns {string} Binary string
         * @throws {Error} If the argument is not a valid ByteBuffer
         * @expose
         */
        ByteBuffer.encodeBinary = function(bb) {
            if (!(bb instanceof ByteBuffer)) {
                bb = ByteBuffer.wrap(bb);
            } else if (bb.length < bb.offset) {
                bb = bb.clone().flip();
            }
            var out = [], view = bb.view;
            for (var i=bb.offset, k=bb.length; i<k; ++i) {
                out.push(String.fromCharCode(view.getUint8(i)));
            }
            return out.join('');
        };

        /**
         * Decodes a binary string to a ByteBuffer. A binary string in this case is a string composed of 8bit values
         *  as characters with a char code between 0 and 255 inclusive.
         * @param {string} str Binary string
         * @param {boolean=} littleEndian `true` to use little endian byte order, defaults to `false` for big endian.
         * @returns {!ByteBuffer} ByteBuffer
         * @throws {Error} If the argument is not a valid binary string
         * @expose
         */
        ByteBuffer.decodeBinary = function(str, littleEndian) {
            if (typeof str !== 'string') {
                throw(new Error("Illegal argument: Not a string"));
            }
            var k=str.length,
                dst = new ArrayBuffer(k),
                view = new DataView(dst),
                val;
            for (var i=0; i<k; ++i) {
                if ((val = str.charCodeAt(i)) > 255) throw(new Error("Illegal argument: Not a binary string (char code "+val+")"));
                view.setUint8(i, val);
            }
            var bb = new ByteBuffer(k, littleEndian, true);
            bb.array = dst;
            bb.view = view;
            bb.length = k;
            return bb;
        };

        /**
         * Writes an UTF8 string.
         * @param {string} str String to write
         * @param {number=} offset Offset to write to. Will use and advance {@link ByteBuffer#offset} if omitted.
         * @returns {!ByteBuffer|number} this if offset is omitted, else the actual number of bytes written.
         * @expose
         */
        ByteBuffer.prototype.writeUTF8String = function(str, offset) {
            var advance = typeof offset === 'undefined';
            offset = typeof offset !== 'undefined' ? offset : this.offset;
            var start = offset;
            var encLen = ByteBuffer.calculateUTF8String(str); // See [1]
            this.ensureCapacity(offset+encLen);
            for (var i=0, j=str.length; i<j; ++i) {
                // [1] Does not throw since JS strings are already UTF8 encoded
                offset += ByteBuffer.encodeUTF8Char(str.charCodeAt(i), this, offset);
            }
            if (advance) {
                this.offset = offset;
                return this;
            } else {
                return offset-start;
            }
        };

        /**
         * Reads an UTF8 string.
         * @param {number} chars Number of characters to read
         * @param {number=} offset Offset to read from. Will use and advance {@link ByteBuffer#offset} if omitted.
         * @returns {string|!{string: string, length: number}} The string read if offset is omitted, else the string
         *  read and the actual number of bytes read.
         * @throws {Error} If the string cannot be decoded
         * @expose
         */
        ByteBuffer.prototype.readUTF8String = function(chars, offset) {
            var advance = typeof offset === 'undefined';
            offset = typeof offset !== 'undefined' ? offset : this.offset;
            var dec, result = "", start = offset;
            for (var i=0; i<chars; ++i) {
                dec = ByteBuffer.decodeUTF8Char(this, offset);
                offset += dec["length"];
                result += String.fromCharCode(dec["char"]);
            }
            if (advance) {
                this.offset = offset;
                return result;
            } else {
                return {
                    "string": result,
                    "length": offset-start
                }
            }
        };

        /**
         * Reads an UTF8 string with the specified byte length.
         * @param {number} length Byte length
         * @param {number=} offset Offset to read from. Will use and advance {@link ByteBuffer#offset} if omitted.
         * @returns {string|!{string: string, length: number}} The string read if offset is omitted, else the string
         *  read and the actual number of bytes read.
         * @expose
         * @throws {Error} If the length did not match or the string cannot be decoded
         */
        ByteBuffer.prototype.readUTF8StringBytes = function(length, offset) {
            var advance = typeof offset === 'undefined';
            offset = typeof offset !== 'undefined' ? offset : this.offset;
            var dec, result = "", start = offset;
            length = offset + length; // Limit
            while (offset < length) {
                dec = ByteBuffer.decodeUTF8Char(this, offset);
                offset += dec["length"];
                result += String.fromCharCode(dec["char"]);
            }
            if (offset != length) {
                throw(new Error("Actual string length differs from the specified: "+((offset>length ? "+" : "")+offset-length)+" bytes"));
            }
            if (advance) {
                this.offset = offset;
                return result;
            } else {
                return {
                    "string": result,
                    "length": offset-start
                }
            }
        };

        /**
         * Writes a string with prepended number of characters, which is also encoded as an UTF8 character..
         * @param {string} str String to write
         * @param {number=} offset Offset to write to. Will use and advance {@link ByteBuffer#offset} if omitted.
         * @returns {!ByteBuffer|number} this if offset is omitted, else the actual number of bytes written.
         * @expose
         */
        ByteBuffer.prototype.writeLString = function(str, offset) {
            str = ""+str;
            var advance = typeof offset === 'undefined';
            offset = typeof offset !== 'undefined' ? offset : this.offset;
            var encLen = ByteBuffer.encodeUTF8Char(str.length, this, offset);
            encLen += this.writeUTF8String(str, offset+encLen);
            if (advance) {
                this.offset += encLen;
                return this;
            } else {
                return encLen;
            }
        };

        /**
         * Reads a string with a prepended number of characters, which is also encoded as an UTF8 character.
         * @param {number=} offset Offset to read from. Will use and advance {@link ByteBuffer#offset} if omitted.
         * @returns {string|{string: string, length: number}} The string read if offset is omitted, else the string read
         *  and the actual number of bytes read.
         * @throws {Error} If the string cannot be decoded
         * @expose
         */
        ByteBuffer.prototype.readLString = function(offset) {
            var advance = typeof offset === 'undefined';
            offset = typeof offset !== 'undefined' ? offset : this.offset;
            var lenDec = ByteBuffer.decodeUTF8Char(this, offset),
                dec = this.readUTF8String(lenDec["char"], offset+lenDec["length"]);
            if (advance) {
                this.offset += lenDec["length"]+dec["length"];
                return dec["string"];
            } else {
                return {
                    "string": dec["string"],
                    "length": lenDec["length"]+dec["length"]
                };
            }
        };

        /**
         * Writes a string with prepended number of characters, which is encoded as a 32bit base 128 variable-length
         *  integer.
         * @param {string} str String to write
         * @param {number=} offset Offset to write to. Will use and advance {@link ByteBuffer#offset} if omitted.
         * @returns {!ByteBuffer|number} this if offset is omitted, else the actual number of bytes written
         * @expose
         */
        ByteBuffer.prototype.writeVString = function(str, offset) {
            str = ""+str;
            var advance = typeof offset === 'undefined';
            offset = typeof offset !== 'undefined' ? offset : this.offset;
            var encLen = this.writeVarint32(ByteBuffer.calculateUTF8String(str), offset);
            encLen += this.writeUTF8String(str, offset+encLen);
            if (advance) {
                this.offset += encLen;
                return this;
            } else {
                return encLen;
            }
        };

        /**
         * Reads a string with prepended number of characters, which is encoded as a 32bit base 128 variable-length 
         *  integer.
         * @param {number=} offset Offset to read from. Will use and advance {@link ByteBuffer#offset} if omitted.
         * @returns {string|!{string: string, length: number}} The string read if offset is omitted, else the string
         *  read and the actual number of bytes read.
         * @throws {Error} If the string cannot be decoded or if it is not preceeded by a valid varint
         * @expose
         */
        ByteBuffer.prototype.readVString = function(offset) {
            var advance = typeof offset === 'undefined';
            offset = typeof offset !== 'undefined' ? offset : this.offset;
            var lenDec = this.readVarint32(offset);
            var dec = this.readUTF8StringBytes(lenDec["value"], offset+lenDec["length"]);
            if (advance) {
                this.offset += lenDec["length"]+dec["length"];
                return dec["string"];
            } else {
                return {
                    "string": dec["string"],
                    "length": lenDec["length"]+dec["length"]
                };
            }
        };

        /**
         * Writes a string followed by a NULL character (Uint8). Beware: The source string must not contain NULL
         *  characters unless this is actually intended. This is not checked. If you have the option it is recommended
         *  to use {@link ByteBuffer#writeLString} or {@link ByteBuffer#writeVString} with the corresponding reading
         *  methods instead.
         * @param {string} str String to write
         * @param {number=} offset Offset to write to. Will use and advance {@link ByteBuffer#offset} if omitted.
         * @returns {!ByteBuffer|number} this if offset is omitted, else the actual number of bytes written
         * @expose
         */
        ByteBuffer.prototype.writeCString = function(str, offset) {
            str = ""+str;
            var advance = typeof offset === 'undefined';
            offset = typeof offset !== 'undefined' ? offset : this.offset;
            var encLen = this.writeUTF8String(str, offset);
            this.writeUint8(0, offset+encLen);
            if (advance) {
                this.offset += encLen+1;
                return this;
            } else {
                return encLen+1;
            }
        };

        /**
         * Reads a string followed by a NULL character (Uint8).
         * @param {number=} offset Offset to read from. Will use and advance {@link ByteBuffer#offset} if omitted.
         * @returns {string|!{string: string, length: number}} The string read if offset is omitted, else the string
         *  read and the actual number of bytes read.
         * @throws {Error} If the string cannot be decoded
         * @expose
         */
        ByteBuffer.prototype.readCString = function(offset) {
            var advance = typeof offset === 'undefined';
            offset = typeof offset !== 'undefined' ? offset : this.offset;
            var dec, result = "", start = offset;
            do {
                dec = ByteBuffer.decodeUTF8Char(this, offset);
                offset += dec["length"];
                if (dec["char"] != 0) result += String.fromCharCode(dec["char"]);
            } while (dec["char"] != 0);
            if (advance) {
                this.offset = offset;
                return result;
            } else {
                return {
                    "string": result,
                    "length": offset-start
                };
            }
        };

        /**
         * Serializes and writes a JSON payload.
         * @param {*} data Data payload to serialize
         * @param {number=} offset Offset to write to. Will use and advance {@link ByteBuffer#offset} if omitted.
         * @param {function(*)=} stringify Stringify implementation to use. Defaults to {@link JSON.stringify}.
         * @returns {!ByteBuffer|number} this if offset is omitted, else the actual number if bytes written
         * @expose
         */
        ByteBuffer.prototype.writeJSON = function(data, offset, stringify) {
            stringify = typeof stringify === 'function' ? stringify : JSON.stringify;
            return this.writeLString(stringify(data), offset);
        };

        /**
         * Reads a JSON payload and unserializes it.
         * @param {number=} offset Offset to read from. Will use and advance {@link ByteBuffer#offset} if omitted.
         * @param {function(string)=} parse Parse implementation to use. Defaults to {@link JSON.parse}.
         * @returns {!*|!{data: *, length: number}} Data payload if offset is omitted, else the data payload and the
         *  actual number of bytes read
         * @throws {Error} If the data cannot be decoded
         * @expose
         */
        ByteBuffer.prototype.readJSON = function(offset, parse) {
            parse = typeof parse === 'function' ? parse : JSON.parse;
            var result = this.readLString(offset);
            if (typeof result === 'string') {
                return parse(result);
            } else {
                return {
                    "data": parse(result["string"]),
                    "length":  result["length"]
                };
            }
        };

        /**
         * Returns a textual two columns (hex, ascii) representation of this ByteBuffer's backing array.
         * @param {number=} wrap Wrap length. Defaults to 16.
         * @returns {string} Hex representation as of " 00<01 02>03... ASCII DATA" with marked offsets
         * @expose
         */
        ByteBuffer.prototype.toColumns = function(wrap) {
            if (this.array === null) return "DESTROYED";
            wrap = typeof wrap !== 'undefined' ? parseInt(wrap, 10) : 16;
            if (wrap < 1) wrap = 16;

            // Left colum: hex with offsets
            var out = "",
                lines = [],
                val,
                view = this.view;
            if (this.offset == 0 && this.length == 0) {
                out += "|";
            } else if (this.length == 0) {
                out += ">";
            } else if (this.offset == 0) {
                out += "<";
            } else {
                out += " ";
            }
            for (var i=0, k=this.array.byteLength; i<k; ++i) {
                if (i>0 && i%wrap == 0) {
                    while (out.length < 3*wrap+1) out += "   "; // Make it equal to maybe show something on the right
                    lines.push(out);
                    out = " ";
                }
                val =  view.getUint8(i).toString(16).toUpperCase();
                if (val.length < 2) val = "0"+val;
                out += val;
                if (i+1 == this.offset && i+1 == this.length) {
                    out += "|";
                } else if (i+1 == this.offset) {
                    out += "<";
                } else if (i+1 == this.length) {
                    out += ">";
                } else {
                    out += " ";
                }
            }
            if (out != " ") {
                lines.push(out);
            }
            // Make it equal
            for (i=0, k=lines.length; i<k; ++i) {
                while (lines[i].length < 3*wrap+1) lines[i] += "   "; // Make it equal to maybe show something on the right
            }

            // Right column: ASCII, using dots for (usually) non-printable characters
            var n = 0;
            out = "";
            for (i=0, k=this.array.byteLength; i<k; ++i) {
                if (i>0 && i%wrap == 0) {
                    lines[n] += " "+out;
                    out = ""; n++;
                }
                val = view.getUint8(i);
                out += val > 32 && val < 127 ? String.fromCharCode(val) : ".";
            }
            if (out != "") {
                lines[n] += " "+out;
            }
            return lines.join("\n");
        };

        /**
         * Prints debug information about this ByteBuffer's contents.
         * @param {function(string)=} out Output function to call, defaults to console.log
         * @expose
         */
        ByteBuffer.prototype.printDebug = function(out) {
            if (typeof out !== 'function') out = console.log.bind(console);
            out(
                (this.array != null ? "ByteBuffer(offset="+this.offset+",markedOffset="+this.markedOffset+",length="+this.length+",capacity="+this.array.byteLength+")" : "ByteBuffer(DESTROYED)")+"\n"+
                    "-------------------------------------------------------------------\n"+
                    this.toColumns()+"\n"
            );
        };

        /**
         * Returns the ByteBuffer's contents between offset and length as a hex string.
         * @param {boolean=} debug `true` to return the entire backing array with marked offsets, defaults to `false`
         * @returns {string} Hex string or debug string
         * @expose
         */
        ByteBuffer.prototype.toHex = function(debug) {
            var out = "",
                val,
                view = this.view,
                i, k;
            if (!debug) {
                return ByteBuffer.encodeHex(this);
            } else {
                if (this.array === null) return "DESTROYED";
                if (this.offset == 0 && this.length == 0) {
                    out += "|";
                } else if (this.length == 0) {
                    out += ">";
                } else if (this.offset == 0) {
                    out += "<";
                } else {
                    out += " ";
                }
                for (i=0, k=this.array.byteLength; i<k; ++i) {
                    val =  view.getUint8(i).toString(16).toUpperCase();
                    if (val.length < 2) val = "0"+val;
                    out += val;
                    if (i+1 === this.offset && i+1 === this.length) {
                        out += "|";
                    } else if (i+1 == this.offset) {
                        out += "<";
                    } else if (i+1 == this.length) {
                        out += ">";
                    } else {
                        out += " ";
                    }
                }
                return out;
            }
        };

        /**
         * Returns the ByteBuffer's contents between offset and length as a binary string. A binary string in this case
         *  is a string composed of 8bit values as characters with a char code between 0 and 255 inclusive.
         * @returns {string} Binary string
         * @expose
         */
        ByteBuffer.prototype.toBinary = function() {
            return ByteBuffer.encodeBinary(this);
        };

        /**
         * Returns the base64 encoded representation of the ByteBuffer's contents.
         * @returns {string} Base 64 encoded string
         * @expose
         */
        ByteBuffer.prototype.toBase64 = function() {
            if (this.array === null || this.offset >= this.length) return "";
            return ByteBuffer.encode64(this);
        };

        /**
         * Returns the ByteBuffer's contents as an UTF8 encoded string.
         * @returns {string}
         * @expose
         */
        ByteBuffer.prototype.toUTF8 = function() {
            if (this.array === null || this.offset >= this.length) return "";
            return this.readUTF8StringBytes(this.length - this.offset, this.offset)["string"];
        };

        /**
         * Converts the ByteBuffer to a string.
         * @param {string=} enc Output encoding. Returns an informative string representation by default but also allows
         *  direct conversion to "utf8", "hex", "base64" and "binary" encoding. "debug" returns a hex representation with
         *  marked offsets.
         * @returns {string} String representation
         * @expose
         */
        ByteBuffer.prototype.toString = function(enc) {
            enc = enc || "";
            switch (enc) {
                case "utf8":
                    return this.toUTF8();
                case "base64":
                    return this.toBase64();
                case "hex":
                    return this.toHex();
                case "binary":
                    return this.toBinary();
                case "debug":
                    return this.toHex(true);
                default:
                    if (this.array === null) {
                        return "ByteBuffer(DESTROYED)";
                    }
                    return "ByteBuffer(offset="+this.offset+",markedOffset="+this.markedOffset+",length="+this.length+",capacity="+this.array.byteLength+")";
            }
        };

        /**
         * Returns an ArrayBuffer compacted to contain this ByteBuffer's actual contents. Will transparently
         *  {@link ByteBuffer#flip} the ByteBuffer if its offset is larger than its length. Will return a reference to
         *  the unmodified backing buffer if offset=0 and length=capacity unless forceCopy is set to true.
         * @param {boolean=} forceCopy `true` forces the creation of a copy, defaults to `false`
         * @returns {?ArrayBuffer} Compacted ArrayBuffer or null if already destroyed
         * @expose
         */
        ByteBuffer.prototype.toArrayBuffer = function(forceCopy) {
            if (this.array === null) return null;
            var b = this.clone();
            if (b.offset > b.length) {
                b.flip();
            }
            var copied = false;
            if (b.offset > 0 || b.length < b.array.byteLength) {
                b.compact(); // Will always create a new backing buffer because of the above condition
                copied = true;
            }
            return forceCopy && !copied ? b.copy().array : b.array;
        };
        
        // Available with node.js only
        if (Buffer) {
    
            /**
             * Returns a node Buffer compacted to contain this ByteBuffer's actual contents. Will transparently
             *  {@link ByteBuffer#flip} the ByteBuffer if its offset is larger than its length. Will also copy all data (not
             *  a reference).
             * @returns {?Buffer} Compacted node Buffer or null if already destroyed
             * @expose
             */
            ByteBuffer.prototype.toBuffer = function() {
                if (this.array === null) return null;
                var offset = this.offset, length = this.length;
                if (offset > length) {
                    var temp = offset;
                    offset = length;
                    length = temp;
                }
                return new Buffer(new Uint8Array(this.array).subarray(offset, length));
            };
            
        }

        return ByteBuffer;
    }
    
    // Enable module loading if available
    if (typeof module !== 'undefined' && module["exports"]) { // CommonJS
        module["exports"] = loadByteBuffer(_dereq_("long"));
    } else if (typeof define !== 'undefined' && define["amd"]) { // AMD
        define("ByteBuffer", ["Math/Long"], function(Long) { return loadByteBuffer(Long); });
    } else { // Shim
        if (!global["dcodeIO"]) global["dcodeIO"] = {};
        global["dcodeIO"]["ByteBuffer"] = loadByteBuffer(global["dcodeIO"]["Long"]);
    }

})(this);

},{"long":13}],12:[function(_dereq_,module,exports){
/*
 Copyright 2013 Daniel Wirtz <dcode@dcode.io>
 Copyright 2009 The Closure Library Authors. All Rights Reserved.

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS-IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
 */
/**
 * @license Long.js (c) 2013 Daniel Wirtz <dcode@dcode.io>
 * Released under the Apache License, Version 2.0
 * Derived from goog.math.Long from the Closure Library
 * see: https://github.com/dcodeIO/Long.js for details
 */
(function(global) {
    "use strict";

    /**
     * Constructs a 64-bit two's-complement integer, given its low and high 32-bit
     * values as *signed* integers.  See the from* functions below for more
     * convenient ways of constructing Longs.
     *
     * The internal representation of a long is the two given signed, 32-bit values.
     * We use 32-bit pieces because these are the size of integers on which
     * Javascript performs bit-operations.  For operations like addition and
     * multiplication, we split each number into 16-bit pieces, which can easily be
     * multiplied within Javascript's floating-point representation without overflow
     * or change in sign.
     *
     * In the algorithms below, we frequently reduce the negative case to the
     * positive case by negating the input(s) and then post-processing the result.
     * Note that we must ALWAYS check specially whether those values are MIN_VALUE
     * (-2^63) because -MIN_VALUE == MIN_VALUE (since 2^63 cannot be represented as
     * a positive number, it overflows back into a negative).  Not handling this
     * case would often result in infinite recursion.
     * 
     * @exports Long
     * @class A Long class for representing a 64-bit two's-complement integer value.
     * @param {number|!{low: number, high: number, unsigned: boolean}} low The low (signed) 32 bits of the long.
     *  Optionally accepts a Long-like object as the first parameter.
     * @param {number=} high The high (signed) 32 bits of the long.
     * @param {boolean=} unsigned Whether unsigned or not. Defaults to `false` (signed).
     * @constructor
     */
    var Long = function(low, high, unsigned) {
        if (low && typeof low === 'object') {
            high = low.high;
            unsigned = low.unsigned;
            low = low.low;
        }
        
        /**
         * The low 32 bits as a signed value.
         * @type {number}
         * @expose
         */
        this.low = low | 0;

        /**
         * The high 32 bits as a signed value.
         * @type {number}
         * @expose
         */
        this.high = high | 0;

        /**
         * Whether unsigned or not.
         * @type {boolean}
         * @expose
         */
        this.unsigned = !!unsigned;
    };

    // NOTE: Common constant values ZERO, ONE, NEG_ONE, etc. are defined below the from* methods on which they depend.

    // NOTE: The following cache variables are used internally only and are therefore not exposed as properties of the
    // Long class.
    
    /**
     * A cache of the Long representations of small integer values.
     * @type {!Object}
     */
    var INT_CACHE = {};

    /**
     * A cache of the Long representations of small unsigned integer values.
     * @type {!Object}
     */
    var UINT_CACHE = {};

    /**
     * Returns a Long representing the given (32-bit) integer value.
     * @param {number} value The 32-bit integer in question.
     * @param {boolean=} unsigned Whether unsigned or not. Defaults to false (signed).
     * @return {!Long} The corresponding Long value.
     * @expose
     */
    Long.fromInt = function(value, unsigned) {
        var obj, cachedObj;
        if (!unsigned) {
            value = value | 0;
            if (-128 <= value && value < 128) {
                cachedObj = INT_CACHE[value];
                if (cachedObj) return cachedObj;
            }
            obj = new Long(value, value < 0 ? -1 : 0, false);
            if (-128 <= value && value < 128) {
                INT_CACHE[value] = obj;
            }
            return obj;
        } else {
            value = value >>> 0;
            if (0 <= value && value < 256) {
                cachedObj = UINT_CACHE[value];
                if (cachedObj) return cachedObj;
            }
            obj = new Long(value, (value | 0) < 0 ? -1 : 0, true);
            if (0 <= value && value < 256) {
                UINT_CACHE[value] = obj;
            }
            return obj;
        }
    };

    /**
     * Returns a Long representing the given value, provided that it is a finite
     * number.  Otherwise, zero is returned.
     * @param {number} value The number in question.
     * @param {boolean=} unsigned Whether unsigned or not. Defaults to false (signed).
     * @return {!Long} The corresponding Long value.
     * @expose
     */
    Long.fromNumber = function(value, unsigned) {
        unsigned = !!unsigned;
        if (isNaN(value) || !isFinite(value)) {
            return Long.ZERO;
        } else if (!unsigned && value <= -TWO_PWR_63_DBL) {
            return Long.MIN_SIGNED_VALUE;
        } else if (!unsigned && value + 1 >= TWO_PWR_63_DBL) {
            return Long.MAX_SIGNED_VALUE;
        } else if (unsigned && value >= TWO_PWR_64_DBL) {
            return Long.MAX_UNSIGNED_VALUE;
        } else if (value < 0) {
            return Long.fromNumber(-value, unsigned).negate();
        } else {
            return new Long((value % TWO_PWR_32_DBL) | 0, (value / TWO_PWR_32_DBL) | 0, unsigned);
        }
    };

    /**
     * Returns a Long representing the 64bit integer that comes by concatenating the given low and high bits. Each is
     *  assumed to use 32 bits.
     * @param {number} lowBits The low 32 bits.
     * @param {number} highBits The high 32 bits.
     * @param {boolean=} unsigned Whether unsigned or not. Defaults to false (signed).
     * @return {!Long} The corresponding Long value.
     * @expose
     */
    Long.fromBits = function(lowBits, highBits, unsigned) {
        return new Long(lowBits, highBits, unsigned);
    };

    /**
     * Returns a Long representing the 64bit integer that comes by concatenating the given low, middle and high bits.
     * Each is assumed to use 28 bits.
     * @param {number} part0 The low 28 bits
     * @param {number} part1 The middle 28 bits
     * @param {number} part2 The high 28 (8) bits
     * @param {boolean=} unsigned Whether unsigned or not. Defaults to false (signed).
     * @return {!Long}
     * @expose
     */
    Long.from28Bits = function(part0, part1, part2, unsigned) {
        // 00000000000000000000000000001111 11111111111111111111111122222222 2222222222222
        // LLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLL HHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHH
        return Long.fromBits(part0 | (part1 << 28), (part1 >>> 4) | (part2) << 24, unsigned);
    };

    /**
     * Returns a Long representation of the given string, written using the given radix.
     * @param {string} str The textual representation of the Long.
     * @param {(boolean|number)=} unsigned Whether unsigned or not. Defaults to false (signed).
     * @param {number=} radix The radix in which the text is written.
     * @return {!Long} The corresponding Long value.
     * @expose
     */
    Long.fromString = function(str, unsigned, radix) {
        if (str.length === 0)
            throw Error('number format error: empty string');
        if (str === "NaN" || str === "Infinity" || str === "+Infinity" || str === "-Infinity")
            return Long.ZERO;
        if (typeof unsigned === 'number') { // For goog.math.Long compatibility
            radix = unsigned;
            unsigned = false;
        }
        radix = radix || 10;
        if (radix < 2 || 36 < radix)
            throw Error('radix out of range: ' + radix);

        var p;
        if ((p = str.indexOf('-')) > 0)
            throw Error('number format error: interior "-" character: ' + str);
        else if (p === 0)
            return Long.fromString(str.substring(1), unsigned, radix).negate();

        // Do several (8) digits each time through the loop, so as to
        // minimize the calls to the very expensive emulated div.
        var radixToPower = Long.fromNumber(Math.pow(radix, 8));

        var result = Long.ZERO;
        for (var i = 0; i < str.length; i += 8) {
            var size = Math.min(8, str.length - i);
            var value = parseInt(str.substring(i, i + size), radix);
            if (size < 8) {
                var power = Long.fromNumber(Math.pow(radix, size));
                result = result.multiply(power).add(Long.fromNumber(value));
            } else {
                result = result.multiply(radixToPower);
                result = result.add(Long.fromNumber(value));
            }
        }
        result.unsigned = unsigned;
        return result;
    };

    // NOTE: the compiler should inline these constant values below and then remove these variables, so there should be
    // no runtime penalty for these.
    
    // NOTE: The following constant values are used internally only and are therefore not exposed as properties of the
    // Long class.

    /**
     * @type {number}
     */
    var TWO_PWR_16_DBL = 1 << 16;

    /**
     * @type {number}
     */
    var TWO_PWR_24_DBL = 1 << 24;

    /**
     * @type {number}
     */
    var TWO_PWR_32_DBL = TWO_PWR_16_DBL * TWO_PWR_16_DBL;

    /**
     * @type {number}
     */
    var TWO_PWR_31_DBL = TWO_PWR_32_DBL / 2;

    /**
     * @type {number}
     */
    var TWO_PWR_48_DBL = TWO_PWR_32_DBL * TWO_PWR_16_DBL;

    /**
     * @type {number}
     */
    var TWO_PWR_64_DBL = TWO_PWR_32_DBL * TWO_PWR_32_DBL;

    /**
     * @type {number}
     */
    var TWO_PWR_63_DBL = TWO_PWR_64_DBL / 2;

    /**
     * @type {!Long}
     */
    var TWO_PWR_24 = Long.fromInt(1 << 24);

    /**
     * @type {!Long}
     * @expose
     */
    Long.ZERO = Long.fromInt(0);

    /**
     * @type {!Long}
     * @expose
     */
    Long.UZERO = Long.fromInt(0, true);

    /**
     * @type {!Long}
     * @expose
     */
    Long.ONE = Long.fromInt(1);

    /**
     * @type {!Long}
     * @expose
     */
    Long.UONE = Long.fromInt(1, true);

    /**
     * @type {!Long}
     * @expose
     */
    Long.NEG_ONE = Long.fromInt(-1);

    /**
     * @type {!Long}
     * @expose
     */
    Long.MAX_SIGNED_VALUE = Long.fromBits(0xFFFFFFFF | 0, 0x7FFFFFFF | 0, false);

    /**
     * @type {!Long}
     * @expose
     */
    Long.MAX_UNSIGNED_VALUE = Long.fromBits(0xFFFFFFFF | 0, 0xFFFFFFFF | 0, true);

    /**
     * Alias of {@link Long.MAX_SIGNED_VALUE} for goog.math.Long compatibility.
     * @type {!Long}
     * @expose
     */
    Long.MAX_VALUE = Long.MAX_SIGNED_VALUE;

    /**
     * @type {!Long}
     * @expose
     */
    Long.MIN_SIGNED_VALUE = Long.fromBits(0, 0x80000000 | 0, false);

    /**
     * @type {!Long}
     * @expose
     */
    Long.MIN_UNSIGNED_VALUE = Long.fromBits(0, 0, true);

    /**
     * Alias of {@link Long.MIN_SIGNED_VALUE}  for goog.math.Long compatibility.
     * @type {!Long}
     * @expose
     */
    Long.MIN_VALUE = Long.MIN_SIGNED_VALUE;

    /**
     * @return {number} The value, assuming it is a 32-bit integer.
     * @expose
     */
    Long.prototype.toInt = function() {
        return this.unsigned ? this.low >>> 0 : this.low;
    };

    /**
     * @return {number} The closest floating-point representation to this value.
     * @expose
     */
    Long.prototype.toNumber = function() {
        if (this.unsigned) {
            return ((this.high >>> 0) * TWO_PWR_32_DBL) + (this.low >>> 0);
        }
        return this.high * TWO_PWR_32_DBL + (this.low >>> 0);
    };

    /**
     * @param {number=} radix The radix in which the text should be written.
     * @return {string} The textual representation of this value.
     * @override
     * @expose
     */
    Long.prototype.toString = function(radix) {
        radix = radix || 10;
        if (radix < 2 || 36 < radix) {
            throw(new Error('radix out of range: ' + radix));
        }
        if (this.isZero()) {
            return '0';
        }
        var rem;
        if (this.isNegative()) { // Unsigned Longs are never negative
            if (this.equals(Long.MIN_SIGNED_VALUE)) {
                // We need to change the Long value before it can be negated, so we remove
                // the bottom-most digit in this base and then recurse to do the rest.
                var radixLong = Long.fromNumber(radix);
                var div = this.div(radixLong);
                rem = div.multiply(radixLong).subtract(this);
                return div.toString(radix) + rem.toInt().toString(radix);
            } else {
                return '-' + this.negate().toString(radix);
            }
        }

        // Do several (6) digits each time through the loop, so as to
        // minimize the calls to the very expensive emulated div.
        var radixToPower = Long.fromNumber(Math.pow(radix, 6), this.unsigned);
        rem = this;
        var result = '';
        while (true) {
            var remDiv = rem.div(radixToPower);
            var intval = rem.subtract(remDiv.multiply(radixToPower)).toInt() >>> 0;
            var digits = intval.toString(radix);
            rem = remDiv;
            if (rem.isZero()) {
                return digits + result;
            } else {
                while (digits.length < 6) {
                    digits = '0' + digits;
                }
                result = '' + digits + result;
            }
        }
    };

    /**
     * @return {number} The high 32 bits as a signed value.
     * @expose
     */
    Long.prototype.getHighBits = function() {
        return this.high;
    };

    /**
     * @return {number} The high 32 bits as an unsigned value.
     * @expose
     */
    Long.prototype.getHighBitsUnsigned = function() {
        return this.high >>> 0;
    };

    /**
     * @return {number} The low 32 bits as a signed value.
     * @expose
     */
    Long.prototype.getLowBits = function() {
        return this.low;
    };

    /**
     * @return {number} The low 32 bits as an unsigned value.
     * @expose
     */
    Long.prototype.getLowBitsUnsigned = function() {
        return this.low >>> 0;
    };

    /**
     * @return {number} Returns the number of bits needed to represent the absolute
     *     value of this Long.
     * @expose
     */
    Long.prototype.getNumBitsAbs = function() {
        if (this.isNegative()) { // Unsigned Longs are never negative
            if (this.equals(Long.MIN_SIGNED_VALUE)) {
                return 64;
            } else {
                return this.negate().getNumBitsAbs();
            }
        } else {
            var val = this.high != 0 ? this.high : this.low;
            for (var bit = 31; bit > 0; bit--) {
                if ((val & (1 << bit)) != 0) {
                    break;
                }
            }
            return this.high != 0 ? bit + 33 : bit + 1;
        }
    };

    /**
     * @return {boolean} Whether this value is zero.
     * @expose
     */
    Long.prototype.isZero = function() {
        return this.high == 0 && this.low == 0;
    };

    /**
     * @return {boolean} Whether this value is negative.
     * @expose
     */
    Long.prototype.isNegative = function() {
        return !this.unsigned && this.high < 0;
    };

    /**
     * @return {boolean} Whether this value is odd.
     * @expose
     */
    Long.prototype.isOdd = function() {
        return (this.low & 1) == 1;
    };

    /**
     * @return {boolean} Whether this value is even.
     */
    Long.prototype.isEven = function() {
        return (this.low & 1) == 0;
    };

    /**
     * @param {Long} other Long to compare against.
     * @return {boolean} Whether this Long equals the other.
     * @expose
     */
    Long.prototype.equals = function(other) {
        if (this.unsigned != other.unsigned && (this.high >>> 31) != (other.high >>> 31)) return false;
        return (this.high == other.high) && (this.low == other.low);
    };

    /**
     * @param {Long} other Long to compare against.
     * @return {boolean} Whether this Long does not equal the other.
     * @expose
     */
    Long.prototype.notEquals = function(other) {
        return !this.equals(other);
    };

    /**
     * @param {Long} other Long to compare against.
     * @return {boolean} Whether this Long is less than the other.
     * @expose
     */
    Long.prototype.lessThan = function(other) {
        return this.compare(other) < 0;
    };

    /**
     * @param {Long} other Long to compare against.
     * @return {boolean} Whether this Long is less than or equal to the other.
     * @expose
     */
    Long.prototype.lessThanOrEqual = function(other) {
        return this.compare(other) <= 0;
    };

    /**
     * @param {Long} other Long to compare against.
     * @return {boolean} Whether this Long is greater than the other.
     * @expose
     */
    Long.prototype.greaterThan = function(other) {
        return this.compare(other) > 0;
    };

    /**
     * @param {Long} other Long to compare against.
     * @return {boolean} Whether this Long is greater than or equal to the other.
     * @expose
     */
    Long.prototype.greaterThanOrEqual = function(other) {
        return this.compare(other) >= 0;
    };

    /**
     * Compares this Long with the given one.
     * @param {Long} other Long to compare against.
     * @return {number} 0 if they are the same, 1 if the this is greater, and -1
     *     if the given one is greater.
     * @expose
     */
    Long.prototype.compare = function(other) {
        if (this.equals(other)) {
            return 0;
        }
        var thisNeg = this.isNegative();
        var otherNeg = other.isNegative();
        if (thisNeg && !otherNeg) return -1;
        if (!thisNeg && otherNeg) return 1;
        if (!this.unsigned) {
            // At this point the signs are the same
            return this.subtract(other).isNegative() ? -1 : 1;
        } else {
            // Both are positive if at least one is unsigned
            return (other.high >>> 0) > (this.high >>> 0) || (other.high == this.high && (other.low >>> 0) > (this.low >>> 0)) ? -1 : 1;
        }
    };

    /**
     * @return {!Long} The negation of this value.
     * @expose
     */
    Long.prototype.negate = function() {
        if (!this.unsigned && this.equals(Long.MIN_SIGNED_VALUE)) {
            return Long.MIN_SIGNED_VALUE;
        }
        return this.not().add(Long.ONE);
    };

    /**
     * Returns the sum of this and the given Long.
     * @param {Long} other Long to add to this one.
     * @return {!Long} The sum of this and the given Long.
     * @expose
     */
    Long.prototype.add = function(other) {
        // Divide each number into 4 chunks of 16 bits, and then sum the chunks.
        
        var a48 = this.high >>> 16;
        var a32 = this.high & 0xFFFF;
        var a16 = this.low >>> 16;
        var a00 = this.low & 0xFFFF;

        var b48 = other.high >>> 16;
        var b32 = other.high & 0xFFFF;
        var b16 = other.low >>> 16;
        var b00 = other.low & 0xFFFF;

        var c48 = 0, c32 = 0, c16 = 0, c00 = 0;
        c00 += a00 + b00;
        c16 += c00 >>> 16;
        c00 &= 0xFFFF;
        c16 += a16 + b16;
        c32 += c16 >>> 16;
        c16 &= 0xFFFF;
        c32 += a32 + b32;
        c48 += c32 >>> 16;
        c32 &= 0xFFFF;
        c48 += a48 + b48;
        c48 &= 0xFFFF;
        return Long.fromBits((c16 << 16) | c00, (c48 << 16) | c32, this.unsigned);
    };

    /**
     * Returns the difference of this and the given Long.
     * @param {Long} other Long to subtract from this.
     * @return {!Long} The difference of this and the given Long.
     * @expose
     */
    Long.prototype.subtract = function(other) {
        return this.add(other.negate());
    };

    /**
     * Returns the product of this and the given long.
     * @param {Long} other Long to multiply with this.
     * @return {!Long} The product of this and the other.
     * @expose
     */
    Long.prototype.multiply = function(other) {
        if (this.isZero()) {
            return Long.ZERO;
        } else if (other.isZero()) {
            return Long.ZERO;
        }

        if (this.equals(Long.MIN_VALUE)) {
            return other.isOdd() ? Long.MIN_VALUE : Long.ZERO;
        } else if (other.equals(Long.MIN_VALUE)) {
            return this.isOdd() ? Long.MIN_VALUE : Long.ZERO;
        }

        if (this.isNegative()) {
            if (other.isNegative()) {
                return this.negate().multiply(other.negate());
            } else {
                return this.negate().multiply(other).negate();
            }
        } else if (other.isNegative()) {
            return this.multiply(other.negate()).negate();
        }
        // If both longs are small, use float multiplication
        if (this.lessThan(TWO_PWR_24) &&
            other.lessThan(TWO_PWR_24)) {
            return Long.fromNumber(this.toNumber() * other.toNumber(), this.unsigned);
        }

        // Divide each long into 4 chunks of 16 bits, and then add up 4x4 products.
        // We can skip products that would overflow.
        
        var a48 = this.high >>> 16;
        var a32 = this.high & 0xFFFF;
        var a16 = this.low >>> 16;
        var a00 = this.low & 0xFFFF;

        var b48 = other.high >>> 16;
        var b32 = other.high & 0xFFFF;
        var b16 = other.low >>> 16;
        var b00 = other.low & 0xFFFF;

        var c48 = 0, c32 = 0, c16 = 0, c00 = 0;
        c00 += a00 * b00;
        c16 += c00 >>> 16;
        c00 &= 0xFFFF;
        c16 += a16 * b00;
        c32 += c16 >>> 16;
        c16 &= 0xFFFF;
        c16 += a00 * b16;
        c32 += c16 >>> 16;
        c16 &= 0xFFFF;
        c32 += a32 * b00;
        c48 += c32 >>> 16;
        c32 &= 0xFFFF;
        c32 += a16 * b16;
        c48 += c32 >>> 16;
        c32 &= 0xFFFF;
        c32 += a00 * b32;
        c48 += c32 >>> 16;
        c32 &= 0xFFFF;
        c48 += a48 * b00 + a32 * b16 + a16 * b32 + a00 * b48;
        c48 &= 0xFFFF;
        return Long.fromBits((c16 << 16) | c00, (c48 << 16) | c32, this.unsigned);
    };

    /**
     * Returns this Long divided by the given one.
     * @param {Long} other Long by which to divide.
     * @return {!Long} This Long divided by the given one.
     * @expose
     */
    Long.prototype.div = function(other) {
        if (other.isZero()) {
            throw(new Error('division by zero'));
        } else if (this.isZero()) {
            return this.unsigned ? Long.UZERO : Long.ZERO;
        }
        var approx, rem, res;
        if (this.equals(Long.MIN_SIGNED_VALUE)) {
            if (other.equals(Long.ONE) || other.equals(Long.NEG_ONE)) {
                return Long.MIN_SIGNED_VALUE;  // recall that -MIN_VALUE == MIN_VALUE
            } else if (other.equals(Long.MIN_SIGNED_VALUE)) {
                return Long.ONE;
            } else {
                // At this point, we have |other| >= 2, so |this/other| < |MIN_VALUE|.
                var halfThis = this.shiftRight(1);
                approx = halfThis.div(other).shiftLeft(1);
                if (approx.equals(Long.ZERO)) {
                    return other.isNegative() ? Long.ONE : Long.NEG_ONE;
                } else {
                    rem = this.subtract(other.multiply(approx));
                    res = approx.add(rem.div(other));
                    return res;
                }
            }
        } else if (other.equals(Long.MIN_SIGNED_VALUE)) {
            return this.unsigned ? Long.UZERO : Long.ZERO;
        }
        if (this.isNegative()) {
            if (other.isNegative()) {
                return this.negate().div(other.negate());
            } else {
                return this.negate().div(other).negate();
            }
        } else if (other.isNegative()) {
            return this.div(other.negate()).negate();
        }
        
        // Repeat the following until the remainder is less than other:  find a
        // floating-point that approximates remainder / other *from below*, add this
        // into the result, and subtract it from the remainder.  It is critical that
        // the approximate value is less than or equal to the real value so that the
        // remainder never becomes negative.
        res = Long.ZERO;
        rem = this;
        while (rem.greaterThanOrEqual(other)) {
            // Approximate the result of division. This may be a little greater or
            // smaller than the actual value.
            approx = Math.max(1, Math.floor(rem.toNumber() / other.toNumber()));

            // We will tweak the approximate result by changing it in the 48-th digit or
            // the smallest non-fractional digit, whichever is larger.
            var log2 = Math.ceil(Math.log(approx) / Math.LN2);
            var delta = (log2 <= 48) ? 1 : Math.pow(2, log2 - 48);

            // Decrease the approximation until it is smaller than the remainder.  Note
            // that if it is too large, the product overflows and is negative.
            var approxRes = Long.fromNumber(approx);
            var approxRem = approxRes.multiply(other);
            while (approxRem.isNegative() || approxRem.greaterThan(rem)) {
                approx -= delta;
                approxRes = Long.fromNumber(approx, this.unsigned);
                approxRem = approxRes.multiply(other);
            }

            // We know the answer can't be zero... and actually, zero would cause
            // infinite recursion since we would make no progress.
            if (approxRes.isZero()) {
                approxRes = Long.ONE;
            }

            res = res.add(approxRes);
            rem = rem.subtract(approxRem);
        }
        return res;
    };

    /**
     * Returns this Long modulo the given one.
     * @param {Long} other Long by which to mod.
     * @return {!Long} This Long modulo the given one.
     * @expose
     */
    Long.prototype.modulo = function(other) {
        return this.subtract(this.div(other).multiply(other));
    };

    /**
     * @return {!Long} The bitwise-NOT of this value.
     * @expose
     */
    Long.prototype.not = function() {
        return Long.fromBits(~this.low, ~this.high, this.unsigned);
    };

    /**
     * Returns the bitwise-AND of this Long and the given one.
     * @param {Long} other The Long with which to AND.
     * @return {!Long} The bitwise-AND of this and the other.
     * @expose
     */
    Long.prototype.and = function(other) {
        return Long.fromBits(this.low & other.low, this.high & other.high, this.unsigned);
    };

    /**
     * Returns the bitwise-OR of this Long and the given one.
     * @param {Long} other The Long with which to OR.
     * @return {!Long} The bitwise-OR of this and the other.
     * @expose
     */
    Long.prototype.or = function(other) {
        return Long.fromBits(this.low | other.low, this.high | other.high, this.unsigned);
    };

    /**
     * Returns the bitwise-XOR of this Long and the given one.
     * @param {Long} other The Long with which to XOR.
     * @return {!Long} The bitwise-XOR of this and the other.
     * @expose
     */
    Long.prototype.xor = function(other) {
        return Long.fromBits(this.low ^ other.low, this.high ^ other.high, this.unsigned);
    };

    /**
     * Returns this Long with bits shifted to the left by the given amount.
     * @param {number} numBits The number of bits by which to shift.
     * @return {!Long} This shifted to the left by the given amount.
     * @expose
     */
    Long.prototype.shiftLeft = function(numBits) {
        if ((numBits &= 63) === 0)
            return this;
        else if (numBits < 32)
            return Long.fromBits(this.low << numBits, (this.high << numBits) | (this.low >>> (32 - numBits)), this.unsigned);
        else
            return Long.fromBits(0, this.low << (numBits - 32), this.unsigned);
    };

    /**
     * Returns this Long with bits shifted to the right by the given amount.
     * @param {number} numBits The number of bits by which to shift.
     * @return {!Long} This shifted to the right by the given amount.
     * @expose
     */
    Long.prototype.shiftRight = function(numBits) {
        if ((numBits &= 63) === 0)
            return this;
        else if (numBits < 32)
            return Long.fromBits((this.low >>> numBits) | (this.high << (32 - numBits)), this.high >> numBits, this.unsigned);
        else
            return Long.fromBits(this.high >> (numBits - 32), this.high >= 0 ? 0 : -1, this.unsigned);
    };

    /**
     * Returns this Long with bits shifted to the right by the given amount, with
     * the new top bits matching the current sign bit.
     * @param {number} numBits The number of bits by which to shift.
     * @return {!Long} This shifted to the right by the given amount, with
     *     zeros placed into the new leading bits.
     * @expose
     */
    Long.prototype.shiftRightUnsigned = function(numBits) {
        numBits &= 63;
        if (numBits == 0) {
            return this;
        } else {
            var high = this.high;
            if (numBits < 32) {
                var low = this.low;
                return Long.fromBits((low >>> numBits) | (high << (32 - numBits)), high >>> numBits, this.unsigned);
            } else if (numBits == 32) {
                return Long.fromBits(high, 0, this.unsigned);
            } else {
                return Long.fromBits(high >>> (numBits - 32), 0, this.unsigned);
            }
        }
    };

    /**
     * @return {!Long} Signed long
     * @expose
     */
    Long.prototype.toSigned = function() {
        var l = this.clone();
        l.unsigned = false;
        return l;
    };

    /**
     * @return {!Long} Unsigned long
     * @expose
     */
    Long.prototype.toUnsigned = function() {
        var l = this.clone();
        l.unsigned = true;
        return l;
    };
    
    /**
     * @return {Long} Cloned instance with the same low/high bits and unsigned flag.
     * @expose
     */
    Long.prototype.clone = function() {
        return new Long(this.low, this.high, this.unsigned);
    };

    // Enable module loading if available
    if (typeof module != 'undefined' && module["exports"]) { // CommonJS
        module["exports"] = Long;
    } else if (typeof define != 'undefined' && define["amd"]) { // AMD
        define("Math/Long", [], function() { return Long; });
    } else { // Shim
        if (!global["dcodeIO"]) {
            global["dcodeIO"] = {};
        }
        global["dcodeIO"]["Long"] = Long;
    }

})(this);

},{}],13:[function(_dereq_,module,exports){
/*
 Copyright 2013 Daniel Wirtz <dcode@dcode.io>
 Copyright 2009 The Closure Library Authors. All Rights Reserved.

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS-IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
 */

module.exports = _dereq_("./dist/Long.js");

},{"./dist/Long.js":12}],14:[function(_dereq_,module,exports){
/** @license zlib.js 2012 - imaya [ https://github.com/imaya/zlib.js ] The MIT License */(function() {'use strict';var m=this;function q(c,d){var a=c.split("."),b=m;!(a[0]in b)&&b.execScript&&b.execScript("var "+a[0]);for(var e;a.length&&(e=a.shift());)!a.length&&void 0!==d?b[e]=d:b=b[e]?b[e]:b[e]={}};var s="undefined"!==typeof Uint8Array&&"undefined"!==typeof Uint16Array&&"undefined"!==typeof Uint32Array&&"undefined"!==typeof DataView;function t(c){var d=c.length,a=0,b=Number.POSITIVE_INFINITY,e,f,g,h,k,l,p,n,r;for(n=0;n<d;++n)c[n]>a&&(a=c[n]),c[n]<b&&(b=c[n]);e=1<<a;f=new (s?Uint32Array:Array)(e);g=1;h=0;for(k=2;g<=a;){for(n=0;n<d;++n)if(c[n]===g){l=0;p=h;for(r=0;r<g;++r)l=l<<1|p&1,p>>=1;for(r=l;r<e;r+=k)f[r]=g<<16|n;++h}++g;h<<=1;k<<=1}return[f,a,b]};function u(c,d){this.g=[];this.h=32768;this.d=this.f=this.a=this.l=0;this.input=s?new Uint8Array(c):c;this.m=!1;this.i=v;this.r=!1;if(d||!(d={}))d.index&&(this.a=d.index),d.bufferSize&&(this.h=d.bufferSize),d.bufferType&&(this.i=d.bufferType),d.resize&&(this.r=d.resize);switch(this.i){case w:this.b=32768;this.c=new (s?Uint8Array:Array)(32768+this.h+258);break;case v:this.b=0;this.c=new (s?Uint8Array:Array)(this.h);this.e=this.z;this.n=this.v;this.j=this.w;break;default:throw Error("invalid inflate mode");
}}var w=0,v=1,x={t:w,s:v};
u.prototype.k=function(){for(;!this.m;){var c=y(this,3);c&1&&(this.m=!0);c>>>=1;switch(c){case 0:var d=this.input,a=this.a,b=this.c,e=this.b,f=d.length,g=void 0,h=void 0,k=b.length,l=void 0;this.d=this.f=0;if(a+1>=f)throw Error("invalid uncompressed block header: LEN");g=d[a++]|d[a++]<<8;if(a+1>=f)throw Error("invalid uncompressed block header: NLEN");h=d[a++]|d[a++]<<8;if(g===~h)throw Error("invalid uncompressed block header: length verify");if(a+g>d.length)throw Error("input buffer is broken");switch(this.i){case w:for(;e+
g>b.length;){l=k-e;g-=l;if(s)b.set(d.subarray(a,a+l),e),e+=l,a+=l;else for(;l--;)b[e++]=d[a++];this.b=e;b=this.e();e=this.b}break;case v:for(;e+g>b.length;)b=this.e({p:2});break;default:throw Error("invalid inflate mode");}if(s)b.set(d.subarray(a,a+g),e),e+=g,a+=g;else for(;g--;)b[e++]=d[a++];this.a=a;this.b=e;this.c=b;break;case 1:this.j(z,A);break;case 2:B(this);break;default:throw Error("unknown BTYPE: "+c);}}return this.n()};
var C=[16,17,18,0,8,7,9,6,10,5,11,4,12,3,13,2,14,1,15],D=s?new Uint16Array(C):C,E=[3,4,5,6,7,8,9,10,11,13,15,17,19,23,27,31,35,43,51,59,67,83,99,115,131,163,195,227,258,258,258],F=s?new Uint16Array(E):E,G=[0,0,0,0,0,0,0,0,1,1,1,1,2,2,2,2,3,3,3,3,4,4,4,4,5,5,5,5,0,0,0],H=s?new Uint8Array(G):G,I=[1,2,3,4,5,7,9,13,17,25,33,49,65,97,129,193,257,385,513,769,1025,1537,2049,3073,4097,6145,8193,12289,16385,24577],J=s?new Uint16Array(I):I,K=[0,0,0,0,1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,11,11,12,12,13,
13],L=s?new Uint8Array(K):K,M=new (s?Uint8Array:Array)(288),N,O;N=0;for(O=M.length;N<O;++N)M[N]=143>=N?8:255>=N?9:279>=N?7:8;var z=t(M),P=new (s?Uint8Array:Array)(30),Q,R;Q=0;for(R=P.length;Q<R;++Q)P[Q]=5;var A=t(P);function y(c,d){for(var a=c.f,b=c.d,e=c.input,f=c.a,g=e.length,h;b<d;){if(f>=g)throw Error("input buffer is broken");a|=e[f++]<<b;b+=8}h=a&(1<<d)-1;c.f=a>>>d;c.d=b-d;c.a=f;return h}
function S(c,d){for(var a=c.f,b=c.d,e=c.input,f=c.a,g=e.length,h=d[0],k=d[1],l,p;b<k&&!(f>=g);)a|=e[f++]<<b,b+=8;l=h[a&(1<<k)-1];p=l>>>16;c.f=a>>p;c.d=b-p;c.a=f;return l&65535}
function B(c){function d(a,c,b){var d,e,f,g;for(g=0;g<a;)switch(d=S(this,c),d){case 16:for(f=3+y(this,2);f--;)b[g++]=e;break;case 17:for(f=3+y(this,3);f--;)b[g++]=0;e=0;break;case 18:for(f=11+y(this,7);f--;)b[g++]=0;e=0;break;default:e=b[g++]=d}return b}var a=y(c,5)+257,b=y(c,5)+1,e=y(c,4)+4,f=new (s?Uint8Array:Array)(D.length),g,h,k,l;for(l=0;l<e;++l)f[D[l]]=y(c,3);if(!s){l=e;for(e=f.length;l<e;++l)f[D[l]]=0}g=t(f);h=new (s?Uint8Array:Array)(a);k=new (s?Uint8Array:Array)(b);c.j(t(d.call(c,a,g,h)),
t(d.call(c,b,g,k)))}u.prototype.j=function(c,d){var a=this.c,b=this.b;this.o=c;for(var e=a.length-258,f,g,h,k;256!==(f=S(this,c));)if(256>f)b>=e&&(this.b=b,a=this.e(),b=this.b),a[b++]=f;else{g=f-257;k=F[g];0<H[g]&&(k+=y(this,H[g]));f=S(this,d);h=J[f];0<L[f]&&(h+=y(this,L[f]));b>=e&&(this.b=b,a=this.e(),b=this.b);for(;k--;)a[b]=a[b++-h]}for(;8<=this.d;)this.d-=8,this.a--;this.b=b};
u.prototype.w=function(c,d){var a=this.c,b=this.b;this.o=c;for(var e=a.length,f,g,h,k;256!==(f=S(this,c));)if(256>f)b>=e&&(a=this.e(),e=a.length),a[b++]=f;else{g=f-257;k=F[g];0<H[g]&&(k+=y(this,H[g]));f=S(this,d);h=J[f];0<L[f]&&(h+=y(this,L[f]));b+k>e&&(a=this.e(),e=a.length);for(;k--;)a[b]=a[b++-h]}for(;8<=this.d;)this.d-=8,this.a--;this.b=b};
u.prototype.e=function(){var c=new (s?Uint8Array:Array)(this.b-32768),d=this.b-32768,a,b,e=this.c;if(s)c.set(e.subarray(32768,c.length));else{a=0;for(b=c.length;a<b;++a)c[a]=e[a+32768]}this.g.push(c);this.l+=c.length;if(s)e.set(e.subarray(d,d+32768));else for(a=0;32768>a;++a)e[a]=e[d+a];this.b=32768;return e};
u.prototype.z=function(c){var d,a=this.input.length/this.a+1|0,b,e,f,g=this.input,h=this.c;c&&("number"===typeof c.p&&(a=c.p),"number"===typeof c.u&&(a+=c.u));2>a?(b=(g.length-this.a)/this.o[2],f=258*(b/2)|0,e=f<h.length?h.length+f:h.length<<1):e=h.length*a;s?(d=new Uint8Array(e),d.set(h)):d=h;return this.c=d};
u.prototype.n=function(){var c=0,d=this.c,a=this.g,b,e=new (s?Uint8Array:Array)(this.l+(this.b-32768)),f,g,h,k;if(0===a.length)return s?this.c.subarray(32768,this.b):this.c.slice(32768,this.b);f=0;for(g=a.length;f<g;++f){b=a[f];h=0;for(k=b.length;h<k;++h)e[c++]=b[h]}f=32768;for(g=this.b;f<g;++f)e[c++]=d[f];this.g=[];return this.buffer=e};
u.prototype.v=function(){var c,d=this.b;s?this.r?(c=new Uint8Array(d),c.set(this.c.subarray(0,d))):c=this.c.subarray(0,d):(this.c.length>d&&(this.c.length=d),c=this.c);return this.buffer=c};function T(c,d){var a,b;this.input=c;this.a=0;if(d||!(d={}))d.index&&(this.a=d.index),d.verify&&(this.A=d.verify);a=c[this.a++];b=c[this.a++];switch(a&15){case U:this.method=U;break;default:throw Error("unsupported compression method");}if(0!==((a<<8)+b)%31)throw Error("invalid fcheck flag:"+((a<<8)+b)%31);if(b&32)throw Error("fdict flag is not supported");this.q=new u(c,{index:this.a,bufferSize:d.bufferSize,bufferType:d.bufferType,resize:d.resize})}
T.prototype.k=function(){var c=this.input,d,a;d=this.q.k();this.a=this.q.a;if(this.A){a=(c[this.a++]<<24|c[this.a++]<<16|c[this.a++]<<8|c[this.a++])>>>0;var b=d;if("string"===typeof b){var e=b.split(""),f,g;f=0;for(g=e.length;f<g;f++)e[f]=(e[f].charCodeAt(0)&255)>>>0;b=e}for(var h=1,k=0,l=b.length,p,n=0;0<l;){p=1024<l?1024:l;l-=p;do h+=b[n++],k+=h;while(--p);h%=65521;k%=65521}if(a!==(k<<16|h)>>>0)throw Error("invalid adler-32 checksum");}return d};var U=8;q("Zlib.Inflate",T);q("Zlib.Inflate.prototype.decompress",T.prototype.k);var V={ADAPTIVE:x.s,BLOCK:x.t},W,X,Y,Z;if(Object.keys)W=Object.keys(V);else for(X in W=[],Y=0,V)W[Y++]=X;Y=0;for(Z=W.length;Y<Z;++Y)X=W[Y],q("Zlib.Inflate.BufferType."+X,V[X]);}).call(this); //@ sourceMappingURL=inflate.min.js.map

},{}],15:[function(_dereq_,module,exports){
// shim for using process in browser

var process = module.exports = {};

process.nextTick = (function () {
    var canSetImmediate = typeof window !== 'undefined'
    && window.setImmediate;
    var canPost = typeof window !== 'undefined'
    && window.postMessage && window.addEventListener
    ;

    if (canSetImmediate) {
        return function (f) { return window.setImmediate(f) };
    }

    if (canPost) {
        var queue = [];
        window.addEventListener('message', function (ev) {
            var source = ev.source;
            if ((source === window || source === null) && ev.data === 'process-tick') {
                ev.stopPropagation();
                if (queue.length > 0) {
                    var fn = queue.shift();
                    fn();
                }
            }
        }, true);

        return function nextTick(fn) {
            queue.push(fn);
            window.postMessage('process-tick', '*');
        };
    }

    return function nextTick(fn) {
        setTimeout(fn, 0);
    };
})();

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
}

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};

},{}]},{},[7])
(7)
});