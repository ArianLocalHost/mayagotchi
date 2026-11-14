/* =====================================================================
   TEXTS.JS  —  כל המילים במשחק נמצאות כאן. ALL GAME TEXT LIVES HERE.
   ---------------------------------------------------------------------
   Just change the words between the quotes "..." and save the file.
   - {name}  is replaced with the pet's name
   - \n      starts a new line
   - Numbers like {score} / {best} / {gained} / {hours} are filled in by
     the game — keep them if you want the number shown.
   ===================================================================== */

const TEXT = {

  /* ---------- the pet ---------- */
  defaultPetName: "מיה",

  /* ---------- first launch ---------- */
  welcomeTitle: "מזל טוב!",
  welcomeMessage:
    "הגעתי למסקנה שהמתנה הטובה ביותר שאוכל להביא לך ליום הולדת היא תינוק.\n" +
    "לכן החלטתי לשבט את ה-DNA שלך ולהכין גרסה כמעט מושלמת שלך שיכולה לחיות בתוך הטלפון, לגדול ואפילו למות.",

  welcomeNameLabel: "איך תרצי לקרוא לו?",
  welcomeButton: "בחרתי שם",

  /* ---------- growing up ---------- */
  evolveTitle: "וואו!",
  evolveTeen: "{name} סוף סוף גדל, ובקרוב מאוד הוא ימות...",
  evolveAdult: "{name} הפך להיות הכי מבוגר שהוא כבר יכול",
  evolveButton: "יש!",

  /* ---------- final birthday message (once, when she is an adult) ---------- */
  finalTitle: "יום הולדת שמח!",
  finalMessage:
    "{name} כבר גדל לגמרי.\n" +
    "מסתבר שהוא בכלל לא יכול למות ויחיה לנצח נצחים...\n" +
    "חבל...\n" +
    "אני אוהב אותך!",
  finalButton: "❤",

  /* ---------- things the pet says when you poke it ---------- */
  petSays: [
    "יום הולדת שמח... בינתיים",
    "תפסיקי לגעת בי בבקשה...",
    "עוד פעם אחת אני מתקשר למשטרה",
    "אל תגעי בי",
    "הלו משטרה הצילווו"
  ],
  hungry: "אני רעב מאוד...",
  sleepy: "אני עייף...",
  dirty: "אני מריח כמו חרא...",
  bored: "אפשר לשחק בבקשה?",
  full: "די כבר אני שבע כמה אפשר",
  sleepingPoke: "זזז...",

  /* ---------- hints shown when entering a room ---------- */
  hintKitchen: "תגררי את האוכל אל {name}",
  hintBathroom: "עם הסבון {name} תשפשפי את",
  hintBedroom: "תכבי את האור כדי לתת ליצור המסכן הזה לישון",
  hintGame: "",

  /* ---------- names ---------- */
  rooms: { kitchen: "מטבח", bathroom: "מקלחת", bedroom: "חדר שינה", game: "חצר משחקים" },
  stages: { baby: "תינוק", teen: "נער", adult: "מבוגר" },
  stats: { hunger: "אוכל", happiness: "כיף", energy: "אנרגיה", cleanliness: "ניקיון" },

  // Food names — the key on the left must match the food "id" in config.js
  foods: {
    apple: "קליק",
    burger: "ראמן",
    pizza: "פסטה",
    carrot: "סושי (צמחוני)",
    icecream: "שוקו",
    cake: "עוגיות"
  },

  /* ---------- rename popup ---------- */
  renameTitle: "שם",
  save: "שמירה",
  cancel: "ביטול",
  ok: "אישור",

  /* ---------- minigame ---------- */
  minigame: {
    title: "משחק האוכל הגדול",
    intro: "תאכלי את האוכל, תתפסי את הסמיסקי בשביל יותר נקודות ואל תאכלי פחם, זה גם חשוב",
    best: "שיא: {best}",
    play: "שחקי!",
    playAgain: "עוד סיבוב",
    back: "חזרה",
    timeUp: "נגמר הזמן!",
    result: "ניקוד: {score}\nשיא: {best}\n\n+{gained} כיף!",
    stopped: "המשחק נעצר."
  },

  loading: "טוען...",
  pageTitle: "מיהגוצ'י",          // the browser tab / home-screen name

  /* ---------- developer panel (only you see this, with ?dev=1) ---------- */
  dev: {
    open: "🛠",
    title: "מצב בדיקה",
    time: "זמן",
    rooms: "חדרים",
    stage: "שלב",
    stats: "מדדים",
    faces: "הבעות",
    popups: "חלונות",
    other: "שונות",
    skipped: "+{hours} שעות",
    allLow: "הכל נמוך",
    allFull: "הכל מלא",
    dirty: "מלוכלכת",
    sleep: "שינה",
    welcome: "ברוכה הבאה",
    evolve: "גדילה",
    final: "הודעת סיום",
    minigame: "משחק",
    endRound: "סיים סיבוב",
    reset: "איפוס שמירה",
    resetSure: "בטוח? לחץ שוב",
    close: "סגור",
    age: "גיל: {hours} שעות"
  }
};
