
//#region 
//#endregion

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
    interpolate: function(a,at,b,bt,ts,curvetype) {

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
    consider: function(tx,ty,memory,colliderFunction,grid) {
        if (!memory[tx + "," + ty]) {
            if (colliderFunction(grid,tx,ty)) {
                memory[tx + "," + ty] = {x:tx,y:ty};
            }
        } else {return false}
    },
    gridCollide: function(x,y,w,h,xv,yv,grid,tilesize,colliderFunction) {
        var prX = x+xv;
        var prY = y+yv;
        var newPos = {x:prX,y:prY};

        if (xv < 0) {
            var lower = colliderFunction(grid, util.tt(prX,tilesize), util.tt(y,tilesize));
            var upper = colliderFunction(grid, util.tt(prX,tilesize), util.tt(y+h,tilesize));
            if (upper || lower) {
                newPos.x = (util.tt(prX,tilesize)+1)*tilesize+1;
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
                newPos.y = (util.tt(prY,tilesize)+1)*tilesize+1;
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
}

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
}

const loading = {

}

const images = graphics.loadassets();

var level = generation.generateTemporary(500,100,["grass","wall"]);

console.log(physics.checkPoint(4,4,4,4,2,2));

var x = 0;
var y = 0;

var charX = 60;
var charY = 100;
var xVel = 0;
var yVel = 0;

var enemies = []
entities.new(enemies,{x:0,y:40},graphics.debugentity)

function render(timestamp) {
    var time = timestamp - lastTime
    if (!time) {
        time = 0
    }

    if (isKeyPressed("ArrowRight")) {
    x+=time/5;
    } 
    if (isKeyPressed("ArrowLeft")) {
    x-=time/5;
    }
    if (isKeyPressed("ArrowUp")) {
    y += time/5  ;
    }
    if (isKeyPressed("ArrowDown")) {
    y -= time/5;
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

    x = Math.round(x);
    y = Math.round(y);


    var renderQueue = []
    ctx.clearRect(0,0,canvasWidth,canvasHeight)

    tiles.render(level,renderQueue,x,y,canvasWidth,canvasHeight,32,graphics.drawtile,1,1,1,1)
    zindex.create(renderQueue,util.zToScreen(charY,y)-32,function() {
        ctx.fillStyle = "white"
        ctx.fillRect(charX-x,util.convertY(charY-y,canvasHeight),20,-20)
    })

    entities.render(enemies,x,y,renderQueue)

    zindex.render(renderQueue)


   var newPos = physics.gridCollide(charX,charY,20,20,xVel,yVel,level,32,function(grid,tx,ty) {
        if (tiles.get(grid,tx,ty) == "wall") {
            return true
        }
    })

    entities.runAI(enemies,)

    charX = newPos.x
    charY = newPos.y

    ctx.fillStyle = "white"
    ctx.fillText(charX, 5, 10);
    ctx.fillText(charY, 5, 30);


    lastTime = timestamp
    requestAnimationFrame(render)
}

render();