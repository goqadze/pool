function using(ns, pattern) {
    if (pattern == undefined) {
        // import all
        for (var name in ns) {
            this[name] = ns[name];
        }
    } else {
        if (typeof(pattern) == 'string') {
            pattern = new RegExp(pattern);
        }
        // import only stuff matching given pattern
        for (var name in ns) {
            if (name.match(pattern)) {
                this[name] = ns[name];
            }
        }
    }
}

var tempB2Vec2 = new Box2D.b2Vec2(0, 0);
function b2V2(x, y){
    tempB2Vec2.set_x(x);
    tempB2Vec2.set_y(y);
    return tempB2Vec2;
}

function copyb2V2(ret, vec){
    ret.set_x(vec.get_x());
    ret.set_y(vec.get_y());
    return ret;
}

function destroyAll(arr){
    for (var i = 0; i < arr.length; i ++)
        Box2D.destroy(arr[i]);
}

function rotateVector(tx, ty, angle){
    return {
        x : tx * Math.cos(angle) - ty * Math.sin(angle),
        y : tx * Math.sin(angle) + ty * Math.cos(angle)
    };
}

function vecLength(tx, ty){
    return Math.sqrt(tx * tx + ty * ty);
}

function getPixelPointFromWorldPoint(x, y){
    return {
        x : x * PTM + canvasOffset.x,
        y : canvas.height - (y * PTM + canvasOffset.y)
    }
}

function createChainShape(vertices, closedLoop) {
    var shape = new Box2D.b2ChainShape();
    var buffer = Box2D.allocate(vertices.length * 8, 'float', Box2D.ALLOC_STACK);
    var offset = 0;
    for (var i = 0; i < vertices.length; i++) {
        Box2D.setValue(buffer+(offset), vertices[i].get_x(), 'float'); // x
        Box2D.setValue(buffer+(offset+4), vertices[i].get_y(), 'float'); // y
        offset += 8;
    }
    var ptr_wrapped = Box2D.wrapPointer(buffer, Box2D.b2Vec2);
    if ( closedLoop )
        shape.CreateLoop(ptr_wrapped, vertices.length);
    else
        shape.CreateChain(ptr_wrapped, vertices.length);
    return shape;
}

function createPolygonShape(vertices) {
    var shape = new Box2D.b2PolygonShape();
    var buffer = Box2D.allocate(vertices.length * 8, 'float', Box2D.ALLOC_STACK);
    var offset = 0;
    for (var i=0; i < vertices.length; i++) {
        Box2D.setValue(buffer+(offset), vertices[i].get_x(), 'float'); // x
        Box2D.setValue(buffer+(offset+4), vertices[i].get_y(), 'float'); // y
        offset += 8;
    }
    var ptr_wrapped = Box2D.wrapPointer(buffer, Box2D.b2Vec2);
    shape.Set(ptr_wrapped, vertices.length);

    return shape;
}

function createRandomPolygonShape(radius) {
    var numVerts = 3.5 + Math.random() * 5;
    numVerts = numVerts | 0;
    var verts = [];
    for (var i = 0; i < numVerts; i++) {
        var angle = i / numVerts * 360.0 * 0.0174532925199432957;
        verts.push( new b2Vec2( radius * Math.sin(angle), radius * -Math.cos(angle) ) );
    }
    return createPolygonShape(verts);
}

/*
function getPolygonVertices(body){
    var shape = Box2D.castObject(body.GetFixtureList().GetShape(), Box2D.b2PolygonShape);
    var verts = [];
    for (var i = 0; i < shape.GetVertexCount(); i ++){
        verts.push(shape.GetVertex(i));
    }
    return verts;
}
*/
