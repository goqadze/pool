var DEGTORAD = 0.0174532925199432957;
var RADTODEG = 57.295779513082320876;

var Category = {
    BALL: 0x0001,
    BALLCENTER: 0x0002,
    POCKET: 0x0004,
    CUE: 0x0008,
    BORDER: 0x0010,
    WHITEBALL: 0x0020,
    BLACKBALL: 0x0040
};

var BallType = {
    WHITE: 'white',
    SOLID: 'solid',
    STRIPE: 'stripe',
    BLACK: 'black'
};

var EntityType = {
    BALL: 0x0001,
    POCKET: 0x0002,
    BORDER: 0x0004,
    CUE: 0x0008
};

var mouseDownPosWorld = {
    x: 0,
    y: 0
};

var cuePosWorld = {
    x: 0,
    y: 0,
    angle: 0,
    isdown: false
};

var PXTOMETER = 2.44 / 625;
var distFromWhite = 0;
var oneCm = 0.01;
var _16_PXTOMETER = 16 * PXTOMETER;
var _10_PXTOMETER = 10 * PXTOMETER;
var _7_PXTOMETER = 7 * PXTOMETER;
var pocketRadiusMiddle = 17 * PXTOMETER;
var pocketRadius = 19 * PXTOMETER;
var sqrt3 = Math.sqrt(3.0);
var sqrt2 = Math.sqrt(2.0);

function Entity(entityType, id, body) {
    this.type = entityType;
    this.id = id;
    this.body = body;
    this.sprite = null;
    this.visible = true;
    this.getPixelPointFromWorldPoint = function () {
        var pos = this.body.GetPosition();
        var x = pos.get_x();
        var y = pos.get_y();
        return {
            x : x * PTM + canvasOffset.x,
            y : canvas.height - (y * PTM + canvasOffset.y)
        }
    };
    this.getRotation = function(){
        return  -1 * (this.body.GetAngle() - Math.PI / 2);
    };
    this.updatePixi = function(){
        if (this.sprite && this.body){
            var pos = this.getPixelPointFromWorldPoint();
            this.sprite.position.set(pos.x, pos.y);
            if (this.type != EntityType.BALL)
                this.sprite.rotation = this.getRotation();
            this.sprite.visible = this.visible;
        }
    }
}

function Ball(entityType, id, body, ballType) {
    Entity.call(this, entityType, id, body);
    this.ballType = ballType;
    this.img = null;
    this.tex = null;
    this.rot = null;
}
Ball.prototype = Object.create(Entity.prototype);

function Cue(entityType, id, body, verts) {
    Entity.call(this, entityType, id, body);
    this.vertices = verts;
    this.setActive = function(b){
        this.visible = b;
        this.body.SetActive(b);
    }
}
Cue.prototype = Object.create(Entity.prototype);

function Pocket(entityType, id, body) {
    Entity.call(this, entityType, id, body);
}
Pocket.prototype = Object.create(Entity.prototype);

function Border(entityType, id, body, verts) {
    Entity.call(this, entityType, id, body)
    this.vertices = verts;
}
Border.prototype = Object.create(Entity.prototype);

// constructor
var Pool = function () {
    this.whiteBall = null;
    this.whiteSpinBall = {
        centerX : 320 * PXTOMETER,
        centerY : -250 * PXTOMETER,
        radius : 22 * PXTOMETER,
        spinCenterX : 320 * PXTOMETER,
        spinCenterY : -250 * PXTOMETER,
        spinRadius : 3 * PXTOMETER,
        spinLength : 0,
        spinAngle : 0,
        spinVelVector : new Box2D.b2Vec2,
        reset : function(){
            this.spinCenterX = this.centerX;
            this.spinCenterY = this.centerY;
            this.spinLength = 0;
            this.spinAngle = 0;
            this.spinVelVector.Set(0, 0);
        }
    };
    this.cue = null;
    this.balls = [];
    this.pockets = [];
    this.border = null;
    this.borderForRaycast = null;
    this.tableWidthWorld = 2.44; // 625px;
    this.tableHeightWorld = 310 * PXTOMETER; // 310px;
    this.ballDiameterWorld = 20 * PXTOMETER; // 20px;
    this.ballCenterRadius = 0.001;
    this.cueLength = 1.30;
    this.radius = this.ballDiameterWorld / 2;
    this.ballsScheduledForRemoval = [];
    this.userDatas = [];
    this.setupFinished = false;
    this.hitParam = {
        hitted: false,
        firstCollision: false,
        swingLength: 0,
        hitDirection: new Box2D.b2Vec2,
        velocity0: 0,
        reset : function(){
            this.hitted = false;
            this.swingLength = 0;
            this.firstCollision = false;
        }
    };
    this.rayCastParam = {
        ray: {
            startPoint: new Box2D.b2Vec2,
            endPoint: new Box2D.b2Vec2,
            length: 0
        },
        whiteRay: {
            startPoint: new Box2D.b2Vec2,
            endPoint: new Box2D.b2Vec2
        },
        ballRay: {
            startPoint: new Box2D.b2Vec2,
            endPoint: new Box2D.b2Vec2
        },
        crossedBall: null,
        angle: 0,
        hitBall: true
    };
    this.pocketParam = {
        left : {
            x : 0,
            y : 0,
            angle : 0,
            radius : pocketRadius
        },
        middle : {
            x : 0,
            y : 0,
            angle : Math.PI,
            radius : pocketRadiusMiddle
        }
    };

};

Pool.prototype.setNiceViewCenter = function () {
    PTM = 625 / 2.44;
    setViewCenterWorld(b2V2(0, 0), true);
};

Pool.prototype.setup = function () {

    this.hitParam.hitted = false;
    this.hitParam.firstCollision = false;
    this.hitParam.swingLength = 0;
    this.whiteSpinBall.reset();
    distFromWhite = this.cueLength / 2 + 0.09;

    var circleShape = new b2CircleShape();
    circleShape.set_m_radius(this.ballDiameterWorld / 2);

    var circleShapeCenter = new b2CircleShape();
    circleShapeCenter.set_m_radius(this.ballCenterRadius);

    var bd = new b2BodyDef();
    var fd = new b2FixtureDef();
    var filter = new b2Filter();

    this.createWhiteBall(bd, fd, circleShape, circleShapeCenter, filter);
    this.createBalls(bd, fd, circleShape, circleShapeCenter, filter);
    this.createCue(bd, fd, filter);
    this.createPockets(bd, fd, circleShape, filter);
    this.createBorder(bd, fd, filter);
    //  this.createTestBorder(bd, fd, filter);

    destroyAll([fd, bd, filter, circleShape, circleShapeCenter]);
    this.addContactListener();
    this.setupFinished = true;
};

Pool.prototype.addContactListener = function () {
    var contactListener = new Box2D.JSContactListener();
    var $this = this;
    contactListener.BeginContact = function (contact) {
        contact = Box2D.wrapPointer(contact, Box2D.b2Contact);

        var entityA = $this.getEntityByFixture(contact.GetFixtureA());
        var entityB = $this.getEntityByFixture(contact.GetFixtureB());

        if ($this.checkContact(entityA.type, entityB.type, EntityType.BALL, EntityType.POCKET))
            $this.ballsScheduledForRemoval.push(entityA.type == EntityType.BALL ? entityA : entityB);
//                  a = [b, b = a][0]; swap
    };

    contactListener.EndContact = function (contact) {
        //contact = Box2D.wrapPointer(contact, Box2D.b2Contact);
    };

    contactListener.PreSolve = function (contact, oldManifold) {
        //contact = Box2D.wrapPointer(contact, Box2D.b2Contact);
        //oldManifold = Box2D.wrapPointer(oldManifold, Box2D.b2Manifold);
    };

    contactListener.PostSolve = function (contact, impulse) {
        //contact = Box2D.wrapPointer(contact, Box2D.b2Contact);
        //impulse = Box2D.wrapPointer(impulse, Box2D.b2ContactImpulse);
    };
    world.SetContactListener(contactListener);
};

Pool.prototype.checkContact = function (entTypeA, entTypeB, typeA, typeB) {
    return (entTypeA | entTypeB) == (typeA | typeB);
};


Pool.prototype.step = function () {
    if (!this.hitParam.hitted)
        this.updateCuePosition();

    if (this.hitParam.hitted && this.rayCastParam.hitBall && !this.hitParam.firstCollision) {
        this.checkFirstCollision();
    }

    if (this.hitParam.firstCollision){
       this.updateWhiteVelocity();
    }

    this.removeScheduledBalls();

    if (this.isSmthMoving() == false)
        this.resetHitState();
};

Pool.prototype.removeScheduledBalls = function(){
    for (var i = 0; i < this.ballsScheduledForRemoval.length; i++) {
        var ball = this.ballsScheduledForRemoval[i];
        ball.visible = false;
        world.DestroyBody(ball.body);
    }
    this.ballsScheduledForRemoval = [];

};

Pool.prototype.updateWhiteVelocity = function(){
    var ball = this.whiteBall.body;
    var ballVelVector = ball.GetLinearVelocity();
    var spinVelVect = b2V2(0, 0);
    spinVelVect.op_add(this.whiteSpinBall.spinVelVector);
    spinVelVect.op_mul(this.hitParam.swingLength * 2);
    ballVelVector.op_add( spinVelVect );
    ball.SetLinearVelocity(ballVelVector);
    this.whiteSpinBall.spinVelVector.op_mul(0.95);
};

Pool.prototype.updateSpinVelVector = function(){
    var hitDirection = this.hitParam.hitDirection;
    var spinVelVectorX = this.whiteSpinBall.spinLength;
    var spinVelVectorY = 0;
    var whiteVelAngle = Math.atan2(hitDirection.get_y(), hitDirection.get_x());
    var spinAngle = this.whiteSpinBall.spinAngle;
    var spinVelVect = rotateVector(spinVelVectorX, spinVelVectorY, spinAngle + whiteVelAngle);
    this.whiteSpinBall.spinVelVector.Set(spinVelVect.x, spinVelVect.y);
};

Pool.prototype.checkFirstCollision = function () {
    var whiteBody = this.whiteBall.body;
    var crossedBallBody = this.rayCastParam.crossedBall;
    var whitePos = whiteBody.GetPosition();
    var startPos = this.rayCastParam.ray.startPoint;
    if (vecLength(whitePos.get_x() - startPos.get_x(), whitePos.get_y() - startPos.get_y()) > this.rayCastParam.ray.length) {
        var angle = this.rayCastParam.angle;
        var beta = Math.PI - angle;
        if (Math.abs(beta) < 10 * DEGTORAD){
            this.hitParam.firstCollision = true;
            return true;
        }
        var alpha = Math.PI / 2 - beta;
        var vel0 = whiteBody.GetLinearVelocity().Length();
        var velocityCrossedBall = vel0 / (Math.sin(beta) / Math.sin(alpha) * Math.cos(alpha) + Math.cos(beta));
        var velocityWhiteBall = velocityCrossedBall * (Math.sin(beta) / Math.sin(alpha));
      //  console.log(velocityCrossedBall + ' ' + velocityWhiteBall);
        var whiteVelocityVector = b2V2(0, 0);
        whiteVelocityVector.op_add(this.rayCastParam.whiteRay.endPoint);
        whiteVelocityVector.op_sub(this.rayCastParam.whiteRay.startPoint);
        whiteVelocityVector.Normalize();
        whiteVelocityVector.op_mul(velocityWhiteBall);
        whiteBody.SetLinearVelocity(whiteVelocityVector);
       // console.log('vel x: ' + whiteVelocityVector.get_x() + ' y: ' + whiteVelocityVector.get_y());
        var t1 = Math.atan2(whiteVelocityVector.get_y(), whiteVelocityVector.get_x());

        var crossedBallVelocityVector = b2V2(0, 0);
        crossedBallVelocityVector.op_add(this.rayCastParam.ballRay.endPoint);
        crossedBallVelocityVector.op_sub(this.rayCastParam.ballRay.startPoint);
        crossedBallVelocityVector.Normalize();
        crossedBallVelocityVector.op_mul(velocityCrossedBall);
        crossedBallBody.SetLinearVelocity(crossedBallVelocityVector);
        //console.log('vel x: ' + crossedBallVelocityVector.get_x() + ' y: ' + crossedBallVelocityVector.get_y());


        var t2 = Math.atan2(crossedBallVelocityVector.get_y(), crossedBallVelocityVector.get_x());

     //   console.log((t1 - t2) * RADTODEG); console.log('');


        this.hitParam.firstCollision = true;
        return true;
    }
    return false;
};

Pool.prototype.isSmthMoving = function () {
    if (!this.cue.body.IsActive()) {
        var moving = false;
        for (var i = 0; i < this.balls.length; i++) {
            var ball = this.balls[i];
            if (ball.visible == false)
                continue;
            var body = ball.body;
            var velocity = body.GetLinearVelocity();
            if (vecLength(velocity.get_x(), velocity.get_y()) > 0.005) {
                moving = true;
                break;
            }
        }
        return moving;
    }
    return true;
};

Pool.prototype.resetHitState = function () {
/*    this.cue.body.SetActive(true);
    this.cue.visible = true;*/
    this.cue.setActive(true);
    this.cue.body.SetLinearVelocity(b2V2(0, 0));
    this.hitParam.reset();
    this.whiteSpinBall.reset();
    this.rotateCue();
};

Pool.prototype.onKeyDown = function (canvas, evt) {

};

Pool.prototype.onKeyUp = function (canvas, evt) {

};

Pool.prototype.onMouseDown = function () {
    if (this.hitParam.hitted)
        return;

    if (this.checkSpinBallArea()) {
        mouseDown = false;
        return;
    }

    mouseDownPosWorld = mousePosWorld;
    cuePosWorld.x = this.cue.body.GetPosition().get_x();
    cuePosWorld.y = this.cue.body.GetPosition().get_y();
    cuePosWorld.angle = this.cue.body.GetAngle();
    cuePosWorld.isdown = true;
};

Pool.prototype.onMouseMove = function () {
    if (!this.setupFinished)
        return;

    if (!this.hitParam.hitted) {
        if (mouseDown) {
            this.swing();
        }
    }
};

Pool.prototype.onMouseUp = function (mouseout) {
    if (this.hitParam.hitted)
        return;
    if (cuePosWorld.isdown) {
        if (mouseout) {
            this.resetCuePosition();
        } else {
            this.hit();
            this.updateSpinVelVector();
        }
        cuePosWorld.isdown = false;
    }
};

Pool.prototype.checkSpinBallArea = function () {
    var x = mousePosWorld.x - this.whiteSpinBall.centerX;
    var y = mousePosWorld.y - this.whiteSpinBall.centerY;
    var r = this.whiteSpinBall.radius - 3 * PXTOMETER;
    if (x * x + y * y <= r * r)
    {
        this.whiteSpinBall.spinCenterX = mousePosWorld.x;
        this.whiteSpinBall.spinCenterY = mousePosWorld.y;

        var vx = this.whiteSpinBall.spinCenterX - this.whiteSpinBall.centerX;
        var vy = this.whiteSpinBall.spinCenterY - this.whiteSpinBall.centerY;
        this.whiteSpinBall.spinLength = vecLength(vx, vy);
        this.whiteSpinBall.spinAngle = Math.atan2(vy, vx) - Math.PI / 2;

        return true;
    }
    return false;
};

Pool.prototype.updateCuePosition = function () {
    if (!this.setupFinished)
        return;

    if (!mouseDown) {
        this.rotateCue();
        this.rayCast();
    }
};

Pool.prototype.rayCast = function () {
    var whitePos = this.whiteBall.body.GetPosition();
    var cuePos = this.cue.body.GetPosition();

    var p1 = new Box2D.b2Vec2();
    var p2 = new Box2D.b2Vec2();

    copyb2V2(p1, whitePos);
    copyb2V2(p2, b2V2(0, 0));

    p2.op_add(whitePos);
    p2.op_sub(cuePos);
    p2.Normalize();
    p2.op_mul(2 * this.tableWidthWorld);
    p2.op_add(whitePos);

    //check every fixture of every body to find closest
    var closestFraction = 1.0; //start with end of line as p2
    var crossedBall = null;
    for (var i = 1; i < this.balls.length; i++) { // 0 is white ball
        var ball = this.balls[i];
        if (ball.visible == false)
            continue;
        var ballBody = ball.body;
        var fixture = ballBody.GetFixtureList(); // need only first fixture

        var input = Box2D.castObject(Object.create(Box2D.b2RayCastInput), Box2D.b2RayCastInput);
        input.set_p1(p1);
        input.set_p2(p2);
        input.set_maxFraction(1);
        var output = Box2D.castObject(Object.create(Box2D.b2RayCastOutput), Box2D.b2RayCastOutput);

        if (!fixture.RayCast(output, input))
            continue;

        if (output.get_fraction() < closestFraction) {
            closestFraction = output.get_fraction();
            crossedBall = ballBody;
        }
    }

    var ray = this.rayCastParam.ray;
    var whiteray = this.rayCastParam.whiteRay;
    var ballray = this.rayCastParam.ballRay;

    if (crossedBall) {
        this.rayCastParam.crossedBall = crossedBall;

        var resultRayCast = b2V2(0, 0);
        resultRayCast.op_add(p2);
        resultRayCast.op_sub(p1);
        resultRayCast.op_mul(closestFraction);
        resultRayCast.op_add(p1);

        copyb2V2(ray.startPoint, whitePos);
        copyb2V2(ray.endPoint, resultRayCast);
        ray.length = vecLength(ray.endPoint.get_x() - ray.startPoint.get_x(), ray.endPoint.get_y() - ray.startPoint.get_y());

        var wray = new Box2D.b2Vec2();
        var bray = new Box2D.b2Vec2();

        copyb2V2(wray, whitePos);
        wray.op_sub(resultRayCast);
        wray.Normalize();

        copyb2V2(bray, crossedBall.GetPosition());
        bray.op_sub(resultRayCast);
        bray.Normalize();

        var v1 = new Box2D.b2Vec2();
        var v2 = new Box2D.b2Vec2();
        copyb2V2(v1, crossedBall.GetPosition());
        v1.op_sub(whitePos);
        copyb2V2(v2, resultRayCast);
        v2.op_sub(whitePos);

        var vectProduct = v1.get_x() * v2.get_y() - v2.get_x() * v1.get_y()
        var alpha = Math.asin(vectProduct / (v1.Length() * v2.Length()));


        var dotProduct = wray.get_x() * bray.get_x() + wray.get_y() * bray.get_y();
        var angle = Math.acos(dotProduct / (wray.Length() * bray.Length()));

        this.rayCastParam.angle = angle;

        var bFrac = (angle - Math.PI / 2) / (Math.PI / 2);
        var wFrac = 1 - bFrac;

        wray.Set(-bray.get_y(), bray.get_x());
        if (alpha < 0)
            wray.op_mul(-1);
        wray.op_mul(0.15 * wFrac);
        wray.op_add(resultRayCast);

        bray.op_mul(0.15 * bFrac);
        bray.op_add(crossedBall.GetPosition());

        copyb2V2(whiteray.startPoint, resultRayCast);
        copyb2V2(whiteray.endPoint, wray);

        copyb2V2(ballray.startPoint, crossedBall.GetPosition());
        copyb2V2(ballray.endPoint, bray);

        this.rayCastParam.hitBall = true;
        destroyAll([bray, wray, v1, v2]);
    } else {

        closestFraction = 1.0; //start with end of line as p2
        var fixture = this.borderForRaycast.body.GetFixtureList();
        var edgeCount = fixture.GetShape().GetChildCount();
        for (var i = 0; i < edgeCount; i++) { // 0 is white ball
            var input = Box2D.castObject(Object.create(Box2D.b2RayCastInput), Box2D.b2RayCastInput);
            input.set_p1(p1);
            input.set_p2(p2);
            input.set_maxFraction(1);
            var output = Box2D.castObject(Object.create(Box2D.b2RayCastOutput), Box2D.b2RayCastOutput);

            if (!fixture.RayCast(output, input, i))
                continue;

            if (output.get_fraction() < closestFraction) {
                closestFraction = output.get_fraction();
            }
        }

        var rayEndPos = b2V2(0, 0);
        rayEndPos.op_add(p2);
        rayEndPos.op_sub(p1);
        rayEndPos.op_mul(closestFraction);
        rayEndPos.op_add(p1);

        copyb2V2(ray.startPoint, whitePos);
        copyb2V2(ray.endPoint, rayEndPos);
        whiteray.startPoint.SetZero();
        whiteray.endPoint.SetZero();
        ballray.startPoint.SetZero();
        ballray.endPoint.SetZero();

        this.rayCastParam.hitBall = false;
    }

    destroyAll([p1, p2]);
};

Pool.prototype.getEntityByFixture = function (f) {
    return this.userDatas[f.GetBody().GetUserData()];
};

Pool.prototype.resetCuePosition = function () {
    this.cue.body.SetTransform(b2V2(cuePosWorld.x, cuePosWorld.y), cuePosWorld.angle);
};

Pool.prototype.swing = function () {
    var whitePos = this.whiteBall.body.GetPosition();
    var cueBody = this.cue.body;

    var cueNewPos = b2V2(cuePosWorld.x, cuePosWorld.y);
    cueNewPos.op_sub(whitePos);
    var mouseVect = new Box2D.b2Vec2(mousePosWorld.x - mouseDownPosWorld.x, mousePosWorld.y - mouseDownPosWorld.y);

    var dotProduct = cueNewPos.get_x() * mouseVect.get_x() + cueNewPos.get_y() * mouseVect.get_y();
    var cos_angle = dotProduct / (cueNewPos.Length() * mouseVect.Length());

    var len = 0;
    if (cos_angle >= 0)
        len = mouseVect.Length() * cos_angle;

    len = Math.min(len, 0.4);
    this.hitParam.swingLength = len;

    cueNewPos.Normalize();
    cueNewPos.op_mul(distFromWhite + len);
    cueNewPos.op_add(whitePos);

    cueBody.SetTransform(cueNewPos, cueBody.GetAngle());
};

Pool.prototype.hit = function () {
    if (this.hitParam.swingLength <= 0.0000001)
        return;
    this.hitParam.hitted = true;
    this.hitParam.firstCollision = false;

    var cueBody = this.cue.body;
    var whitePos = this.whiteBall.body.GetPosition();
    var cuePos = cueBody.GetPosition();

    var vect = b2V2(0, 0);
    vect.op_add(whitePos);
    vect.op_sub(cuePos);
    vect.Normalize();
    vect.op_mul(this.hitParam.swingLength * 15);

    copyb2V2(this.hitParam.hitDirection, vect);

    this.whiteBall.body.SetLinearVelocity(vect);
    this.hitParam.velocity0 = vect.Length();

    this.cue.setActive(false);
};

Pool.prototype.rotateCue = function () {
    var whitePos = this.whiteBall.body.GetPosition();
    var cueBody = this.cue.body;

    var cueNewPos = b2V2(mousePosWorld.x, mousePosWorld.y);
    cueNewPos.op_sub(whitePos);

    if (cueNewPos.Length() < this.ballDiameterWorld)
        return;

    var angle = Math.atan2(cueNewPos.get_y(), cueNewPos.get_x());
    cueNewPos.Normalize();
    cueNewPos.op_mul(-distFromWhite);
    cueNewPos.op_add(whitePos);

    cueBody.SetTransform(cueNewPos, angle);
};


Pool.prototype.createBalls = function (bd, fd, circleShape, circleShapeCenter, filter) {
    var ballBody = null;
    var sx = this.tableWidthWorld / 4 + sqrt3 * this.radius;
    var sy = 2 * this.ballDiameterWorld;

    bd.set_bullet(true);

    var circleShapeRayCast = new b2CircleShape();
    circleShapeRayCast.set_m_radius(this.ballDiameterWorld);

    filter.set_categoryBits(0);
    filter.set_maskBits(0);

    var fdRayCast = new b2FixtureDef();
    fdRayCast.set_density(0.0001);
    fdRayCast.set_filter(filter);
    fdRayCast.set_shape(circleShapeRayCast);

    for (var i = 4; i >= 0; i--) {
        var y = sy;
        for (var j = 0; j <= i; j++) {
            bd.set_position(b2V2(sx, y));
            ballBody = world.CreateBody(bd);
            ballBody.SetUserData(this.userDatas.length);

            var ball = new Ball(EntityType.BALL, this.balls.length, ballBody, BallType.STRIPE, false);
            this.balls.push(ball);
            this.userDatas.push(ball);

            filter.set_categoryBits(Category.BALL);
            filter.set_maskBits(Category.BALL | Category.BORDER);

            fd.set_filter(filter);
            fd.set_shape(circleShape);

            ballBody.CreateFixture(fd);

            filter.set_categoryBits(Category.BALLCENTER);
            filter.set_maskBits(Category.POCKET);

            fd.set_filter(filter);
            fd.set_shape(circleShapeCenter);

            ballBody.CreateFixture(fd);
            ballBody.CreateFixture(fdRayCast);

            y -= 2 * this.radius;
        }
        sx -= sqrt3 * this.radius;
        sy -= this.radius;
    }

    Box2D.destroy(circleShapeRayCast);
    Box2D.destroy(fdRayCast);
};

Pool.prototype.createWhiteBall = function (bd, fd, circleShape, circleShapeCenter, filter) {

    var ballBody = null;

    bd.set_type(Module.b2_dynamicBody);
    bd.set_position(b2V2(-this.tableWidthWorld / 4, 0));
    bd.set_bullet(true);
    bd.set_angularDamping(3);
    bd.set_linearDamping(0.7);

    ballBody = world.CreateBody(bd);
    ballBody.SetUserData(this.userDatas.length);

    this.whiteBall = new Ball(EntityType.BALL, this.balls.length, ballBody, BallType.WHITE, false);
    this.balls.push(this.whiteBall);
    this.userDatas.push(this.whiteBall);

    filter.set_categoryBits(Category.BALL | Category.WHITEBALL);
    filter.set_maskBits(Category.BALL | Category.CUE | Category.BORDER);

    fd.set_filter(filter);
    fd.set_shape(circleShape);
    fd.set_density(1.0);
    fd.set_friction(0.3);
    fd.set_restitution(0.8);

    ballBody.CreateFixture(fd);

    filter.set_categoryBits(Category.BALLCENTER);
    filter.set_maskBits(Category.POCKET);

    fd.set_filter(filter);
    fd.set_shape(circleShapeCenter);

    ballBody.CreateFixture(fd);
    return {bd: bd, ballBody: ballBody, fd: fd};
};

Pool.prototype.createPockets = function (bd, fd, circleShape, filter) {

    var c = Math.sqrt(2.0) * (_10_PXTOMETER + _16_PXTOMETER);
    var a = pocketRadius;
    var b = pocketRadius;
    var pocketAngle = Math.acos( (a * a + b * b - c * c) / (2 * a * b) ); // ???????????? ???????.
    var alpha = (Math.PI - pocketAngle) / 2;
    alpha += Math.PI / 4;
    var px = Math.cos(alpha) * pocketRadius;
    var py = Math.sin(alpha) * pocketRadius;
    var pocketCenterX = -this.tableWidthWorld / 2 - _16_PXTOMETER + px - 2 * PXTOMETER;
    var pocketCenterY = this.tableHeightWorld / 2 - _10_PXTOMETER + py + 2 * PXTOMETER;
    var pocketMiddleCenterX = 0;
    var pocketMiddleCenterY = this.tableHeightWorld / 2 + 14 * PXTOMETER;

    this.pocketParam.left.x = pocketCenterX;
    this.pocketParam.left.y = pocketCenterY;
    this.pocketParam.left.angle = pocketAngle;

    this.pocketParam.middle.x = pocketMiddleCenterX;
    this.pocketParam.middle.y = pocketMiddleCenterY;
    this.pocketParam.middle.angle = Math.PI;

    var verts = [];
    var A1 = new b2Vec2(pocketCenterX, pocketCenterY);
    verts.push(A1);
    verts.push(new b2Vec2(-A1.get_x(), A1.get_y()));
    verts.push(new b2Vec2(-A1.get_x(), -A1.get_y()));
    verts.push(new b2Vec2(A1.get_x(), -A1.get_y()));

    verts.push(new b2Vec2(pocketMiddleCenterX, pocketMiddleCenterY));
    verts.push(new b2Vec2(pocketMiddleCenterX, -pocketMiddleCenterY));


    bd.set_type(Module.b2_staticBody);

    circleShape.set_m_radius(pocketRadius);
    filter.set_categoryBits(Category.POCKET);
    filter.set_maskBits(Category.BALLCENTER);

    fd.set_filter(filter);
    fd.set_isSensor(true);
    fd.set_shape(circleShape);

    for (var i = 0; i < verts.length; i++) {
        bd.set_position(verts[i]);

        if (i > 3) // middle pockets
        {
            circleShape.set_m_radius(pocketRadiusMiddle);
            fd.set_shape(circleShape);
        }

        var pocketBody = world.CreateBody(bd);
        pocketBody.CreateFixture(fd);
        pocketBody.SetUserData(this.userDatas.length);

        var pocket = new Pocket(EntityType.POCKET, this.pockets.length, pocketBody);
        this.pockets.push(pocket);
        this.userDatas.push(pocket);
    }

};

Pool.prototype.createBorder = function (bd, fd, filter) {
    var verts = [],
        tmpVerts = [],
        vertsForRaycast = [],
        tmpVertsRayLeftPocket = [],
        tmpVertsRayMiddlePocket = [];
    var count = 10;

    // -x ; +y
    var A1 = new Box2D.b2Vec2(-this.tableWidthWorld / 2, this.tableHeightWorld / 2 - (_10_PXTOMETER + _16_PXTOMETER) );
    var B1 = new Box2D.b2Vec2(A1.get_x() - _16_PXTOMETER, A1.get_y() + _16_PXTOMETER);
    tmpVerts.push(A1);
    tmpVerts.push(B1);

    var tmp = b2V2(B1.get_x() - this.pocketParam.left.x, B1.get_y() - this.pocketParam.left.y );
    var angle = -1 * (2 * Math.PI - this.pocketParam.left.angle) / count;
    var f = (pocketRadius - this.radius) / pocketRadius; // raycast in left pocket
    for (var i = 0; i < count; i ++){
        var vect = rotateVector(tmp.get_x(), tmp.get_y(), angle );
        tmpVerts.push(new Box2D.b2Vec2(this.pocketParam.left.x + vect.x, this.pocketParam.left.y + vect.y));

        var x = vect.x * f;
        var y = vect.y * f;
        tmpVertsRayLeftPocket.push(new Box2D.b2Vec2(this.pocketParam.left.x + x, this.pocketParam.left.y + y)); // raycastBorder in left pocket

        tmp = b2V2(vect.x, vect.y);
    }

    var C1 = new Box2D.b2Vec2(-this.tableWidthWorld / 2 + (_10_PXTOMETER + _16_PXTOMETER), this.tableHeightWorld / 2 );
    var D1 = new Box2D.b2Vec2(C1.get_x() - _16_PXTOMETER, C1.get_y() + _16_PXTOMETER );

    tmpVerts.push(D1);
    tmpVerts.push(C1);

    var E1 = new Box2D.b2Vec2(-pocketRadiusMiddle - _7_PXTOMETER, this.tableHeightWorld / 2);
    var F1 = new Box2D.b2Vec2(E1.get_x() + _7_PXTOMETER, E1.get_y() + _16_PXTOMETER);
    tmpVerts.push(E1);
    tmpVerts.push(F1);

    var tmp = b2V2(F1.get_x() - this.pocketParam.middle.x, F1.get_y() - this.pocketParam.middle.y );
    var angle = -1 * (this.pocketParam.middle.angle / count);
    f = (pocketRadiusMiddle - this.radius) / pocketRadiusMiddle; // raycast in middle pocket
    for (var i = 0; i < count / 2 - 1; i ++){
        var vect = rotateVector(tmp.get_x(), tmp.get_y(), angle );
        tmpVerts.push(new Box2D.b2Vec2(this.pocketParam.middle.x + vect.x, this.pocketParam.middle.y + vect.y));

        var x = vect.x * f;
        var y = vect.y * f;
        tmpVertsRayMiddlePocket.push(new Box2D.b2Vec2(this.pocketParam.middle.x + x, this.pocketParam.middle.y + y)); // raycastBorder in middle pocket

        tmp = b2V2(vect.x, vect.y);
    }
    // -x; +y
    verts = verts.concat(tmpVerts);
    tmpVerts.reverse();
    // +x; +y
    for (var i = 0; i < tmpVerts.length; i ++){
        verts.push(new Box2D.b2Vec2(-tmpVerts[i].get_x(), tmpVerts[i].get_y() ));
    }
    tmpVerts = [];
    // +x, -x; -y
    for (var i = 0; i < verts.length; i ++){
        tmpVerts.push(new Box2D.b2Vec2(verts[i].get_x(), -verts[i].get_y()));
    }
    tmpVerts.reverse();
    verts = verts.concat(tmpVerts);

    bd.set_type(Module.b2_staticBody);
    bd.set_position(b2V2(0, 0));
    var chainShape = createChainShape(verts, true);

    filter.set_categoryBits(Category.BORDER);
    filter.set_maskBits(Category.BALL);

    fd.set_filter(filter);
    fd.set_isSensor(false);
    fd.set_shape(chainShape);

    var borderBody = world.CreateBody(bd);
    borderBody.CreateFixture(fd);
    borderBody.SetUserData(this.userDatas.length);

    verts.push(verts[0]);
    this.border = new Border(EntityType.BORDER, 0, borderBody, verts);
    this.userDatas.push(this.border);

    //invisible border for raycast
    tmpVerts = [];
    var _d_ = this.radius / sqrt2;

    var Ar1 = new Box2D.b2Vec2(A1.get_x() + this.radius, A1.get_y());
    tmpVerts.push(Ar1);
    var Ar2 = new Box2D.b2Vec2(A1.get_x() + _d_, A1.get_y() + _d_);
    tmpVerts.push(Ar2);
    var Br1 = new Box2D.b2Vec2(B1.get_x() + _d_, B1.get_y() + _d_);
    tmpVerts.push(Br1);
    tmpVerts = tmpVerts.concat(tmpVertsRayLeftPocket);
    var Dr1 = new Box2D.b2Vec2(D1.get_x() - _d_, D1.get_y() - _d_);
    tmpVerts.push(Dr1);
    var Cr1 = new Box2D.b2Vec2(C1.get_x() - _d_, C1.get_y() - _d_);
    tmpVerts.push(Cr1);
    var Cr2 = new Box2D.b2Vec2(C1.get_x(), C1.get_y() - this.radius);
    tmpVerts.push(Cr2);
    var Er1 = new Box2D.b2Vec2(E1.get_x(), E1.get_y() - this.radius);
    tmpVerts.push(Er1);
    var Er2 = new Box2D.b2Vec2(E1.get_x() + _d_, E1.get_y() - _d_);
    tmpVerts.push(Er2);
    var Fr1 = new Box2D.b2Vec2(F1.get_x() + _d_, F1.get_y() - _d_);
    tmpVerts.push(Fr1);
    tmpVerts = tmpVerts.concat(tmpVertsRayMiddlePocket);

    vertsForRaycast = vertsForRaycast.concat(tmpVerts);
    tmpVerts.reverse();

    // +x; +y
    for (var i = 0; i < tmpVerts.length; i ++){
        vertsForRaycast .push(new Box2D.b2Vec2(-tmpVerts[i].get_x(), tmpVerts[i].get_y() ));
    }
    tmpVerts = [];
    // +x, -x; -y
    for (var i = 0; i < vertsForRaycast.length; i ++){
        tmpVerts.push(new Box2D.b2Vec2(vertsForRaycast[i].get_x(), -vertsForRaycast[i].get_y()));
    }
    tmpVerts.reverse();
    vertsForRaycast = vertsForRaycast.concat(tmpVerts);


    chainShape = createChainShape(vertsForRaycast, true);

    filter.set_categoryBits(0);
    filter.set_maskBits(0);

    fd.set_filter(filter);
    fd.set_isSensor(false);
    fd.set_shape(chainShape);

    var invisibleBorderForRaycastBody = world.CreateBody(bd);
    invisibleBorderForRaycastBody.CreateFixture(fd);
    invisibleBorderForRaycastBody.SetUserData(this.userDatas.length);

    vertsForRaycast.push(vertsForRaycast[0]);
    this.borderForRaycast = new Border(EntityType.BORDER, 1, invisibleBorderForRaycastBody, vertsForRaycast);
    this.userDatas.push(this.borderForRaycast);
};

Pool.prototype.createCue = function (bd, fd, filter) {
    var whiteBallBody = this.whiteBall.body;
    var wpos = whiteBallBody.GetPosition();

    var verts = [];
    var x = this.cueLength / 2;
    verts.push(new Box2D.b2Vec2(-x, 2 * oneCm * 0.8));
    verts.push(new Box2D.b2Vec2(-x, -2 * oneCm * 0.8));
    verts.push(new Box2D.b2Vec2(x, -1 * oneCm * 0.8));
    verts.push(new Box2D.b2Vec2(x, 1 * oneCm * 0.8));

    var shape = createPolygonShape(verts);

    bd.set_type(Module.b2_dynamicBody);
    bd.set_position(b2V2(wpos.get_x() - distFromWhite, 0));
    bd.set_angularDamping(0);
    bd.set_linearDamping(0);

    var cueBody = world.CreateBody(bd);

    filter.set_categoryBits(Category.CUE);
    filter.set_maskBits(Category.WHITEBALL);

    fd.set_filter(filter);
    fd.set_shape(shape);
    fd.set_density(100);

    cueBody.CreateFixture(fd);
    cueBody.SetUserData(this.userDatas.length);

    this.cue = new Cue(EntityType.CUE, 1, cueBody, verts);
    this.userDatas.push(this.cue);

};

Pool.prototype.createTestBorder = function (bd, fd, filter) {
    bd.set_type(Module.b2_staticBody);
    bd.set_position(b2V2(0, 0));
    var body = world.CreateBody(bd);

    var polShape = new Box2D.b2PolygonShape();
    fd.set_shape(polShape);

    filter.set_categoryBits(Category.BORDER);
    filter.set_maskBits(Category.WHITEBALL);

    fd.set_filter(filter);

    var w = 2;
    var h = 0.01;
    var y = 0.5;
    var x = 1;

    //ground
    polShape.SetAsBox(w, h, b2V2(0, -y), 0);
    body.CreateFixture(fd);
    //ceil
    polShape.SetAsBox(w, h, b2V2(0, y), 0);
    body.CreateFixture(fd);
    //left
    polShape.SetAsBox(h, w / 2, b2V2(-x, 0), 0);
    body.CreateFixture(fd);
    //right
    polShape.SetAsBox(h, w / 2, b2V2(x, 0), 0);
    body.CreateFixture(fd);
};