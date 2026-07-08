/**
 * soilDetectionEngine.js
 * Uses OpenAI (ChatGPT) API to detect soil type from a captured image.
 * Model: gpt-4o
 */
import Constants from 'expo-constants';

const getOpenAIApiKey = () =>
    Constants.expoConfig?.extra?.OPENAI_API_KEY
    || process.env.OPENAI_API_KEY
    || '';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export const detectSoilFromImage = async (base64Image) => {
    const apiKey = getOpenAIApiKey();
    if (!apiKey) throw new Error('OpenAI API key is not configured.');

    const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';

    const payload = {
        model: 'gpt-4o',
        messages: [
            {
                role: 'system',
                content: `You are AgriChain AI. Analyze soil images and return ONLY a JSON object.
Rules:
- Only agriculture-related responses
- Keep answers short and token-efficient
- No extra explanations
- Always respond in JSON format
- If the image is not soil, respond exactly with JSON: {"error": "Invalid input: Please provide a soil image."}`
            },
            {
                role: 'user',
                content: [
                    {
                        type: 'text',
                        text: `Determine Soil type (Sandy, Clay, Loamy, Silty, Peaty, Chalky), Soil health (Good / Moderate / Poor), Key traits (color, texture, moisture), Suitable crops.
Format:
{
  "soil_type": "",
  "health": "",
  "traits": [],
  "crops": []
}`
                    },
                    {
                        type: 'image_url',
                        image_url: {
                            url: `data:image/jpeg;base64,${base64Image}`
                        }
                    }
                ]
            }
        ],
        response_format: { type: 'json_object' },
        max_tokens: 300,
        temperature: 0.1
    };

    const callApi = () => fetch(OPENAI_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify(payload),
    });

    try {
        console.log('[SoilDetection] Sending to OpenAI, size:', Math.round(base64Image.length / 1024), 'KB');
        let response = await callApi();

        if (response.status === 429) {
            console.warn('[SoilDetection] Rate limited, retrying in 5s...');
            await sleep(5000);
            response = await callApi();
        }

        const responseText = await response.text();
        console.log('[SoilDetection] Status:', response.status);

        if (!response.ok) throw new Error(`OpenAI API returned ${response.status}: ${responseText.substring(0, 200)}`);

        const data = JSON.parse(responseText);
        const contentStr = data.choices?.[0]?.message?.content;
        
        if (contentStr) {
            const result = JSON.parse(contentStr);
            if (result.error) throw new Error(result.error);
            if (!result.soil_type) throw new Error('Missing soil_type in response');
            
            return {
                soil_type: result.soil_type,
                confidence: 0.85, // Default confidence for UI compatibility
                health: result.health || 'Moderate',
                characteristics: result.traits || [],
                recommended_crops: result.crops || []
            };
        }
        if (data.choices?.[0]?.finish_reason === 'content_filter')
            throw new Error('Image blocked by safety filters.');
        throw new Error('No valid response from OpenAI API');
    } catch (error) {
        console.error('[SoilDetection] Failed:', error.message);
        throw error;
    }
};
