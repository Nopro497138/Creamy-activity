// Zombie definitions
export const ZOMBIES = {
  regular: {
    name: "Zombie",       hp: 100,  speed: 30, dmg: 2,  scale: 1.0,
    sprite: "zombie_regular",
    frames: { walk:[0,1,2,3,4,5,6,7], attack:[8,9,10,11], die:[12,13,14,15,16] },
    reward: 10,
  },
  cone: {
    name: "Conehead",     hp: 280,  speed: 30, dmg: 2,  scale: 1.1,
    sprite: "zombie_cone",
    frames: { walk:[0,1,2,3,4,5,6,7], attack:[8,9,10,11], die:[12,13,14,15,16] },
    reward: 15,
  },
  bucket: {
    name: "Buckethead",   hp: 650,  speed: 30, dmg: 2,  scale: 1.1,
    sprite: "zombie_bucket",
    frames: { walk:[0,1,2,3,4,5,6,7], attack:[8,9,10,11], die:[12,13,14,15,16] },
    reward: 20,
  },
  flag: {
    name: "Flag Zombie",  hp: 100,  speed: 35, dmg: 2,  scale: 1.0,
    sprite: "zombie_flag",
    frames: { walk:[0,1,2,3,4,5,6,7], attack:[8,9,10,11], die:[12,13,14,15,16] },
    reward: 10,
  },
  newspaper: {
    name: "Newspaper",    hp: 150,  speed: 30, dmg: 2,  scale: 1.05,
    sprite: "zombie_newspaper",
    frames: { walk:[0,1,2,3], enraged:[4,5,6,7,8,9], die:[10,11,12,13] },
    reward: 15,
  },
  football: {
    name: "Football",     hp: 800,  speed: 40, dmg: 4,  scale: 1.3,
    sprite: "zombie_football",
    frames: { walk:[0,1,2,3,4,5,6,7], attack:[8,9,10,11], die:[12,13,14,15,16] },
    reward: 30,
  },
  polevault: {
    name: "Pole Vaulting",hp: 100,  speed: 40, dmg: 2,  scale: 1.05,
    sprite: "zombie_polevault",
    frames: { walk:[0,1,2,3], vault:[4,5,6,7,8], die:[9,10,11,12] },
    reward: 15,
  },
  gargantuar: {
    name: "Gargantuar",   hp: 3000, speed: 20, dmg: 20, scale: 1.8,
    sprite: "zombie_gargantuar",
    frames: { walk:[0,1,2,3,4,5], attack:[6,7,8,9,10], die:[11,12,13,14,15] },
    reward: 50,
    throwsImp: true,
  },
  imp: {
    name: "Imp",          hp: 50,   speed: 45, dmg: 2,  scale: 0.7,
    sprite: "zombie_imp",
    frames: { walk:[0,1,2,3,4,5,6,7], attack:[8,9,10], die:[11,12,13] },
    reward: 5,
  },
};
