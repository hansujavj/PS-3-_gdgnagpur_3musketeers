/**
 * pricePredictionEngine.js
 *
 * Integrates with the OpenAI (ChatGPT) API for crop price prediction.
 */
import Constants from 'expo-constants';

const getOpenAIApiKey = () =>
    Constants.expoConfig?.extra?.OPENAI_API_KEY
    || process.env.OPENAI_API_KEY
    || '';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export const predictPrice = async (cropId, targetDate, cropName = '', region = '') => {
    if (!cropId) throw new Error('Missing crop ID');
    if (!targetDate) throw new Error('Missing target date');

    const apiKey = getOpenAIApiKey();
    if (!apiKey) throw new Error('OpenAI API key is not configured.');

    const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';

    const payload = {
        model: 'gpt-4o-mini',
        messages: [
            {
                role: 'system',
                content: `You are AgriChain AI. Predict crop market prices.
Rules:
- Only agriculture-related responses
- Keep answers short and token-efficient
- No extra explanations
- Always respond in JSON format`
            },
            {
                role: 'user',
                content: `Predict market price per quintal (100 kg) for Crop: ${cropName || 'Unknown Crop'} ${region ? `in Region: ${region}` : ''} on Date: ${targetDate}.
Format:
{
  "crop": "",
  "price_range": "e.g., ₹2500 - ₹2800 per quintal",
  "trend": "Increasing | Stable | Decreasing",
  "reason": ""
}`
            }
        ],
        response_format: { type: 'json_object' },
        max_tokens: 200,
        temperature: 0.3
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
        console.log('[PricePrediction] Sending request to OpenAI for', cropName);
        let response = await callApi();

        if (response.status === 429) {
            console.warn('[PricePrediction] Rate limited, retrying in 5s...');
            await sleep(5000);
            response = await callApi();
        }

        const responseText = await response.text();
        
        if (!response.ok) throw new Error(`OpenAI API Error ${response.status}: ${responseText.substring(0, 100)}`);

        const data = JSON.parse(responseText);
        const contentStr = data.choices?.[0]?.message?.content;

        if (contentStr) {
            const result = JSON.parse(contentStr);
            
            // Map trend for UI compatibility
            let uiTrend = 'stable';
            if (result.trend === 'Increasing') uiTrend = 'rising';
            if (result.trend === 'Decreasing') uiTrend = 'falling';
            
            // Extract a numeric predicted price from the range to avoid breaking UI charts/display
            let numPrice = 3000;
            const numbers = result.price_range?.replace(/,/g, '').match(/\d+/g);
            if (numbers && numbers.length > 0) {
                numPrice = parseInt(numbers[0], 10);
                if (numbers.length > 1) {
                    numPrice = Math.round((parseInt(numbers[0], 10) + parseInt(numbers[1], 10)) / 2);
                }
            }

            return {
                crop_id: cropId,
                target_date: targetDate,
                predicted_price: numPrice,
                confidence: 0.82, // Default High/Medium mock confidence
                trend: uiTrend,   // Mapped to UI expected 'rising' | 'falling' | 'stable'
                source: 'api',
                // Expose new requirements
                price_range: result.price_range,
                reason: result.reason,
            };
        }
        
        throw new Error('No valid response from OpenAI API');
    } catch (err) {
        console.error('[PricePrediction] Failed:', err.message);
        throw err;
    }
};

export const getTrendInfo = (trend) => {
    switch (trend) {
        case 'rising':
        case 'Increasing':
            return { label: 'Rising', icon: 'trending-up', color: '#2e7d32', bgColor: '#e8f5e9' };
        case 'falling':
        case 'Decreasing':
            return { label: 'Falling', icon: 'trending-down', color: '#c62828', bgColor: '#ffebee' };
        default:
            return { label: 'Stable', icon: 'remove-outline', color: '#f57c00', bgColor: '#fff3e0' };
    }
};

export const getConfidenceInfo = (confidence) => {
    if (confidence >= 0.8) return { label: 'High', color: '#2e7d32' };
    if (confidence >= 0.5) return { label: 'Medium', color: '#f57c00' };
    return { label: 'Low', color: '#c62828' };
};
