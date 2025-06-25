const socket = io();

const songListDiv = document.getElementById('songList');
const nowPlayingDiv = document.getElementById('nowPlaying');

function loadSongs() {
  fetch('/songs')
    .then(res => res.json())
    .then(({ songs, current }) => {
      nowPlayingDiv.innerText = `Now Playing: ${current}`;
      songListDiv.innerHTML = '';
      songs.forEach(song => {
        const div = document.createElement('div');
        div.className = 'song';
        div.innerText = song;
        div.onclick = () => {
          socket.emit('play-song', song);
        };
        songListDiv.appendChild(div);
      });
    });
}

socket.on('now-playing', (song) => {
  nowPlayingDiv.innerText = `Now Playing: ${song}`;
});

loadSongs();

document.getElementById('mergeBtn').addEventListener('click', () => {
  fetch('/merge-songs', {
    method: 'POST'
  })
  .then(res => res.json())
  .then(data => {
    alert(data.message);
  })
  .catch(err => {
    alert('Error while merging: ' + err.message);
  });
});

