const fs = require('fs');
const archiver = require('archiver');
const { exec } = require('child-process-promise');

const main = async () => {
  await exec('mkdir -p ./backup');

  const filename = new Date(Date.now()).toISOString() + '.zip';
  const output = fs.createWriteStream('./backup/' + filename);
  const archive = archiver('zip');

  output.on('close', function () {
    console.log(archive.pointer() + ' total bytes');
    console.log(
      'archiver has been finalized and the output file descriptor has closed.'
    );
  });

  archive.on('error', function (err) {
    throw err;
  });

  archive.pipe(output);

  // append files from a sub-directory, putting its contents at the root of archive
  archive.directory('./database', 'database');

  // append files from a sub-directory and naming it `new-subdir` within the archive
  archive.directory('./private_assets', 'private_assets');

  archive.finalize();
};

main();
