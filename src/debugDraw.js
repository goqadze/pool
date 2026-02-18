var color = new Box2D.b2Color;
var trans;

function drawAxes(ctx) {
    ctx.strokeStyle = 'rgb(192,0,0)';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(1, 0);
    ctx.stroke();
    ctx.strokeStyle = 'rgb(0,192,0)';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, 1);
    ctx.stroke();
}

function setColorFromDebugDraw(color) {
   // var col = Box2D.wrapPointer(color, Box2D.b2Color);
    var red = color.get_r() | 0;
    var green = color.get_g() | 0;
    var blue = color.get_b() | 0;
    var colStr = red + "," + green + "," + blue;
    context.fillStyle = "rgba(" + colStr + ", 0.5)";
    context.strokeStyle = "rgb(" + colStr + ")";
}

function drawSegment(vert1, vert2) {
    var v1 = vertMTP(vert1);
    var v2 = vertMTP(vert2);
    context.beginPath();
    context.moveTo(v1.x, v1.y);
    context.lineTo(v2.x, v2.y);
    context.stroke();
}

function drawPolygon(vertices, position, angle, fill) {
    context.beginPath();
    var pos = vertMTP(position);
    for(var i = 0; i < vertices.length; i++) {
        var v = vertMTP(vertices[i]);
        var vert = rotateVector(v.x, v.y, angle);

        vert.x += pos.x;
        vert.y += pos.y;

        if ( i == 0 )
            context.moveTo(vert.x, vert.y);
        else
            context.lineTo(vert.x, vert.y);
    }
    context.closePath();
    if (fill)
        context.fill();
    context.stroke();
}

function drawCircle(center, radius, fill) {
    var c = vertMTP(center);
    context.beginPath();
    context.arc(c.x, c.y, radius, 0, 2 * Math.PI, false);
    if (fill)
        context.fill();
    context.stroke();
}

function drawTransform(transform) {
    trans = Box2D.wrapPointer(transform,Box2D.b2Transform);
    var pos = trans.get_p();
    var rot = trans.get_q();

    context.save();
    context.translate(pos.get_x(), pos.get_y());
    context.scale(0.5,0.5);
    context.rotate(rot.GetAngle());
    context.lineWidth *= 2;
    drawAxes(context);
    context.restore();
}

function drawDebugData(game) {
    if (false) {
        setColorFromDebugDraw(getColor(color, 67, 149, 176));
        for (var i = 0; i < game.pockets.length; i++) {
            var body = game.pockets[i].body;
            var radius = (i <= 3) ? game.pocketParam.left.radius : game.pocketParam.middle.radius;
            drawCircle(body.GetPosition(), radius, true);
        }
    }

    if (false) {
        setColorFromDebugDraw(getColor(color, 0, 192, 0));
        for (var i = 0; i < game.border.vertices.length - 1; i++) {
            var vert1 = game.border.vertices[i];
            var vert2 = game.border.vertices[i + 1];
            drawSegment(vert1, vert2);
        }
    }

    if (false) {
        setColorFromDebugDraw(getColor(color, 162, 36, 36));
        for (var i = 0; i < game.borderForRaycast.vertices.length - 1; i++) {
            var vert1 = game.borderForRaycast.vertices[i];
            var vert2 = game.borderForRaycast.vertices[i + 1];
            drawSegment(vert1, vert2);
        }
    }

    if (false && game.whiteBall.visible) {
        setColorFromDebugDraw(getColor(color, 255, 255, 255));
        drawCircle(game.whiteBall.body.GetPosition(), game.radius, true);
    }

    if (false){ // spin ball
        setColorFromDebugDraw(getColor(color, 255, 255, 255));
        drawCircle(b2V2(game.whiteSpinBall.centerX, game.whiteSpinBall.centerY ), game.whiteSpinBall.radius, true);
        setColorFromDebugDraw(getColor(color, 255, 0, 0));
        drawCircle(b2V2(game.whiteSpinBall.spinCenterX, game.whiteSpinBall.spinCenterY ), game.whiteSpinBall.spinRadius, true);
    }

    if (false) {
        setColorFromDebugDraw(getColor(color, 32, 20, 32));
        for (var i = 1; i < game.balls.length; i++) {
            var ball = game.balls[i];
            if (ball.visible == false)
                continue;
            var body = ball.body;
            drawCircle(body.GetPosition(), game.radius, true);
        }
    }

    if (false && game.cue.body.IsActive()) {
        setColorFromDebugDraw(getColor(color, 111, 113, 44));
        drawPolygon(game.cue.vertices, game.cue.body.GetPosition(), game.cue.body.GetAngle(), true);
    }

    //ray casts
    if(false && !game.hitParam.hitted)
    {
        setColorFromDebugDraw(getColor(color, 255, 255, 255));
        var ray = game.rayCastParam.ray;
        drawSegment(ray.startPoint, ray.endPoint);
        drawCircle(ray.endPoint, game.radius, false);

        var whiteray = game.rayCastParam.whiteRay;
        var ballray = game.rayCastParam.ballRay;
        if (game.rayCastParam.hitBall){
            drawSegment(whiteray.startPoint, whiteray.endPoint);
            drawSegment(ballray.startPoint, ballray.endPoint);
        }
    }
}

function getColor(col, r, g, b){
    col.set_r(r);
    col.set_g(g);
    col.set_b(b);
    return color;
}

function vertMTP(p){
    return {
        x : p.get_x(),
        y : p.get_y()
    };
}