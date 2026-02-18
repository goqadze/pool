var Container = PIXI.Container,
    autoDetectRenderer = PIXI.autoDetectRenderer,
    loader = PIXI.loader,
    resources = PIXI.loader.resources,
    TextureCache = PIXI.utils.TextureCache,
    Texture = PIXI.Texture,
    Sprite = PIXI.Sprite;

var stage = new Container(),
    renderer = null,
    gl = null;
var pixiSetupFinished = false;

var tablePath = "images/table.png";
var kiiPath = "images/kii_1.png";
var whitePath = "images/White_ball_20.png";
var ball3Path = "images/Ball_3_20.png";
var ball8Path = "images/Ball_8_20.png";
var bigWhiteBallPath = "images/Big_white_ball.png";
var bigWhiteBallRedDotPath = "images/big_white_ball_red_dot.png";

function initRender() {
    loader
        .add([tablePath, kiiPath, whitePath, ball3Path, ball8Path, bigWhiteBallPath, bigWhiteBallRedDotPath])
        .on("progress", loadProgressHandler)
        .load(setup);
}

function loadProgressHandler(loader, resource) {
}
var ballSize = 20;
var textureSize = 40;
var buffer = null;
var contextBuffer = null;
var table, kii, spinBall, spinBallRedDot, graphics;
function setup() {
    stage.interactive = true;

    var tableTexture = TextureCache[tablePath];
    table = new Sprite(tableTexture);
    table.anchor.set(0.5, 0.5);
    table.position.set(canvasOffset.x, canvasOffset.y);
    stage.addChild(table);


    buffer = document.createElement('canvas');
    buffer.width = 320;
    buffer.height = ballSize;
    contextBuffer = buffer.getContext("2d");
    var ballsTexture = new Image();
    ballsTexture.onload = function (c) {
        context.drawImage(c.target, 0, 0);
        for (var d = 0; d < game.balls.length; d++) {
            game.balls[d].tex = context.getImageData(d * textureSize, 0, textureSize, textureSize);
            normalizeVector(game.balls[d].rot);
            updateImage(d)
        }
    };
    ballsTexture.src = "images/allpoolballs.png"

    var ball = null;
    var ballsTexture = new PIXI.Texture.fromCanvas(buffer);
    for (var i = 0; i < game.balls.length; i++) {
        var texture = new Texture(ballsTexture);
        texture.frame = new PIXI.Rectangle(i * ballSize, 0, ballSize, ballSize);

        ball = new Sprite(texture);
        ball.anchor.set(0.5, 0.5);
        stage.addChild(ball);

        game.balls[i].sprite = ball;
        game.balls[i].img = context.createImageData(ballSize, ballSize);
        game.balls[i].tex = context.createImageData(textureSize, textureSize);
        game.balls[i].rot = new Array(1, 0, 0, 1);
    }

    var kiiTexture = TextureCache[kiiPath];
    kii = new Sprite(kiiTexture);
    kii.anchor.set(0.5, 0.5);
    stage.addChild(kii);
    game.cue.sprite = kii;

    var bigWhiteBallTexture = TextureCache[bigWhiteBallPath];
    spinBall = new Sprite(bigWhiteBallTexture);
    spinBall.anchor.set(0.5, 0.5);
    var pos = getPixelPointFromWorldPoint(game.whiteSpinBall.centerX, game.whiteSpinBall.centerY);
    spinBall.position.set(pos.x, pos.y);
    stage.addChild(spinBall);

    var bigWhiteBallRedDotTexture = TextureCache[bigWhiteBallRedDotPath];
    spinBallRedDot = new Sprite(bigWhiteBallRedDotTexture);
    spinBallRedDot.anchor.set(0.5, 0.5);
    pos = getPixelPointFromWorldPoint(game.whiteSpinBall.spinCenterX, game.whiteSpinBall.spinCenterY);
    spinBallRedDot.position.set(pos.x, pos.y);
    stage.addChild(spinBallRedDot);


    graphics = new PIXI.Graphics();
    stage.addChild(graphics);
    pixiSetupFinished = true;
}

function updatePixiPositions(game) {
    if (!pixiSetupFinished)
        return;
    game.cue.updatePixi();
    for (var i = 0; i < game.balls.length; i++) {
        game.balls[i].updatePixi();
    }

    var pos = getPixelPointFromWorldPoint(game.whiteSpinBall.spinCenterX, game.whiteSpinBall.spinCenterY);
    spinBallRedDot.position.set(pos.x, pos.y);

    for (var i = 0; i < game.balls.length; i++) {
        updateBall(i);
    }
}
function render() {
    if (!pixiSetupFinished)
        return;

    drawRaycast();
    renderer.render(stage);
}

function drawSegmentPixi(p1, p2) {
    graphics.moveTo(p1.x, p1.y);
    graphics.lineTo(p2.x, p2.y);
}

function drawCirclePixi(p, r) {
    graphics.drawCircle(p.x, p.y, r);
}

function drawRaycast() {
    graphics.clear();
    if (!game.hitParam.hitted) {
        graphics.lineStyle(1, 0xffffff, 1);
        var ray = game.rayCastParam.ray;

        var p1 = getPixelPointFromWorldPoint(ray.startPoint.get_x(), ray.startPoint.get_y());
        var p2 = getPixelPointFromWorldPoint(ray.endPoint.get_x(), ray.endPoint.get_y());
        drawSegmentPixi(p1, p2);
        drawCirclePixi(p2, game.radius * PTM);

        var whiteray = game.rayCastParam.whiteRay;
        var ballray = game.rayCastParam.ballRay;
        if (game.rayCastParam.hitBall) {
            p1 = getPixelPointFromWorldPoint(whiteray.startPoint.get_x(), whiteray.startPoint.get_y());
            p2 = getPixelPointFromWorldPoint(whiteray.endPoint.get_x(), whiteray.endPoint.get_y());
            drawSegmentPixi(p1, p2);
            p1 = getPixelPointFromWorldPoint(ballray.startPoint.get_x(), ballray.startPoint.get_y());
            p2 = getPixelPointFromWorldPoint(ballray.endPoint.get_x(), ballray.endPoint.get_y());
            drawSegmentPixi(p1, p2);
        }
    }
}

function normalizeVector(b) {
    var l = Math.sqrt(b[0] * b[0] + b[1] * b[1] + b[2] * b[2] + b[3] * b[3]);
    b[0] /= l;
    b[1] /= l;
    b[2] /= l;
    b[3] /= l
}

function updateImage(h) {
    var n = new Array(0, 0, 0);
    var balls = game.balls;
    for (var b = 0; b < ballSize; b++) {
        for (var c = 0; c < ballSize; c++) {
            var m = (2 * c - ballSize) / ballSize;
            var l = (2 * b - ballSize) / ballSize;
            var f = (m * m + l * l);
            if (f < 1) {
                var k = Math.sqrt(1 - f);
                n[0] = m;
                n[1] = l;
                n[2] = k;
                var d = Math.floor(k * 2 * 255);
                if (d > 255) {
                    d = 255
                }
                rotate(balls[h].rot, n);
                var a = Math.acos(n[2]);
                var j = (Math.atan2(n[1], n[0]) + Math.PI);
                var e = Math.floor((a / Math.PI) * textureSize);
                var g = textureSize - Math.floor((j / (Math.PI * 2)) * textureSize);
                balls[h].img.data[(c * 4) + (b * ballSize * 4)] = balls[h].tex.data[(g * 4) + (4 * textureSize * e)] & 255;
                balls[h].img.data[(c * 4) + (b * ballSize * 4) + 1] = balls[h].tex.data[(g * 4) + (4 * textureSize * e) + 1] & 255;
                balls[h].img.data[(c * 4) + (b * ballSize * 4) + 2] = balls[h].tex.data[(g * 4) + (4 * textureSize * e) + 2] & 255;
                balls[h].img.data[(c * 4) + (b * ballSize * 4) + 3] = d
            } else {
                balls[h].img.data[(c * 4) + (b * ballSize * 4)] = 0;
                balls[h].img.data[(c * 4) + (b * ballSize * 4) + 1] = 0;
                balls[h].img.data[(c * 4) + (b * ballSize * 4) + 2] = 0;
                balls[h].img.data[(c * 4) + (b * ballSize * 4) + 3] = 0
            }
        }
    }
    contextBuffer.putImageData(balls[h].img, h * ballSize, 0)
}

function rotate(f, a) {
    var d,
        c,
        b,
        e;
    d = (f[3] * a[0] + f[1] * a[2] - f[2] * a[1]);
    c = (f[3] * a[1] + f[2] * a[0] - f[0] * a[2]);
    b = (f[3] * a[2] + f[0] * a[1] - f[1] * a[0]);
    e = (-f[0] * a[0] - f[1] * a[1] - f[2] * a[2]);
    a[0] = d * f[3] - e * f[0] - c * f[2] + b * f[1];
    a[1] = c * f[3] - e * f[1] - b * f[0] + d * f[2];
    a[2] = b * f[3] - e * f[2] - d * f[1] + c * f[0]
}

function rotate2(b, f, e, d) {
    var c = Math.sqrt(f * f + e * e);
    var o = Math.sin(0.5 * d) / c;
    var k = f * o;
    var h = e * o;
    var m = Math.cos(0.5 * d);
    var l,
        j,
        g,
        a;
    l = b[0] * m + b[3] * k - b[2] * h;
    j = b[1] * m + b[3] * h + b[2] * k;
    g = b[2] * m + b[0] * h - b[1] * k;
    a = b[3] * m - b[0] * k - b[1] * h;
    b[0] = l;
    b[1] = j;
    b[2] = g;
    b[3] = a
}

function updateBall(b) {
    if (game.balls[b].visible == false) {
        return
    }

    var vel = game.balls[b].body.GetLinearVelocity();

    var a = Math.sqrt(vel.get_x() * vel.get_x() + vel.get_y() * vel.get_y()) * 4;
    if (a > 0.01) {
        rotate2(game.balls[b].rot, -vel.get_y() / a, -vel.get_x() / a, a * 0.05);
        normalizeVector(game.balls[b].rot);
        updateImage(b);
    }
}