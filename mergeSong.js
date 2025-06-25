const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const path = require('path');
const inputFolder = '/home/anant/Downloads/';
const outputFolder = path.join(__dirname, 'songs');
const mergedFilePath = path.join(outputFolder, 'merged.mp3');
const fileListPath = path.join(outputFolder, 'filelist.txt');

const inputFiles = fs.readdirSync(inputFolder)
  .filter(file => file.endsWith('.mp3'))
  .map(file => path.join(inputFolder, file));

if (inputFiles.length < 2) {
  console.error('❌ Need at least 2 MP3 files to merge.');
  process.exit(1);
}

const fileListContent = inputFiles.map(file => `file '${file}'`).join('\n');
fs.writeFileSync(fileListPath, fileListContent);

ffmpeg()
  .input(fileListPath)
  .inputOptions(['-f concat', '-safe 0'])
  .outputOptions('-c copy')
  .on('start', cmd => {
    console.log('🔧 Merging started...');
    console.log('FFmpeg command:', cmd);
  })
  .on('error', (err, stdout, stderr) => {
    console.error('❌ Error during merging:', err.message);
    console.error(stderr);
  })
  .on('end', () => {
    console.log('✅ Merging complete! Output saved at:', mergedFilePath);
    fs.unlinkSync(fileListPath);
  })
  .save(mergedFilePath);
