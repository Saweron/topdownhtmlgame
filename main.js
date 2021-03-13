//setup
const canvas = document.getElementById("game")
const ctx = canvas.getContext("2d")
var lastTime = 0

//set up keyboard inputs
var keys = {}
document.addEventListener("keydown",function(k){keys[k.code] = true});
document.addEventListener("keyup",function(k){keys[k.code] = false});
function isKeyPressed(key) {
    if (keys[key] && keys[key] == true) {
        return true
    } else { return false }
}

const util = {
    random: function(min,max) {
        return Math.floor((Math.random() * max) + min);
    },
    convertY: function(y,h) {
        return h - y
    },
    zToScreen: function(z,cam) {
        return z - cam
    },
    fromTile: function(coordinate,tileSize) {
        return (coordinate)*tileSize
    }
};

const graphics = {
    loadassets: function() {
        var assets = {}
        const load = function(source) {
            var i = new Image()
            i.src = source
            return i
        }
        assets.lemons = load("lemons.jpg")
        assets.cobbleFloor = load("assets/tiles/cobbleFloor.png")
        return assets
    },
    debugsquare: function(tile,x,y) {
        ctx.fillStyle = 'white';
        ctx.fillRect(x,y,8,8)
    },
    drawtile: function(tile,x,y,z,rq) {
        zindex.create(rq,z,function() {
            ctx.drawImage(images.cobbleFloor,x,y)

            ctx.textAlign = "center"
            ctx.fillStyle = 'white';
            ctx.fillRect(x,y,20,-20)
            ctx.fillText(z, x+8, y+8)
        })

    }
}

const zindex = {
    create: function(list,zindex,onrender) {
        list.push({z:zindex,onrender:onrender})
    },
    sort: function(objects) {
        objects.sort(function(a,b) {if (a.z > b.z){return -1}else if (a.z < b.z) {return 1}else{return 0}})
    },
    render: function(objects) {
        this.sort(objects)
        for (var i=0;i<objects.length;i++) {
            let item = objects[i];
            item.onrender();
        }
    }
};

const tiles = {
    new: function() {
        var grid = {tiles:[]}
        return grid;
    },
    get: function(grid,x,y) {
        if (grid.tiles[x]) {
            if (grid.tiles[x][y]) {
                return grid.tiles[x][y]
            } else {return false}
        } else { return false }
    },
    set: function(grid,x,y,set) {
        if (grid.tiles[x]) {
           grid.tiles[x][y]= set;
        } else {
            grid.tiles[x] = []
            grid.tiles[x][y] = set;
        }
    },
    render: function(grid,objects,camX,camY,screenW,screenH,tilesize,ontile,spillBottom,spillTop,spillLeft,spillRight) {
        var offsetX = Math.floor(camX % tilesize);
        var offsetY = Math.floor(camY % tilesize);
        var tileX = Math.floor((camX - offsetX) / tilesize);
        var tileY = Math.floor((camY - offsetY) / tilesize);

        var gridWidth = Math.ceil(screenW/tilesize)+2;
        var gridHeight = Math.ceil(screenH/tilesize)+1;

        for (var x = 0; x < gridWidth; x++) {
            for (var y = 0; y < gridHeight; y++) {
                var item = this.get(grid,tileX+x,tileY+y)
                if (item) {
                    var z = util.zToScreen(util.fromTile(tileY+y,tilesize),Math.floor(camY));
                    ontile(item,
                    -offsetX + (x-1)*tilesize,
                    util.convertY(-offsetY + (y+1)*tilesize,screenH),
                    z,objects)
                }
            }
        }

    }
};

const generation = {
    generateTemporary: function(w,h) {
        let grid = tiles.new()
        for (var x=0; x<w; x++) {
            for (var y=0; y<h; y++) {
                // console.log(x + " " + y)
                if (util.random(1,2) == 1) {
                    tiles.set(grid,x,y,true)
                } else {
                    tiles.set(grid,x,y,false)
                }
            }
        }
        return grid
    }
};

const images = graphics.loadassets();

var level = generation.generateTemporary(500,100)

console.log(util.fromTile(1,32))

var x = 0;
var y = 0;

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
    y += time/5  
    }
    if (isKeyPressed("ArrowDown")) {
        y -= time/5  
    }

    //the higher the z index, the further back it appears
    //rendering
    var renderQueue = []
    // zindex.create(renderQueue,10,function() {
    //     ctx.fillStyle = 'white';
    //     ctx.fillRect(0,0,x,y);
    // })
    // zindex.create(renderQueue,1,function() {
    //     ctx.fillStyle = 'red';
    //     ctx.fillRect(5,5,100,70);
    // })



    ctx.clearRect(0,0,480,360)

    // zindex.render(renderQueue,ctx)
    // ctx.drawImage(images.lemons,0,0)
    // ctx.drawImage(images.cobblestoneFloor,0,0)
    tiles.render(level,renderQueue,x,y,480,360,32,graphics.drawtile)
    
    // zindex.sort(renderQueue)
    zindex.render(renderQueue)

    lastTime = timestamp
    requestAnimationFrame(render)
}

render()