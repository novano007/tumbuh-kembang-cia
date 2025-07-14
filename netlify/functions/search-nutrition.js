// netlify/functions/search-nutrition.js

export const handler = async (event) => {
  console.log("--- Function Invoked ---");

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { ingredientName } = JSON.parse(event.body);
    console.log(`Request for: ${ingredientName}`);

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("FATAL: GEMINI_API_KEY is missing in Netlify environment variables.");
      throw new Error("Server configuration error.");
    }

    const prompt = `Berikan data gizi untuk "${ingredientName}" per 100 gram. Hanya berikan nilai karbohidrat, protein, dan lemak.`;
    const payload = {
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: { "carbs": { "type": "NUMBER" }, "protein": { "type": "NUMBER" }, "fat": { "type": "NUMBER" } },
          required: ["carbs", "protein", "fat"]
        }
      }
    };

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    console.log("Sending request to Google...");
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const responseBody = await response.text();

    if (!response.ok) {
      console.error('Google API Error Response:', response.status, responseBody);
      throw new Error(`Google API Error: ${response.statusText}`);
    }

    console.log("Success from Google. Parsing JSON...");
    const result = JSON.parse(responseBody);

    return {
      statusCode: 200,
      body: JSON.stringify(result),
    };

  } catch (err) {
    console.error('!!! UNCAUGHT ERROR !!!:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
