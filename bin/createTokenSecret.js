const fs = require('fs');
const { MathUtils } = require('three');

const data = fs.readFileSync('./.env', { encoding: 'utf-8' });

// split the contents by new line
const lines = data.split(/\r?\n/);

// remove lines starting with TOKEN_SECRET
for (let index = lines.length - 1; index >= 0; index--) {
  const line = lines[index];
  if (line.startsWith('TOKEN_SECRET') || line == '') {
    lines.splice(index, 1);
  }
}

// new secret
lines.push('TOKEN_SECRET=' + MathUtils.generateUUID());

fs.writeFileSync('./.env', '');

// mermaid graph generation
lines.forEach((line) => {
  fs.appendFileSync('./.env', '\n' + line, (err) => {
    if (err) throw err;
  });
});
