// to load a backup backend has to be restart
const { exec } = require('child-process-promise');
const extract = require('extract-zip');
const path = require('path');

const main = async () => {
  const pathBackup = process.argv[2];

  // delete old one
  await exec('rm -f  -r ./database && rm -f  -r ./private_assets');

  try {
    await extract(pathBackup, { dir: path.resolve(__dirname, '../temp') });
    console.log('Extraction complete');

    await exec(
      'mv ./temp/private_assets/ ./private_assets && mv ./temp/database/ ./database'
    );

    // delete temp directory
    await exec('rm -f -r ./temp');

    console.log('backup ' + pathBackup + ' has loaded !');
  } catch (err) {
    // handle any errors
    console.error(err);
  }
};

main();
