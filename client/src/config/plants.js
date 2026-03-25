// Plants config — nerfed stats for harder gameplay
export const PLANTS = {
  peashooter: {
    name:"Peashooter", cost:100, hp:220, recharge:7500,
    shootRate:2400, dmg:16, projType:"pea", sunProduction:false,
    description:"Shoots peas at zombies",
    sprite:"plant_peashooter",
  },
  sunflower: {
    name:"Sunflower", cost:50, hp:220, recharge:7500,
    sunRate:26000, sunAmt:25, sunProduction:true,
    description:"Produces sun over time",
    sprite:"plant_sunflower",
  },
  wallnut: {
    name:"Wall-nut", cost:50, hp:3200, recharge:30000,
    description:"Tough nut that blocks zombies",
    sprite:"plant_wallnut",
  },
  cherrybomb: {
    name:"Cherry Bomb", cost:150, hp:300, recharge:50000,
    instant:true, aoe:true, aoeDmg:1800, aoeRange:1.5,
    description:"Explodes killing nearby zombies",
    sprite:"plant_cherrybomb",
  },
  snowpea: {
    name:"Snow Pea", cost:175, hp:220, recharge:7500,
    shootRate:2400, dmg:16, projType:"snowpea", slow:true,
    description:"Shoots peas that slow zombies",
    sprite:"plant_snowpea",
  },
  chomper: {
    name:"Chomper", cost:150, hp:220, recharge:7500,
    chomp:true, rechargeTicks:44000,
    description:"Swallows one zombie whole",
    sprite:"plant_chomper",
  },
  repeater: {
    name:"Repeater", cost:200, hp:220, recharge:7500,
    shootRate:2400, dmg:16, projType:"pea", doubleShot:true,
    description:"Fires two peas at a time",
    sprite:"plant_repeater",
  },
  potatomine: {
    name:"Potato Mine", cost:25, hp:300, recharge:30000,
    mine:true, mineDmg:1800, armDelay:14000,
    description:"Arms then explodes on contact",
    sprite:"plant_potatomine",
  },
  iceshroom: {
    name:"Ice-shroom", cost:75, hp:300, recharge:50000,
    instant:true, freeze:true, freezeMs:4500,
    description:"Freezes all zombies briefly",
    sprite:"plant_iceshroom",
  },
  squash: {
    name:"Squash", cost:50, hp:300, recharge:30000,
    instant:true, squash:true, squashDmg:9999,
    description:"Leaps and crushes one zombie",
    sprite:"plant_squash",
  },
  tallnut: {
    name:"Tall-nut", cost:125, hp:6500, recharge:30000,
    description:"Extra-tall wall, blocks vaulters",
    sprite:"plant_tallnut",
  },
  threepeater: {
    name:"Threepeater", cost:325, hp:220, recharge:7500,
    shootRate:2400, dmg:16, projType:"pea", threeRow:true,
    description:"Fires peas into three lanes",
    sprite:"plant_threepeater",
  },
  puffshroom: {
    name:"Puff-shroom", cost:0, hp:220, recharge:7500,
    shootRate:2400, dmg:16, projType:"pea", lifetime:120000,
    description:"Free mushroom, disappears after a while",
    sprite:"plant_puffshroom",
  },
};

export const LEVEL_PLANTS = {
  0: ["peashooter","sunflower","wallnut"],
  1: ["peashooter","sunflower","wallnut","puffshroom","snowpea"],
  2: ["peashooter","sunflower","wallnut","snowpea","repeater","potatomine"],
  3: ["peashooter","sunflower","wallnut","chomper","iceshroom","threepeater"],
  4: ["peashooter","sunflower","wallnut","snowpea","repeater","squash","tallnut","threepeater"],
};
