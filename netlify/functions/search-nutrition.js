// netlify/functions/search-nutrition.js

export const handler = async (event) => {
  console.log("Function search-nutrition invoked.");

  if (event.httpMethod !== 'POST') {
    console.log("Method not allowed:", event.httpMethod);
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { ingredientName } = JSON.parse(event.body);
    console.log("Received request for ingredient:", ingredientName);

    if (!ingredientName) {
      console.error("Error: Ingredient name is missing from request body.");
      return { statusCode: 400, body: 'Ingredient name is required' };
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("FATAL: GEMINI_API_KEY environment variable is not set in Netlify!");
      throw new Error("Server configuration error: API key is missing.");
    }

    const prompt = `Berikan data gizi untuk "${ingredientName}" per 100 gram. Hanya berikan nilai karbohidrat, protein, dan lemak.`;
    const payload = {
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            "carbs": { "type": "NUMBER" },
            "protein": { "type": "NUMBER" },
            "fat": { "type": "NUMBER" }
          },
          required: ["carbs", "protein", "fat"]
        }
      }
    };

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    console.log("Sending request to Google AI API...");
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('Google AI API Error:', response.status, errorBody);
      throw new Error(`API error: ${response.statusText}`);
    }

    const result = await response.json();
    console.log("Successfully received response from Google AI API.");

    return {
      statusCode: 200,
      body: JSON.stringify(result),
    };

  } catch (err) {
    console.error('Function execution failed:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
