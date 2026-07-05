const https = require('https');
const fs = require('fs');

const url = "https://assets.mixkit.co/videos/preview/mixkit-solar-panels-in-a-field-under-the-sun-43285-large.mp4";
const dest = "apps/web/public/solar-bg.mp4";

const options = {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    'Referer': 'https://mixkit.co/'
  }
};

const file = fs.createWriteStream(dest);
https.get(url, options, (response) => {
  if (response.statusCode === 200) {
    response.pipe(file);
    file.on('finish', () => {
      file.close();
      console.log('Download completed');
    });
  } else {
    console.log('Failed to download, status code:', response.statusCode);
  }
}).on('error', (err) => {
  fs.unlink(dest, () => {});
  console.error('Error downloading:', err.message);
});
