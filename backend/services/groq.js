const Groq = require('groq-sdk');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const analyzeAnomaly = async (anomalyData) => {
  try {
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: 'You are a cybersecurity analyst. Always respond with valid JSON only, no markdown, no extra text.'
        },
        {
          role: 'user',
          content: `Analyze this anomaly and respond in this exact JSON format:
{
  "threat": "name of the threat",
  "severity": "LOW|MEDIUM|HIGH|CRITICAL",
  "explanation": "2-3 sentence explanation",
  "recommendation": "what action to take",
  "confidence": 85
}

Anomaly data: ${JSON.stringify(anomalyData)}`
        }
      ],
      temperature: 0.3,
      max_tokens: 300
    });

    const text = completion.choices[0]?.message?.content?.trim();
    const clean = text.replace(/```json|```/g, '').trim();
    return JSON.parse(clean);
  } catch (err) {
    console.error('Groq error:', err.message);
    return {
      threat: 'Unknown',
      severity: 'MEDIUM',
      explanation: 'AI analysis unavailable at this time.',
      recommendation: 'Review logs manually.',
      confidence: 0
    };
  }
};

const summarizeLogs = async (logs) => {
  try {
    const summary = {
      total: logs.length,
      levels: logs.reduce((acc, l) => { acc[l.level] = (acc[l.level] || 0) + 1; return acc; }, {}),
      topIPs: [...new Set(logs.map(l => l.ip))].slice(0, 5),
      topSources: [...new Set(logs.map(l => l.source))].slice(0, 5),
      errorRate: ((logs.filter(l => l.level === 'ERROR' || l.level === 'CRITICAL').length / logs.length) * 100).toFixed(1)
    };

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: 'You are a DevOps engineer. Always respond with valid JSON only, no markdown, no extra text.'
        },
        {
          role: 'user',
          content: `Given this log summary, provide a health report in this exact JSON format:
{
  "status": "HEALTHY|DEGRADED|CRITICAL",
  "summary": "one sentence overall status",
  "highlights": ["observation 1", "observation 2", "observation 3"]
}

Data: ${JSON.stringify(summary)}`
        }
      ],
      temperature: 0.3,
      max_tokens: 300
    });

    const text = completion.choices[0]?.message?.content?.trim();
    const clean = text.replace(/```json|```/g, '').trim();
    return JSON.parse(clean);
  } catch (err) {
    console.error('Groq error:', err.message);
    return { status: 'UNKNOWN', summary: 'AI unavailable', highlights: [] };
  }
};

module.exports = { analyzeAnomaly, summarizeLogs };