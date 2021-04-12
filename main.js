
//#region 
//#endregion
// var mydata = JSON.parse(data);

const leveldata = {}

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const canvasWidth = 480;
const canvasHeight = 360;
var lastTime = 0;

var keys = {}
document.addEventListener("keydown", function(k){keys[k.code] = true});
document.addEventListener("keyup", function(k){keys[k.code] = false});
function isKeyPressed(key) {
    if (keys[key] && keys[key] == true) {
        return true;
    } else { return false }
}

const util = {
    random: function(min, max) {
        return Math.floor((Math.random() * max) + min);
    },
    convertY: function(y, h) {
        return h - y;
    },
    zToScreen: function(z, cam) {
        return z - cam;
    },
    tt: function(coordinate,tileSize) {
        return Math.floor(coordinate/tileSize);
    },
    interpolate: function(a,b,percent,curvetype) {
        var i = 0
        if (curvetype == "linear") {
            i = percent
        } else if (curvetype == "smooth") {
            i = 1-(1-percent)**4
        }
        return a + (b-a)*i
    },
    interpolateAnimation: function(a,at,b,bt,ts,curvetype) {
        if (ts > bt) {
            return b 
        }
        var percent = (ts - at) / (bt - at)
        return this.interpolate(a,b,percent,curvetype)
    }
};

const graphics = {
    loadassets: function() {
        var assets = {}
        const load = function(source) {
            var i = new Image();
            i.src = source;
            return i;
        }
        assets.lemons = load("lemons.jpg");
        assets.cobbleFloor = load("assets/tiles/cobbleFloor.png");
        assets.wall = load("assets/tiles/brickWall.png");
        assets.grass = load("assets/tiles/grass.png");
        return assets;
    },
    debugsquare: function(tile, x, y) {
        ctx.fillStyle = 'white';
        ctx.fillRect(x, y, 8, 8);
    },
    drawtile: function(tile, x, y, z, rq) {
        if (tile == "wall") {
            zindex.create(rq, z, function() {
                ctx.drawImage(images.wall, x, y-32/2);
                //debug things
                // ctx.textAlign = "center"
                // ctx.fillStyle = 'white';
                // ctx.fillRect(x,y,-30,-20);
                // ctx.fillText(z, x+8, y+8);
            })
        } else if (tile == "grass") {
            zindex.create(rq, z, function() {
                ctx.drawImage(images.grass, x, y);
            })
        }
    },
    debugentity: function(data,camX,camY,rq) {
        zindex.create(rq,util.zToScreen(data.y,camY)-32,function() {
            ctx.fillStyle = 'red';
            ctx.fillRect(data.x-camX,util.convertY(data.y-camY,canvasHeight),10,-30);
        })
    }
}

const zindex = {
    create: function(list, zindex, onrender) {
        list.push({z:zindex, onrender:onrender});
    },
    sort: function(objects) {
        objects.sort(function(a, b) {if (a.z > b.z) {return -1} else if (a.z < b.z) {return 1} else {return 0}});
    },
    render: function(objects) {
        this.sort(objects);
        for (var i = 0; i < objects.length; i++) {
            let item = objects[i];
            item.onrender();
        }
    }
};

const tiles = {
    new: function() {
        var grid = {tiles:[]};
        return grid;
    },
    get: function(grid, x, y) {
        if (grid.tiles[x]) {
            if (grid.tiles[x][y]) {
                return grid.tiles[x][y];
            } else { return false }
        } else { return false }
    },
    set: function(grid, x, y, set) {
        if (grid.tiles[x]) {
           grid.tiles[x][y]= set;
        } else {
            grid.tiles[x] = [];
            grid.tiles[x][y] = set;
        }
    },
    render: function(grid, objects, camX, camY, screenW, screenH, tilesize, ontile, spillTop, spillBottom, spillLeft, spillRight) {
        var offsetX = Math.floor(camX % tilesize);
        var offsetY = Math.floor(camY % tilesize);
        var tileX = Math.floor((camX - offsetX) / tilesize)-spillLeft;
        var tileY = Math.floor((camY - offsetY) / tilesize)-spillBottom;

        var gridWidth = Math.ceil(screenW/tilesize)+spillLeft+spillRight;
        var gridHeight = Math.ceil(screenH/tilesize)+spillBottom+spillTop;

        for (var x = 0; x < gridWidth; x++) {
            for (var y = 0; y < gridHeight; y++) {
                var item = this.get(grid,tileX+x,tileY+y);
                if (item) {
                    var z = util.zToScreen((tileY+y) * tilesize, Math.floor(camY));

                    ontile(
                    item,
                    -offsetX + (x-spillLeft)*tilesize,
                    util.convertY(-offsetY + (y+1-spillBottom)*tilesize,screenH),
                    z,objects);
                }
            }
        }

    }
};

const generation = {
    generateTemporary: function(w, h, pal) {
        let grid = tiles.new();
        for (var x=0; x<w; x++) {
            for (var y=0; y<h; y++) {
                tiles.set(grid, x, y, pal[util.random(0, pal.length)]);
            }
        }
        return grid
    }
};

const physics = {
    checkPoint: function(x1, y1, x2, y2, w, h) {
        return (
            x1 >= x2 && 
            x1 <= x2 + w-1 && 
            y1 >= y2 &&
            y1 <= y2 + h-1
        );
    },
    squareCollision: function(x1, y1, w1, h1, x2, y2, w2, h2) {
        return (
            this.checkPoint(x1, y1, x2, y2, w2, h2) ||
            this.checkPoint(x1+w1-1, y1, x2, y2, w2, h2) ||
            this.checkPoint(x1+w1-1, y1+h1-1, x2, y2, w2, h2) ||
            this.checkPoint(x1, y1+h1-1, x2, y2, w2, h2)
        );
    },
    move: function(xv, yv, x1, y1, w1, h1, x2, y2, w2, h2) {
        if (this.squareCollision(Math.round(x1+xv),Math.round(y1+yv),w1,h1,x2,y2,w2,h2)) {
            var uX = x1+xv
            var uY = y1+yv
            if (xv > 0) {
                uX = x2 - w1;
            } else if (xv < 0) {
                uX = x2 + w2;
            }
            if (yv > 0) {
                uY = y2 - h1;
            } else if (yv < 0) {
                uY = y2 + h2;
            }
            return {x:uX,y:uY};
        } else {
            return {x:x1+xv,y:y1+yv};
        }
    },
    changePos: function(xv, yv, x1, y1, w1, h1, x2, y2, w2, h2) {
        var newPos = this.move(xv, 0, x1, y1, w1, h1, x2, y2, w2, h2);
        newPos = this.move(0, yv, newPos.x, newPos.y, w1, h1, x2, y2, w2, h2);
        return newPos;
    },
    gridCollide: function(x,y,w,h,xv,yv,grid,tilesize,colliderFunction) {
        var prX = Math.round(x+xv);
        var prY = Math.round(y+yv);
        var newPos = {x:prX,y:prY};

        if (xv < 0) {
            var lower = colliderFunction(grid, util.tt(prX,tilesize), util.tt(y,tilesize));
            var upper = colliderFunction(grid, util.tt(prX,tilesize), util.tt(y+h,tilesize));
            if (upper || lower) {
                newPos.x = (util.tt(prX,tilesize)+1)*tilesize;
            }
        }
        if (xv > 0) {
            var lower = colliderFunction(grid, util.tt(prX+w,tilesize), util.tt(y,tilesize));
            var upper = colliderFunction(grid, util.tt(prX+w,tilesize), util.tt(y+h,tilesize));
            if (upper || lower) {
                newPos.x = ((util.tt(prX,tilesize)+1)*tilesize)-w-1;
            }
        }

        if (yv < 0) {
            var upper = colliderFunction(grid, util.tt(newPos.x,tilesize), util.tt(prY,tilesize));
            var lower = colliderFunction(grid, util.tt(newPos.x+w,tilesize), util.tt(prY,tilesize));
            if (upper || lower) {
                newPos.y = (util.tt(prY,tilesize)+1)*tilesize;
            }
        }

        if (yv > 0) {
            var upper = colliderFunction(grid, util.tt(newPos.x,tilesize), util.tt(prY+h,tilesize));
            var lower = colliderFunction(grid, util.tt(newPos.x+w,tilesize), util.tt(prY+h,tilesize));
            if (upper || lower) {
                newPos.y = (util.tt(prY,tilesize)+1)*tilesize-h-1;
            }
        }

        return newPos;
    },
};

const entities = {
    new: function(list,data,onrender,ai) {
        list.push({data:data,onrender:onrender,ai:ai})
    },
    runAI: function(entities,dt,ts) {
        //dt delta time
        //ts timestamp
        for (var i; i < entities.length; i++) {
            entities[i].ai(entities[i].data,dt,ts);
        }
    },
    render: function(entities,camX,camY,rq) {
        for (var i=0; i < entities.length; i++) {
            entities[i].onrender(entities[i].data,camX,camY,rq);
        }
    }
};

const cam = {
    new: function() {
        return {x:0,y:0,t1:0,t2:0,x1:0,y1:0,x2:0,y2:0,vibration:[],animActive:false,aX:0,aY:0}
        //x, y apparent coordinates
        //aX aY absolute coordinates
    },
    tick: function(camera,ts) {
        //panning

        if (ts >= camera.t2) {
            camera.animActive = false
            camera.aX = camera.x2
            camera.aY = camera.y2
        }
        if (camera.animActive) {
            camera.aX = util.interpolateAnimation(camera.x1,camera.t1,camera.x2,camera.t2,ts,"smooth")
            camera.aY = util.interpolateAnimation(camera.y1,camera.t1,camera.y2,camera.t2,ts,"smooth")
        }
        if (camera.vibration.length > 0) {
            while (true) {
                if (camera.vibration[0] && ts > camera.vibration[0].ts) {
                    camera.x = camera.aX - camera.vibration[0].x
                    camera.y = camera.aY - camera.vibration[0].y
                    camera.vibration.shift();
                } else {
                    break
                }
            }
        } else {
            camera.x = camera.aX
            camera.y = camera.aY
        }
    },
    setPan: function(camera,x,y,duration,ts) {
        camera.x1 = camera.aX
        camera.y1 = camera.aY
        camera.x2 = x
        camera.y2 = y
        camera.t1 = ts
        camera.t2 = ts+duration
        camera.animActive = true
    },
    setVibrate: function(camera,frequency,intensity,duration,ts) {
        camera.vibration = []
        for (var stamp = 0; stamp <= ts + duration; stamp += frequency) {
            camera.vibration.push(
                {ts:stamp,
                x:util.random(0,intensity*2)-intensity,
                y:util.random(0,intensity*2)-intensity})
        }
    },
    createBox: function(boxes,x,y,w,h,fX,fY) {
        boxes.push({x:x,y:y,w:w,h:h,fX:fX,fY:fY,active:false});
    },
    checkBoxes: function(boxes,px,py,pw,ph) {
        for (var i = 0; i < boxes.length; i++) {
            var item = boxes[i]
            // var colliding = physics.squareCollision(item.x,item.y,item.w,item.h,px,py,pw,ph)
            var colliding = physics.squareCollision(px,py,pw,ph,item.x,item.y,item.w,item.h)
            if (colliding && !item.active) {
                return {x:item.fX,y:item.fY}
            }
        }
        return false
    },
    renderDebugBoxes: function(boxes,camX,camY) {
        for (var i = 0; i < boxes.length; i++) {
            var item = boxes[i]
            ctx.fillStyle = 'rgba(255, 0, 255, .2)'
            ctx.strokeStyle = 'white'
            ctx.lineWidth = 3
            ctx.fillRect(item.x-camX,util.convertY(item.y-camY,canvasHeight),item.w,-item.h)
            ctx.strokeRect(item.x-camX,util.convertY(item.y-camY,canvasHeight),item.w,-item.h)
        }
    }
};

const menu = {
    //todo add menu, button, 

    //addbutton x, y w,h,onpress

    //evalbuttons

    //text
};
const loading = {

};

const images = graphics.loadassets();
var level = generation.generateTemporary(500,100,["grass","wall"]);
// var level = generation.generateTemporary(500,100,["grass","grass"]);

var charX = 60;
var charY = 100;
var xVel = 0;
var yVel = 0;

//camera
var c = cam.new()
var x = 0;
var y = 0;

var newPanPos = {x:0,y:0}
var lastPanPos = {x:0,y:0}
var lastMode = false

var camboxes = []
cam.createBox(camboxes,0,0,40,90,0,0)
cam.createBox(camboxes,40,90,40,90,40,90)

//entities
var enemies = []
entities.new(enemies,{x:0,y:40},graphics.debugentity)

//gamestate
var gameState = "playing"

function render(timestamp) {
    var time = timestamp - lastTime
    if (!time) {
        time = 0
    }

    xVel = 0;
    yVel = 0; 
    if (isKeyPressed("KeyW")) {
        yVel += time/10
    }
    if (isKeyPressed("KeyS")) {
        yVel -= time/10
    }
    if (isKeyPressed("KeyD")) {
        xVel += time/10
    }
    if (isKeyPressed("KeyA")) {
        xVel -= time/10
    }

    var newPos = physics.gridCollide(charX,charY,20,20,xVel,yVel,level,32,function(grid,tx,ty) {
        if (tiles.get(grid,tx,ty) == "wall") {
            return true
        }
    })
    charX = newPos.x
    charY = newPos.y

    //camera
    if (timestamp) {
        newPanPos = cam.checkBoxes(camboxes,charX,charY,20,20,timestamp)
        if (newPanPos) {
            if (newPanPos.x !== lastPanPos.x || newPanPos.y !== lastPanPos.y) {
                cam.setPan(c,newPanPos.x,newPanPos.y,300,Math.floor(timestamp))
                lastMode = "p"
            }
        } else {
            var freeX = charX-canvasWidth/2 
            var freeY = charY-canvasHeight/2
            if (lastMode == "p") {
                cam.setPan(c,freeX,freeY,300,Math.floor(timestamp))
            }
            c.x2 = freeX
            c.y2 = freeY
            lastMode = "f"
        }
    }
    cam.tick(c,timestamp)
    x = c.x;
    y = c.y;
    x = Math.round(x);
    y = Math.round(y);

    //rendering
    ctx.imageSmoothingEnabled = false;

    var renderQueue = []
    ctx.clearRect(0,0,canvasWidth,canvasHeight)

    zindex.create(renderQueue,util.zToScreen(charY,y)-32,function() {
        ctx.fillStyle = "white"
        ctx.fillRect(charX-x,util.convertY(charY-y,canvasHeight),20,-20)
    })

    tiles.render(level,renderQueue,x,y,canvasWidth,canvasHeight,32,graphics.drawtile,1,1,1,1)
    entities.render(enemies,x,y,renderQueue)
    zindex.render(renderQueue)
    cam.renderDebugBoxes(camboxes,x,y)

    //debug
    ctx.fillStyle = "white"
    ctx.fillText(charX, 5, 10);
    ctx.fillText(charY, 5, 30);

    //deltatime calculation
    lastTime = timestamp
    lastPanPos = newPanPos
    requestAnimationFrame(render)
}

render();