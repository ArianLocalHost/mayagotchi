/* =====================================================================
   CONFIG.JS  —  GAME SETTINGS AND IMAGE PATHS
   ---------------------------------------------------------------------
   (All WORDS / TEXT are in js/texts.js)
   - GAME     : growth timing, stat decay, how much actions restore
   - ASSETS   : paths to your PNG images
   - FOODS    : the food list in the kitchen
   You never need to touch game.js to change art, text or balance.

   IMPORTANT: paths are RELATIVE (no "/" at the start) so the game
   works on GitHub Pages, Netlify, or a local server alike.
   If an image file is missing, the game automatically draws a
   built-in placeholder instead — it never shows a broken image.
   ===================================================================== */

/* ---------------------------------------------------------------------
   1) GAME BALANCE
   --------------------------------------------------------------------- */
const GAME = {
  // GROWTH: hours of REAL time (keeps counting while the game is closed).
  // For a quick test, set e.g. teenAfterHours: 0.01 (36 seconds).
  growth: {
    teenAfterHours: 24,
    adultAfterHours: 48
  },

  // How big each stage is drawn (1 = full sprite size). Draw all your
  // pet PNGs on the same canvas size; the game shrinks the younger ones.
  stageScale: { baby: 0.7, teen: 0.85, adult: 1.0 },

  // STAT DECAY: points lost per HOUR (stats go from 0 to 100).
  decayPerHour: {
    hunger: 5,        // ~20 h from full to empty
    happiness: 4,
    energy: 4,        // only while awake
    cleanliness: 3
  },
  sleepEnergyPerHour: 30,   // energy gained per hour while sleeping
  sleepDecayMultiplier: 0.5,// hunger/happiness/cleanliness drop half as fast while asleep
  minStatFromTime: 5,       // time alone never pushes a stat below this (forgiving!)

  // ACTIONS
  pokeHappiness: 1,         // tapping the pet
  soapPerBubble: 1.5,       // cleanliness per soap bubble while rubbing
  showerCleanliness: 15,    // bonus when rinsing with the shower
  showerHappiness: 3,
  gameEnergyCost: 5,        // playing the minigame uses a bit of energy
  gameHappinessBase: 10,    // happiness for finishing a round...
  gameHappinessPerPoint: 1, // ...plus this per point...
  gameHappinessMax: 40,     // ...up to this

  // Thresholds for moods
  lowStat: 25,              // below this: sad face + blinking icon
  dirtyBelow: 45,           // below this cleanliness: dirt overlay appears

  // Minigame
  minigameSeconds: 30,
  minigameFloor: 70,        // px from the bottom where the pet stands in the minigame
                            // (match the ground in your minigame background)

  // Stats for a brand new pet
  startStats: { hunger: 80, happiness: 90, energy: 90, cleanliness: 100 },

  // Developer tools: open the game with ?dev=1 at the end of the URL
  // (or set this to true) to get the 🛠 test panel. Turn off before sending!
  devMode: false,

  sound: true,              // sound effects on by default
  saveKey: "mihagotchi_v1" // change this to start a totally fresh save
};

/* ---------------------------------------------------------------------
   2) ASSETS  — swap these files for your own PNGs
   ---------------------------------------------------------------------
   Pet sprites:  512 x 512 px, transparent background, the pet standing
                 on the BOTTOM CENTER of the canvas. Same canvas size
                 for all stages (see GAME.stageScale).
   Missing expression? -> uses that stage's idle.png.
   Missing idle.png    -> uses the built-in placeholder.
   --------------------------------------------------------------------- */
const ASSETS = {
  pet: {
    baby: {
      idle:     "assets/pet/baby/idle.webp",
      happy:    "assets/pet/baby/happy.webp",
      sad:      "assets/pet/baby/sad.webp",
      eating:   "assets/pet/baby/eating.webp",
      sleeping: "assets/pet/baby/sleeping.webp"   // also used for blinking
    },
    teen: {
      idle:     "assets/pet/teen/idle.webp",
      happy:    "assets/pet/teen/happy.webp",
      sad:      "assets/pet/teen/sad.webp",
      eating:   "assets/pet/teen/eating.webp",
      sleeping: "assets/pet/teen/sleeping.webp"
    },
    adult: {
      idle:     "assets/pet/adult/idle.webp",
      happy:    "assets/pet/adult/happy.webp",
      sad:      "assets/pet/adult/sad.webp",
      eating:   "assets/pet/adult/eating.webp",
      sleeping: "assets/pet/adult/sleeping.webp"
    },
    // Dirt spots drawn ON TOP of the pet when it is dirty (all stages).
    dirt: "assets/pet/dirt.webp"
  },

  // Room backgrounds: 720 x 1440 px (portrait), no transparency needed.
  // Keep the floor in the bottom ~30%; edges may be cropped on some phones.
  rooms: {
    kitchen:  "assets/rooms/kitchen.webp",
    bathroom: "assets/rooms/bathroom.webp",
    bedroom:  "assets/rooms/bedroom.webp",
    game:     "assets/rooms/game.webp"
  },

  // Small icons / tools: 128 x 128 px, transparent background.
  ui: {
    hunger:      "assets/ui/hunger.png",
    happiness:   "assets/ui/happiness.png",
    energy:      "assets/ui/energy.png",
    cleanliness: "assets/ui/cleanliness.png",
    arrowLeft:   "assets/ui/arrow-left.png",
    arrowRight:  "assets/ui/arrow-right.png",
    soap:        "assets/ui/soap.webp",
    shower:      "assets/ui/shower.webp",
    lamp:        "assets/ui/lamp.webp",
    play:        "assets/ui/play.webp",
    soundOn:     "assets/ui/sound-on.png",
    soundOff:    "assets/ui/sound-off.png"
  },

  // Minigame: background 720 x 1440 px (no transparency, ground at the bottom),
  // falling items 128 x 128 px transparent. (Good items also include every food.)
  minigame: {
    background: "assets/minigame/background.webp",
    star: "assets/minigame/star.webp",
    rock: "assets/minigame/rock.webp"
  }
};

/* ---------------------------------------------------------------------
   3) FOODS  — add, remove or reorder freely.
   image: 256 x 256 px, transparent.  hunger/happiness: points restored.
   --------------------------------------------------------------------- */
const FOODS = [
  { id: "apple",    image: "assets/food/apple.webp",    hunger: 15, happiness: 1 },
  { id: "burger",   image: "assets/food/burger.webp",   hunger: 30, happiness: 2 },
  { id: "pizza",    image: "assets/food/pizza.webp",    hunger: 25, happiness: 3 },
  { id: "carrot",   image: "assets/food/carrot.webp",   hunger: 12, happiness: 0 },
  { id: "icecream", image: "assets/food/icecream.webp", hunger: 10, happiness: 6 },
  { id: "cake",     image: "assets/food/cake.webp",     hunger: 20, happiness: 8 }
];
