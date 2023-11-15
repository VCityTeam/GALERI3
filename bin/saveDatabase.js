const fs = require('fs');
const archiver = require('archiver');

const output = fs.createWriteStream('galeri3_database_save.zip');
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
archive.directory('./database', 'sqlite_database');

// append files from a sub-directory and naming it `new-subdir` within the archive
archive.directory('./packages/browser/assets/database', 'assets_database');

archive.finalize();
