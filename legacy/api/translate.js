// Vercel Serverless / Node.js handler for Google Translate GTX proxy
export default async function handler(req, res) {
  try {
    const text = req.query?.text;
    const from = req.query?.from || 'auto';
    const to = req.query?.to || 'ko';

    if (!text) {
      return res.status(400).json({ error: 'Missing text parameter' });
    }

    const targetUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${from}&tl=${to}&dt=t&q=${encodeURIComponent(text)}`;
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      },
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: `Upstream translation error: ${response.status}` });
    }

    const data = await response.text();
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(200).send(data);
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Translation failed' });
  }
}
