const ADJECTIVES = [
  'Wandering', 'Lost', 'Epic', 'Clumsy', 'Sleepy', 'Fancy', 'Groovy', 'Hungry',
  'Mighty', 'Brave', 'Sparkly', 'Gentle', 'Wild', 'Chill', 'Sassy', 'Jolly',
  'Crafty', 'Daring', 'Zen', 'Funky', 'Vibrant', 'Silent', 'Cheerful', 'Lazy',
  'Quirky', 'Glorious', 'Mystic', 'Super', 'Hyper', 'Golden', 'Nomadic', 'Vagabond'
];

const NOUNS = [
  'Traveler', 'Potato', 'Explorer', 'Penguin', 'Koala', 'Wanderer', 'Pizza', 'Hiker',
  'Avocado', 'Ninja', 'Panda', 'Astronaut', 'Raccoon', 'Cactus', 'Unicorn', 'Dolphin',
  'Waffle', 'Goat', 'Taco', 'Dragon', 'Sloth', 'Wizard', 'Captain', 'Maverick',
  'Legend', 'Nomad', 'Tourist', 'Backpacker', 'Pilgrim', 'Wayfarer', 'Rover', 'Vagrant'
];

export function generateFunnyName(): string {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  return `${adj} ${noun}`;
}
