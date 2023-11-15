const THREE = require('three');
const fs = require('fs');

const newSecret = THREE.MathUtils.generateUUID();

fs.writeFileSync('./.env', 'TOKEN_SECRET=' + newSecret);
