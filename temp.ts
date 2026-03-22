import fs from 'fs';

async function fetchUrl() {
  const response = await fetch('https://testdeley.com/lprl/capitulo-1-a.php', {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
  });
  const html = await response.text();
  fs.writeFileSync('temp.html', html);
  console.log('Saved to temp.html');
}

fetchUrl();
