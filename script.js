var character = document.querySelector(".character");
var map = document.querySelector(".map");
var mapItem = document.querySelector(".map-item");
var gameMessage = document.querySelector(".game-message");

//start in the middle of the map
var x = 90;
var y = 34;
var held_directions = []; //State of which arrow keys we are holding down
var speed = 1; //How fast the character moves in pixels per frame
var spaceHeld = false;
var hasAiphItem = false;
var cloneSpreadMax = 32; //2 tiles left/right (1 tile = 16 units)
var cloneSpread = 0; //current animated distance from the player
var cloneSpreadSpeed = 2.5; //units per frame
var tileSize = 16;
var itemX = x + tileSize / 2 - 1; //centered like the 2x2 character
var itemY = y + tileSize / 2 + tileSize * 5 + 3; //5 tiles below character start
var messageTimeout = null;

const showGameMessage = (text) => {
   gameMessage.textContent = text;
   gameMessage.hidden = false;
   gameMessage.classList.add("visible");
   clearTimeout(messageTimeout);
   messageTimeout = setTimeout(() => {
      gameMessage.classList.remove("visible");
      setTimeout(() => {
         gameMessage.hidden = true;
      }, 200);
   }, 2200);
};

const createClone = () => {
   var clone = character.cloneNode(true);
   clone.classList.add("clone");
   map.appendChild(clone);
   return clone;
};

var cloneLeft = createClone();
var cloneRight = createClone();

const placeCharacter = () => {
   
   var pixelSize = parseInt(
      getComputedStyle(document.documentElement).getPropertyValue('--pixel-size')
   );
   
   const held_direction = held_directions[0];
   if (held_direction) {
      if (held_direction === directions.right) {x += speed;}
      if (held_direction === directions.left) {x -= speed;}
      if (held_direction === directions.down) {y += speed;}
      if (held_direction === directions.up) {y -= speed;}
      character.setAttribute("facing", held_direction);
   }
   character.setAttribute("walking", held_direction ? "true" : "false");
   
   //Limits (gives the illusion of walls)
   var leftLimit = -8;
   var rightLimit = (16 * 11)+8;
   var topLimit = -8 + 32;
   var bottomLimit = (16 * 37);
   if (x < leftLimit) { x = leftLimit; }
   if (x > rightLimit) { x = rightLimit; }
   if (y < topLimit) { y = topLimit; }
   if (y > bottomLimit) { y = bottomLimit; }
   
   
   var camera_left = pixelSize * 66;
   var camera_top = pixelSize * 42;
   
   map.style.transform = `translate3d( ${-x*pixelSize+camera_left}px, ${-y*pixelSize+camera_top}px, 0 )`;
   character.style.transform = `translate3d( ${x*pixelSize}px, ${y*pixelSize}px, 0 )`;

   if (!hasAiphItem && mapItem) {
      const pickupDistance = tileSize * 1.25;
      if (
         Math.abs(x - itemX) < pickupDistance &&
         Math.abs(y - itemY) < pickupDistance
      ) {
         hasAiphItem = true;
         mapItem.classList.add("collected");
      }
   }

   const targetSpread = (spaceHeld && hasAiphItem) ? cloneSpreadMax : 0;
   if (cloneSpread < targetSpread) {
      cloneSpread = Math.min(cloneSpread + cloneSpreadSpeed, targetSpread);
   } else if (cloneSpread > targetSpread) {
      cloneSpread = Math.max(cloneSpread - cloneSpreadSpeed, targetSpread);
   }

   const facing = character.getAttribute("facing");
   const walking = character.getAttribute("walking");
   const clonesVisible = cloneSpread > 0;
   const placeClone = (clone, offsetX) => {
      clone.classList.toggle("active", clonesVisible);
      if (!clonesVisible) return;
      clone.setAttribute("facing", facing);
      clone.setAttribute("walking", walking);
      clone.style.transform = `translate3d( ${(x + offsetX)*pixelSize}px, ${y*pixelSize}px, 0 )`;
   };
   placeClone(cloneLeft, -cloneSpread);
   placeClone(cloneRight, cloneSpread);

   if (mapItem && !hasAiphItem) {
      mapItem.style.transform = `translate3d( ${itemX*pixelSize}px, ${itemY*pixelSize}px, 0 )`;
   }
}


//Set up the game loop
const step = () => {
   placeCharacter();
   window.requestAnimationFrame(() => {
      step();
   })
}
step(); //kick off the first step!



/* Direction key state */
const directions = {
   up: "up",
   down: "down",
   left: "left",
   right: "right",
}
const keys = {
   38: directions.up,
   37: directions.left,
   39: directions.right,
   40: directions.down,
}
document.addEventListener("keydown", (e) => {
   if (e.code === "Space" || e.key === " ") {
      e.preventDefault();
      if (!hasAiphItem) {
         showGameMessage("Zdobądź AIPH!");
         return;
      }
      spaceHeld = true;
      return;
   }
   var dir = keys[e.which];
   if (dir && held_directions.indexOf(dir) === -1) {
      held_directions.unshift(dir)
   }
})

document.addEventListener("keyup", (e) => {
   if (e.code === "Space" || e.key === " ") {
      spaceHeld = false;
      return;
   }
   var dir = keys[e.which];
   var index = held_directions.indexOf(dir);
   if (index > -1) {
      held_directions.splice(index, 1)
   }
});



/* BONUS! Dpad functionality for mouse and touch */
var isPressed = false;
const removePressedAll = () => {
   document.querySelectorAll(".dpad-button").forEach(d => {
      d.classList.remove("pressed")
   })
}
document.body.addEventListener("mousedown", () => {
   console.log('mouse is down')
   isPressed = true;
})
document.body.addEventListener("mouseup", () => {
   console.log('mouse is up')
   isPressed = false;
   held_directions = [];
   removePressedAll();
})
const handleDpadPress = (direction, click) => {   
   if (click) {
      isPressed = true;
   }
   held_directions = (isPressed) ? [direction] : []
   
   if (isPressed) {
      removePressedAll();
      document.querySelector(".dpad-"+direction).classList.add("pressed");
   }
}
//Bind a ton of events for the dpad
document.querySelector(".dpad-left").addEventListener("touchstart", (e) => handleDpadPress(directions.left, true));
document.querySelector(".dpad-up").addEventListener("touchstart", (e) => handleDpadPress(directions.up, true));
document.querySelector(".dpad-right").addEventListener("touchstart", (e) => handleDpadPress(directions.right, true));
document.querySelector(".dpad-down").addEventListener("touchstart", (e) => handleDpadPress(directions.down, true));

document.querySelector(".dpad-left").addEventListener("mousedown", (e) => handleDpadPress(directions.left, true));
document.querySelector(".dpad-up").addEventListener("mousedown", (e) => handleDpadPress(directions.up, true));
document.querySelector(".dpad-right").addEventListener("mousedown", (e) => handleDpadPress(directions.right, true));
document.querySelector(".dpad-down").addEventListener("mousedown", (e) => handleDpadPress(directions.down, true));

document.querySelector(".dpad-left").addEventListener("mouseover", (e) => handleDpadPress(directions.left));
document.querySelector(".dpad-up").addEventListener("mouseover", (e) => handleDpadPress(directions.up));
document.querySelector(".dpad-right").addEventListener("mouseover", (e) => handleDpadPress(directions.right));
document.querySelector(".dpad-down").addEventListener("mouseover", (e) => handleDpadPress(directions.down));