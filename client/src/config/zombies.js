// Zombies config — buffed stats for harder gameplay
export const ZOMBIES = {
  regular:    { hp:180,  speed:28, dmg:3,  scale:1.15, sprite:"zombie_regular",    reward:10 },
  cone:       { hp:500,  speed:28, dmg:3,  scale:1.2,  sprite:"zombie_cone",       reward:15 },
  bucket:     { hp:1100, speed:28, dmg:3,  scale:1.2,  sprite:"zombie_bucket",     reward:20 },
  flag:       { hp:180,  speed:34, dmg:3,  scale:1.15, sprite:"zombie_flag",       reward:10 },
  newspaper:  { hp:280,  speed:28, dmg:3,  scale:1.1,  sprite:"zombie_newspaper",  reward:15 },
  football:   { hp:1400, speed:42, dmg:6,  scale:1.35, sprite:"zombie_football",   reward:30 },
  polevault:  { hp:180,  speed:42, dmg:3,  scale:1.1,  sprite:"zombie_polevault",  reward:15 },
  gargantuar: { hp:4200, speed:18, dmg:25, scale:1.85, sprite:"zombie_gargantuar", reward:50, throwsImp:true },
  imp:        { hp:80,   speed:48, dmg:3,  scale:0.75, sprite:"zombie_imp",        reward:5  },
};
