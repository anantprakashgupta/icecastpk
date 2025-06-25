const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const ffmpeg = require('fluent-ffmpeg');
const inputFolder = '/home/anant/Downloads/';
const outputFolder = path.join(__dirname, 'songs');
const mergedFilePath = path.join(outputFolder, 'merged.mp3');
const fileListPath = path.join(outputFolder, 'filelist.txt');
const icecastConfigPath = path.join(__dirname, 'icecast-config.json');

let ffmpegProcess = null;
let currentSong = 'merged.mp3';
let defaultSong = 'song.mp3';
const SONG_DIR = path.join(__dirname, 'songs');

app.use(express.static('public'));

app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.json());

// Load ICECAST config from JSON
function getIcecastConfig() {
    try {
      const config = JSON.parse(fs.readFileSync(icecastConfigPath, 'utf8'));
      return config.ICECAST || {}; // ✅ Only return ICECAST object, not full config
    } catch (err) {
      console.error('❌ Failed to load ICECAST config:', err.message);
      return {};
    }
  }
  
// Update ICECAST config
app.post('/update-icecast', (req, res) => {
  const { host, port, password, mount } = req.body;
  const newConfig = { host, port, password, mount };
  fs.writeFileSync(icecastConfigPath, JSON.stringify(newConfig, null, 2));
  fs.writeFileSync(path.join(__dirname, 'icecast-config.json'), JSON.stringify({ ICECAST: newConfig }, null, 2));
  res.json({ message: 'ICECAST config updated!' });

  console.log('🛠️ ICECAST config updated:', newConfig);
  startStreaming(currentSong); // restart stream with new config
});

// Merge songs
app.post('/merge-songs', (req, res) => {
  mergedSong();
  res.json({ message: 'Merging started!' });
});

// Get songs
app.get('/songs', (req, res) => {
  const files = fs.readdirSync(SONG_DIR).filter(file => file.endsWith('.mp3'));
  res.json({ songs: files, current: currentSong || defaultSong });
});

io.on('connection', (socket) => {
  console.log('✅ UI connected');
  socket.emit('now-playing', currentSong || defaultSong);
  socket.on('play-song', (song) => {
    startStreaming(song);
  });
});

function startStreaming(songFile) {
    const ICECAST = getIcecastConfig();
    console.log(ICECAST)
  
    if (!ICECAST.host || !ICECAST.port || !ICECAST.password || !ICECAST.mount) {
      console.error('❌ ICECAST config missing required fields.');
      return;
    }
  
    const songPath = path.join(SONG_DIR, songFile);
    const fallbackPath = path.join(SONG_DIR, defaultSong);
    const fileToStream = fs.existsSync(songPath)
      ? songFile
      : (fs.existsSync(fallbackPath) ? defaultSong : null);
  
    if (!fileToStream) {
      console.error('❌ No valid song found to stream.');
      return;
    }
  
    if (ffmpegProcess) {
      ffmpegProcess.kill();
    }
  
    const filePath = path.join(SONG_DIR, fileToStream);
    console.log(`🔁 Now streaming: ${fileToStream}`);
  
    ffmpegProcess = spawn('ffmpeg', [
      '-stream_loop', '-1',
      '-re',
      '-i', filePath,
      '-vn',
      '-c:a', 'libmp3lame',
      '-b:a', '128k',
      '-content_type', 'audio/mpeg',
      '-f', 'mp3',
      `icecast://source:${ICECAST.password}@${ICECAST.host}:${ICECAST.port}/${ICECAST.mount}`
    ]);
  
    ffmpegProcess.stderr.on('data', (data) => {
      // Optional: log FFmpeg output
      // console.log(`FFmpeg: ${data}`);
    });
  
    ffmpegProcess.on('close', () => {
      console.log('⛔ FFmpeg streaming stopped.');
    });
  
    currentSong = fileToStream;
    io.emit('now-playing', currentSong);
  }
  

// Merging logic
function mergedSong() {
  const inputFiles = fs.readdirSync(inputFolder)
    .filter(file => file.endsWith('.mp3'))
    .map(file => path.join(inputFolder, file));

  if (inputFiles.length < 2) {
    console.error('❌ Need at least 2 MP3 files to merge.');
    return;
  }

  const fileListContent = inputFiles.map(file => `file '${file}'`).join('\n');
  fs.writeFileSync(fileListPath, fileListContent);

  ffmpeg()
    .input(fileListPath)
    .inputOptions(['-f concat', '-safe 0'])
    .outputOptions('-c copy')
    .on('start', cmd => {
      console.log('🔧 Merging started...');
    })
    .on('error', (err, stdout, stderr) => {
      console.error('❌ Error during merging:', err.message);
    })
    .on('end', () => {
      console.log('✅ Merging complete! Output saved at:', mergedFilePath);
      fs.unlinkSync(fileListPath);
    })
    .save(mergedFilePath);
}

server.listen(4000, () => {
  console.log('🚀 Server running at http://localhost:3000');
  startStreaming(currentSong || defaultSong);
});
