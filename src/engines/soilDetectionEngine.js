/**
 * soilDetectionEngine.js
 * Uses Gemini Vision API to detect soil type from a captured image.
 * Model: gemini-2.5-flash-preview-04-17
 */
import Constants from 'expo-constants';

const getGeminiApiKey = () =>
    Constants.expoConfig?.extra?.GEMINI_API_KEY
    || process.env.GEMINI_API_KEY
    || '';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export const detectSoilFromImage = async (base64Image) => {
    const apiKey = getGeminiApiKey();
    if (!apiKey) throw new Error('Gemini API key is not configured.');

    const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-04-17:generateContent?key=${apiKey}`;

    const payload = {
        contents: [{
            parts: [
                { inlineData: { mimeType: 'image/jpeg', data: base64Image } },
                {
                    text: `Look at this soil image carefully. Identify the soil type based on its color, texture, granularity, and moisture.

You MUST respond with ONLY a JSON object, nothing else. No markdown, no backticks, no explanation.

Format: {"soil_type":"<TYPE>","confidence":<NUMBER>}

Where <TYPE> is one of: Black Cotton Soil, Alluvial Soil, Laterite Soil, Loamy, Red Soil, Sandy Soil, Clay Soil, Silty Soil, Peaty Soil, Chalky Soil

And <NUMBER> is confidence 0.0-1.0.

Example: {"soil_type":"Loamy","confidence":0.85}`
                }
            ]
        }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 100 }
    };

    const callApi = () => fetch(GEMINI_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });

    try {
        console.log('[SoilDetection] Sending to Gemini, size:', Math.round(base64Image.length / 1024), 'KB');
        let response = await callApi();

        if (response.status === 429) {
            console.warn('[SoilDetection] Rate limited, retrying in 5s...');
            await sleep(5000);
            response = await callApi();
        }

        const responseText = await response.text();
        console.log('[SoilDetection] Status:', response.status);

        if (!response.ok) throw new Error(`Gemini API returned ${response.status}: ${responseText.substring(0, 200)}`);

        const data = JSON.parse(responseText);
        if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
            let jsonStr = data.candidates[0].content.parts[0].text.trim()
                .replace(/```json\s*/gi, '').replace(/```\s*/g, '');
            const match = jsonStr.match(/\{[\s\S]*?\}/);
            if (match) jsonStr = match[0];
            const result = JSON.parse(jsonStr);
            if (!result.soil_type) throw new Error('Missing soil_type in response');
            return {
                soil_type: result.soil_type,
                confidence: Math.min(1, Math.max(0, typeof result.confidence === 'number' ? result.confidence : 0.7)),
            };
        }
        if (data.candidates?.[0]?.finishReason === 'SAFETY')
            throw new Error('Image blocked by safety filters.');
        throw new Error('No valid response from Gemini API');
    } catch (error) {
        console.error('[SoilDetection] Failed:', error.message);
        throw error;
    }
};
