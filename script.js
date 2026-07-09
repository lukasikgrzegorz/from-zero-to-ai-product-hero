var character = document.querySelector(".character");
var map = document.querySelector(".map");
var mapItemAiph = document.querySelector(".map-item--aiph");
var mapItemAiph2 = document.querySelector(".map-item--aiph2");
var mapItemAiph3 = document.querySelector(".map-item--aiph3");
var mapItemBrush = document.querySelector(".map-item--brush");
var mapItemHtml = document.querySelector(".map-item--html");
var mapItemJs = document.querySelector(".map-item--js");
var mapItemCoins = document.querySelector(".map-item--coins");
var mapItemRobot = document.querySelector(".map-item--robot");
var gameMessage = document.querySelector(".game-message");
var victoryOverlay = document.querySelector(".victory-overlay");
var victoryIcon = document.querySelector(".victory-icon");
var victoryTitle = document.querySelector(".victory-title");
var victorySubtitle = document.querySelector(".victory-subtitle");
var victoryHint = document.querySelector(".victory-hint");
var hudLevel = document.querySelector(".hud-level");
var startOverlay = document.querySelector(".start-overlay");
var gameStarted = false;

//start in the middle of the map
var x = 90;
var y = 34;
var held_directions = []; //State of which arrow keys we are holding down
var speed = 1; //How fast the character moves in pixels per frame
var spaceHeld = false;
var horizonsHeld = false;
var hasAiphItem = false;
var hasAiph2Item = false;
var hasAiph3Item = false;
var hasBrushItem = false;
var hasHtmlItem = false;
var hasJsItem = false;
var hasCoinsItem = false;
var hasRobotItem = false;
var cloneSpreadMax = 32; //2 tiles left/right (1 tile = 16 units)
var cloneSpread = 0; //current animated distance from the player
var cloneSpreadSpeed = 2.5; //units per frame
var tileSize = 16;
var itemCenterOffset = tileSize / 2 - 1; //centered like the 2x2 character
var aiphX = x + itemCenterOffset;
var aiphY = y + itemCenterOffset + tileSize * 5 + 3; //5 tiles below character start
var aiph2X = aiphX;
var aiph2Y = aiphY + tileSize * 14 + tileSize / 2 - 8; //14.5 tiles below AIPH, 8px up
var aiph3X = aiphX;
var aiph3Y = aiph2Y + tileSize * 16; //16 tiles below AIPH 2
var brushX = x - tileSize + itemCenterOffset; //1 tile left from start
var brushY = y + tileSize + itemCenterOffset; //1 tile down from start
var htmlX = x - tileSize * 4 + itemCenterOffset; //4 tiles left from start
var htmlY = y + tileSize + itemCenterOffset; //1 tile down from start
var jsX = htmlX + tileSize * 6; //6 tiles right from HTML
var jsY = htmlY + tileSize * 2; //2 tiles below HTML
var coinsX = htmlX + tileSize; //1 tile right from HTML
var coinsY = htmlY + tileSize * 2; //2 tiles below HTML
var robotX = jsX + tileSize * 2; //2 tiles right from JS
var robotY = jsY;
var messageTimeout = null;
var victoryTimeout = null;
var messageBlocking = false;

const clearMovementInput = () => {
   held_directions = [];
   spaceHeld = false;
   horizonsHeld = false;
   gamepadDirection = null;
   gamepadSpaceHeld = false;
   gamepadHorizonsHeld = false;
   isPressed = false;
   removePressedAll();
};

const dismissMessage = () => {
   if (!messageBlocking) return;
   messageBlocking = false;
   clearTimeout(messageTimeout);
   clearTimeout(victoryTimeout);
   gameMessage.classList.remove("visible");
   setTimeout(() => {
      gameMessage.hidden = true;
   }, 200);
   victoryOverlay.classList.remove("visible");
   setTimeout(() => {
      victoryOverlay.hidden = true;
   }, 350);
   clearMovementInput();
};

const incrementLevel = (amount = 1) => {
   const match = hudLevel.textContent.match(/Lv\.(\d+)/);
   const currentLevel = match ? parseInt(match[1], 10) : 0;
   hudLevel.textContent = `Lv.${currentLevel + amount}`;
};

const startGame = () => {
   if (gameStarted) return;
   gameStarted = true;
   startOverlay.classList.add("hidden");
   setTimeout(() => {
      startOverlay.remove();
   }, 400);
};

const showVictoryMessage = ({
   icon = "aiph",
   title,
   subtitle,
   hint = "",
   titleClass = "",
   subtitleClass = "",
   hintClass = "",
}) => {
   victoryIcon.className = `victory-icon victory-icon--${icon} pixel-art`;
   victoryTitle.textContent = title;
   victorySubtitle.textContent = subtitle;
   victoryHint.textContent = hint;
   victoryHint.hidden = !hint;
   victoryTitle.className = titleClass ? `victory-title ${titleClass}` : "victory-title";
   victorySubtitle.className = subtitleClass ? `victory-subtitle ${subtitleClass}` : "victory-subtitle";
   victoryHint.className = hintClass ? `victory-hint ${hintClass}` : "victory-hint";

   messageBlocking = true;
   clearMovementInput();
   victoryOverlay.hidden = false;
   requestAnimationFrame(() => {
      victoryOverlay.classList.add("visible");
   });
};

const showGameMessage = (text) => {
   messageBlocking = true;
   clearMovementInput();
   gameMessage.textContent = text;
   gameMessage.hidden = false;
   gameMessage.classList.add("visible");
};

const createClone = () => {
   var clone = character.cloneNode(true);
   clone.classList.add("clone");
   map.appendChild(clone);
   return clone;
};

var cloneLeft = createClone();
var cloneRight = createClone();

/* Direction key state */
const directions = {
   up: "up",
   down: "down",
   left: "left",
   right: "right",
};
const keys = {
   38: directions.up,
   37: directions.left,
   39: directions.right,
   40: directions.down,
};

/* Xbox / gamepad: A = Enter, B = Space, lewy analog + D-pad = ruch */
const STICK_DEADZONE = 0.35;
const GAMEPAD_BUTTONS = {
   a: 0,
   b: 1,
   y: 3,
   dpadUp: 12,
   dpadDown: 13,
   dpadLeft: 14,
   dpadRight: 15,
};
var gamepadDirection = null;
var gamepadSpaceHeld = false;
var gamepadHorizonsHeld = false;
var gamepadButtonState = {};
var gamepadActive = false;

const directionFromStick = (stickX, stickY) => {
   if (Math.abs(stickX) < STICK_DEADZONE && Math.abs(stickY) < STICK_DEADZONE) {
      return null;
   }
   if (Math.abs(stickX) > Math.abs(stickY)) {
      return stickX < 0 ? directions.left : directions.right;
   }
   return stickY < 0 ? directions.up : directions.down;
};

const pollGamepad = () => {
   const pads = navigator.getGamepads ? navigator.getGamepads() : [];
   const pad = pads.find((p) => p && p.connected);

   if (!pad) {
      gamepadDirection = null;
      gamepadSpaceHeld = false;
      gamepadHorizonsHeld = false;
      gamepadButtonState = {};
      gamepadActive = false;
      return;
   }

   const stickX = pad.axes[0] || 0;
   const stickY = pad.axes[1] || 0;
   const stickMoved =
      Math.abs(stickX) > STICK_DEADZONE ||
      Math.abs(stickY) > STICK_DEADZONE;
   const dpadPressed =
      pad.buttons[GAMEPAD_BUTTONS.dpadUp]?.pressed ||
      pad.buttons[GAMEPAD_BUTTONS.dpadDown]?.pressed ||
      pad.buttons[GAMEPAD_BUTTONS.dpadLeft]?.pressed ||
      pad.buttons[GAMEPAD_BUTTONS.dpadRight]?.pressed;
   const anyButtonPressed = pad.buttons.some((button) => button?.pressed);

   if (anyButtonPressed || dpadPressed || stickMoved) {
      gamepadActive = true;
   }
   if (!gamepadActive) {
      gamepadDirection = null;
      gamepadSpaceHeld = false;
      gamepadHorizonsHeld = false;
      return;
   }

   let dir = null;
   if (pad.buttons[GAMEPAD_BUTTONS.dpadUp]?.pressed) dir = directions.up;
   else if (pad.buttons[GAMEPAD_BUTTONS.dpadDown]?.pressed) dir = directions.down;
   else if (pad.buttons[GAMEPAD_BUTTONS.dpadLeft]?.pressed) dir = directions.left;
   else if (pad.buttons[GAMEPAD_BUTTONS.dpadRight]?.pressed) dir = directions.right;
   else dir = directionFromStick(stickX, stickY);

   gamepadDirection = dir;

   const bPressed = !!pad.buttons[GAMEPAD_BUTTONS.b]?.pressed;
   gamepadSpaceHeld = bPressed;

   const yPressed = !!pad.buttons[GAMEPAD_BUTTONS.y]?.pressed;
   gamepadHorizonsHeld = yPressed;

   const aPressed = !!pad.buttons[GAMEPAD_BUTTONS.a]?.pressed;
   const wasAPressed = !!gamepadButtonState.a;
   if (!gameStarted) {
      if (aPressed && !wasAPressed) {
         startGame();
      }
   } else if (aPressed && !wasAPressed) {
      document.dispatchEvent(new KeyboardEvent("keydown", { code: "Enter", key: "Enter", bubbles: true }));
   } else if (!aPressed && wasAPressed) {
      document.dispatchEvent(new KeyboardEvent("keyup", { code: "Enter", key: "Enter", bubbles: true }));
   }
   gamepadButtonState.a = aPressed;
};

window.addEventListener("gamepadconnected", () => {
   gamepadActive = false;
});

const placeCharacter = () => {
   
   var pixelSize = parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue('--pixel-size')
   ) || 2;
   
   const held_direction = messageBlocking ? null : (gamepadDirection || held_directions[0]);
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

   const characterCenterX = x + tileSize;
   const characterCenterY = y + tileSize;
   const pickupRadius = tileSize * 0.75;
   const tryPickup = (itemEl, itemCollected, itemX, itemY, onCollect) => {
      if (itemCollected || !itemEl) return itemCollected;
      const itemCenterX = itemX + tileSize / 2;
      const itemCenterY = itemY + tileSize / 2;
      const distance = Math.hypot(
         characterCenterX - itemCenterX,
         characterCenterY - itemCenterY
      );
      if (distance < pickupRadius) {
         itemEl.classList.add("collected");
         onCollect();
         return true;
      }
      return itemCollected;
   };

   hasAiphItem = tryPickup(mapItemAiph, hasAiphItem, aiphX, aiphY, () => {
      showVictoryMessage({
         icon: "aiph",
         title: "UKOŃCZONO",
         subtitle: "AIPH EDYCJA 1",
         hint: "ODBLOKOWANO ULTIMATE SKILL GENERALISTA",
         titleClass: "victory-title--secondary",
         subtitleClass: "victory-subtitle--hero",
         hintClass: "victory-hint--skill",
      });
   });

   hasAiph2Item = tryPickup(mapItemAiph2, hasAiph2Item, aiph2X, aiph2Y, () => {
      showVictoryMessage({
         icon: "aiph",
         title: "UKOŃCZONO",
         subtitle: "AIPH EDYCJA 2",
         hint: "ODBLOKOWANO ULTIMATE SKILL NOWE HORYZONTY",
         titleClass: "victory-title--secondary",
         subtitleClass: "victory-subtitle--hero",
         hintClass: "victory-hint--skill",
      });
   });

   hasAiph3Item = tryPickup(mapItemAiph3, hasAiph3Item, aiph3X, aiph3Y, () => {
      showVictoryMessage({
         icon: "aiph",
         title: "ZAPISANY NA",
         subtitle: "AIPH EDYCJA 3",
         hint: "START 19.10.2026",
         titleClass: "victory-title--secondary",
         subtitleClass: "victory-subtitle--hero",
         hintClass: "victory-hint--skill",
      });
   });

   hasBrushItem = tryPickup(mapItemBrush, hasBrushItem, brushX, brushY, () => {
      incrementLevel(2);
      showVictoryMessage({
         icon: "brush",
         title: "Odblokowano",
         subtitle: "Skil Grafik",
         hint: "Level +2",
         titleClass: "victory-title--secondary",
         subtitleClass: "victory-subtitle--hero",
         hintClass: "victory-hint--level",
      });
   });

   hasHtmlItem = tryPickup(mapItemHtml, hasHtmlItem, htmlX, htmlY, () => {
      incrementLevel(2);
      showVictoryMessage({
         icon: "html",
         title: "Odblokowano",
         subtitle: "Skill Webmaster",
         hint: "Level +2",
         titleClass: "victory-title--secondary",
         subtitleClass: "victory-subtitle--hero",
         hintClass: "victory-hint--level",
      });
   });

   hasJsItem = tryPickup(mapItemJs, hasJsItem, jsX, jsY, () => {
      incrementLevel(3);
      showVictoryMessage({
         icon: "js",
         title: "Odblokowano",
         subtitle: "Skill Web Developer",
         hint: "Level +3",
         titleClass: "victory-title--secondary",
         subtitleClass: "victory-subtitle--hero",
         hintClass: "victory-hint--level",
      });
   });

   hasCoinsItem = tryPickup(mapItemCoins, hasCoinsItem, coinsX, coinsY, () => {
      incrementLevel(6);
      showVictoryMessage({
         icon: "coins",
         title: "Odblokowano",
         subtitle: "Skill Obsługa klienta",
         hint: "Level +6",
         titleClass: "victory-title--secondary",
         subtitleClass: "victory-subtitle--hero",
         hintClass: "victory-hint--level",
      });
   });

   hasRobotItem = tryPickup(mapItemRobot, hasRobotItem, robotX, robotY, () => {
      incrementLevel(3);
      showVictoryMessage({
         icon: "robot",
         title: "Odblokowano",
         subtitle: "Skill Sztuczna inteligencja",
         hint: "Level +3",
         titleClass: "victory-title--secondary",
         subtitleClass: "victory-subtitle--hero",
         hintClass: "victory-hint--level",
      });
   });

   const targetSpread = ((spaceHeld || gamepadSpaceHeld) && hasAiphItem) ? cloneSpreadMax : 0;
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

   const horizonsActive = hasAiph2Item && (horizonsHeld || gamepadHorizonsHeld);
   map.classList.toggle("horizons-active", horizonsActive);

   const placeMapItem = (itemEl, itemCollected, itemX, itemY) => {
      if (itemEl && !itemCollected) {
         itemEl.style.transform = `translate3d( ${itemX*pixelSize}px, ${itemY*pixelSize}px, 0 )`;
      }
   };

   placeMapItem(mapItemAiph, hasAiphItem, aiphX, aiphY);
   placeMapItem(mapItemAiph2, hasAiph2Item, aiph2X, aiph2Y);
   placeMapItem(mapItemAiph3, hasAiph3Item, aiph3X, aiph3Y);
   placeMapItem(mapItemBrush, hasBrushItem, brushX, brushY);
   placeMapItem(mapItemHtml, hasHtmlItem, htmlX, htmlY);
   placeMapItem(mapItemJs, hasJsItem, jsX, jsY);
   placeMapItem(mapItemCoins, hasCoinsItem, coinsX, coinsY);
   placeMapItem(mapItemRobot, hasRobotItem, robotX, robotY);
}


const setSpaceHeld = (held) => {
   if (held && !hasAiphItem) return;
   spaceHeld = held;
};

const setHorizonsHeld = (held) => {
   if (held && !hasAiph2Item) return;
   horizonsHeld = held;
};

const pressDirection = (dir) => {
   if (messageBlocking) return;
   if (dir && held_directions.indexOf(dir) === -1) {
      held_directions.unshift(dir);
   }
};

const releaseDirection = (dir) => {
   const index = held_directions.indexOf(dir);
   if (index > -1) {
      held_directions.splice(index, 1);
   }
};

document.addEventListener("keydown", (e) => {
   if (!gameStarted) {
      if (e.code === "Enter" || e.code === "Space" || e.key === " ") {
         e.preventDefault();
         startGame();
      }
      return;
   }
   if (e.code === "Space" || e.key === " ") {
      e.preventDefault();
      setSpaceHeld(true);
      return;
   }
   if (e.code === "ControlLeft" || e.code === "ControlRight") {
      e.preventDefault();
      setHorizonsHeld(true);
      return;
   }
   if (e.code === "Enter") {
      e.preventDefault();
      dismissMessage();
      return;
   }
   var dir = keys[e.which];
   pressDirection(dir);
})

startOverlay.addEventListener("click", startGame);

document.addEventListener("keyup", (e) => {
   if (!gameStarted) return;
   if (e.code === "Space" || e.key === " ") {
      setSpaceHeld(false);
      return;
   }
   if (e.code === "ControlLeft" || e.code === "ControlRight") {
      horizonsHeld = e.getModifierState("Control") && hasAiph2Item;
      return;
   }
   var dir = keys[e.which];
   releaseDirection(dir);
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
   if (messageBlocking) return;
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

placeCharacter();

//Set up the game loop
const step = () => {
   pollGamepad();
   if (gameStarted) {
      placeCharacter();
   }
   window.requestAnimationFrame(step);
};
step();