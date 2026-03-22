async function fetchUrl() {
  const response = await fetch('https://testdeley.com/lprl/capitulo-1-a.php', {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
  });
  console.log('Content-Type:', response.headers.get('content-type'));
  const buffer = await response.arrayBuffer();
  const decoder = new TextDecoder('iso-8859-1');
  const html = decoder.decode(buffer);
  console.log('HTML snippet:', html.substring(0, 200));
}

fetchUrl();
