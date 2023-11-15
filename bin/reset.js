const exec = require('child-process-promise').exec;
const THREE = require('three');
const fs = require('fs');

const resetTokenSecret = async () => {
  const newSecret = THREE.MathUtils.generateUUID();
  fs.writeFileSync('./.env', 'TOKEN_SECRET=' + newSecret);
};

// remove sqlite files
exec('rm -r  ./database/*');
// remove comments images link in db
exec('rm -r  ./private_assets/database/**');

// re generate a token secret
resetTokenSecret();
