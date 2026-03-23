// Plant definitions — sprite keys must match assets loaded in PreloadScene
export const PLANTS = {
  peashooter: {
    name: "Peashooter",   cost: 100, hp: 300, recharge: 7500,
    description: "Shoots peas at zombies",
    sprite: "plant_peashooter",
    shootRate: 2000, dmg: 20, projType: "pea",
    frames: { idle:[0,1,2,3], shoot:[4,5,6] },
    sunProduction: false,
  },
  sunflower: {
    name: "Sunflower",    cost: 50,  hp: 300, recharge: 7500,
    description: "Produces sun over time",
    sprite: "plant_sunflower",
    sunRate: 24000, sunAmt: 25,
    frames: { idle:[0,1,2,3,4,5], produce:[6,7,8] },
    sunProduction: true,
  },
  wallnut: {
    name: "Wall-nut",     cost: 50,  hp: 4000, recharge: 30000,
    description: "Tough nut that blocks zombies",
    sprite: "plant_wallnut",
    frames: { idle:[0], damaged:[1], critical:[2] },
  },
  cherrybomb: {
    name: "Cherry Bomb",  cost: 150, hp: 300, recharge: 50000,
    description: "Explodes, killing all zombies nearby",
    sprite: "plant_cherrybomb",
    instant: true, aoe: true, aoeDmg: 1800, aoeRange: 1.5,
    frames: { idle:[0,1,2], explode:[3,4,5,6] },
  },
  snowpea: {
    name: "Snow Pea",     cost: 175, hp: 300, recharge: 7500,
    description: "Shoots frozen peas that slow zombies",
    sprite: "plant_snowpea",
    shootRate: 2000, dmg: 20, projType: "snowpea", slow: true,
    frames: { idle:[0,1,2,3], shoot:[4,5,6] },
  },
  chomper: {
    name: "Chomper",      cost: 150, hp: 300, recharge: 7500,
    description: "Swallows a zombie whole, then must chew",
    sprite: "plant_chomper",
    chomp: true, rechargeTicks: 42000,
    frames: { idle:[0,1,2], chomp:[3,4,5,6,7], chewing:[8,9] },
  },
  repeater: {
    name: "Repeater",     cost: 200, hp: 300, recharge: 7500,
    description: "Fires two peas at a time",
    sprite: "plant_repeater",
    shootRate: 2000, dmg: 20, projType: "pea", doubleShot: true,
    frames: { idle:[0,1,2,3], shoot:[4,5,6] },
  },
  potatomine: {
    name: "Potato Mine",  cost: 25,  hp: 300, recharge: 30000,
    description: "Armed mine that explodes on contact",
    sprite: "plant_potatomine",
    mine: true, mineDmg: 1800, armDelay: 15000,
    frames: { unarmed:[0,1], arming:[2,3,4], armed:[5], explode:[6,7,8] },
  },
  iceshroom: {
    name: "Ice-shroom",   cost: 75,  hp: 300, recharge: 50000,
    description: "Freezes all zombies on screen temporarily",
    sprite: "plant_iceshroom",
    instant: true, freeze: true, freezeMs: 5000,
    frames: { idle:[0,1,2], burst:[3,4,5,6] },
  },
  squash: {
    name: "Squash",       cost: 50,  hp: 300, recharge: 30000,
    description: "Leaps on and instantly kills one zombie",
    sprite: "plant_squash",
    instant: true, squash: true, squashDmg: 9999,
    frames: { idle:[0], jump:[1,2,3,4,5] },
  },
  tallnut: {
    name: "Tall-nut",     cost: 125, hp: 8000, recharge: 30000,
    description: "Extra-tall wall that even blocks vaulters",
    sprite: "plant_tallnut",
    frames: { idle:[0], damaged:[1], critical:[2] },
  },
  threepeater: {
    name: "Threepeater",  cost: 325, hp: 300, recharge: 7500,
    description: "Fires peas into three lanes",
    sprite: "plant_threepeater",
    shootRate: 2000, dmg: 20, projType: "pea", threeRow: true,
    frames: { idle:[0,1,2,3], shoot:[4,5,6] },
  },
  puffshroom: {
    name: "Puff-shroom",  cost: 0,   hp: 300, recharge: 7500,
    description: "Free mushroom, disappears after a while",
    sprite: "plant_puffshroom",
    shootRate: 2000, dmg: 20, projType: "pea", lifetime: 120000,
    frames: { idle:[0,1,2,3], shoot:[4,5] },
  },
};

// Plants available per level
export const LEVEL_PLANTS = {
  0: ["peashooter","sunflower","wallnut"],
  1: ["peashooter","sunflower","wallnut","puffshroom","snowpea"],
  2: ["peashooter","sunflower","wallnut","snowpea","repeater","potatomine"],
  3: ["peashooter","sunflower","wallnut","chomper","iceshroom","threepeater"],
  4: ["peashooter","sunflower","wallnut","snowpea","repeater","squash","tallnut","threepeater"],
};
