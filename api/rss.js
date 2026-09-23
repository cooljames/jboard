// Vercel Serverless / Node.js handler for RSS proxy
export default async function handler(req, res) {
  try {
    const targetUrl = req.query?.url;
    if (!targetUrl) {
      return res.status(400).json({ error: 'Missing url query parameter' });
    }

    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'application/rss+xml, application/xml, text/xml, */*',
        'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
      },
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: `Upstream error: ${response.status} ${response.statusText}` });
    }

    const xml = await response.text();
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'public, s-maxage=120, stale-while-revalidate=300');
    return res.status(200).send(xml);
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Failed to fetch RSS' });
  }
}
