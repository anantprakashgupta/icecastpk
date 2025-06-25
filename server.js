const { spawn } = require('child_process');
const path = require('path');

const ICECAST = {
  host: '208.109.234.82',
  port: 8000,
  password: 'hackme',
  mount: 'live'
};

const SONG_PATH = path.join(__dirname, 'songs', 'song.mp3');

function startStreaming() {
  const ffmpeg = spawn('ffmpeg', [
    '-stream_loop', '-1',      
    '-re',                     
    '-i', SONG_PATH, 
    '-vn',
    '-c:a', 'libmp3lame',
    '-b:a', '128k',
    '-content_type', 'audio/mpeg',
    '-f', 'mp3',
    `icecast://source:${ICECAST.password}@${ICECAST.host}:${ICECAST.port}/${ICECAST.mount}`
  ]);

  ffmpeg.stderr.on('data', (data) => {
    console.log(`FFmpeg: ${data}`);
  });

  ffmpeg.on('close', (code) => {
    console.log('FFmpeg streaming stopped.');
  });

  console.log(`🔁 Streaming started and will repeat until you stop it manually`);
}

  startStreaming(); 
