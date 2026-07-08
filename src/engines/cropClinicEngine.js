/**
 * cropClinicEngine.js
 *
 * Handles image capture and OpenAI (ChatGPT) API calls for disease diagnosis.
 */

import * as ImagePicker from 'expo-image-picker';
import Constants from 'expo-constants';

const OPENAI_API_KEY = Constants.expoConfig?.extra?.OPENAI_API_KEY || process.env.OPENAI_API_KEY || '';
const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';

/**
 * Capture image from camera using expo-image-picker.
 */
const captureImage = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') throw new Error('CAMERA_PERMISSION_DENIED');

    const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 0.5,
        base64: true,
        allowsEditing: true,
        aspect: [4, 3],
    });

    if (result.canceled) throw new Error('IMAGE_CAPTURE_CANCELLED');
    return { base64: result.assets[0].base64, uri: result.assets[0].uri };
};

/**
 * Pick image from gallery.
 */
const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') throw new Error('GALLERY_PERMISSION_DENIED');

    const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.5,
        base64: true,
        allowsEditing: true,
        aspect: [4, 3],
    });

    if (result.canceled) throw new Error('IMAGE_PICK_CANCELLED');
    return { base64: result.assets[0].base64, uri: result.assets[0].uri };
};

/**
 * Full diagnosis pipeline: capture/pick -> OpenAI call -> parse -> map to UI structure
 */
const diagnose = async (source = 'camera') => {
    if (!OPENAI_API_KEY) throw new Error('VISION_API_KEY_MISSING');

    const image = source === 'camera' ? await captureImage() : await pickImage();

    const payload = {
        model: 'gpt-4o',
        messages: [
            {
                role: 'system',
                content: `You are AgriChain Crop Clinic AI. You diagnose crop diseases accurately.
RULES:
- Only agriculture-related output
- Keep responses concise and token-efficient
- No unnecessary explanations
- Use simple farmer-friendly language
- Always respond in JSON format
- If the image is NOT related to crops/plants, respond exactly with JSON: {"error": "Invalid input: Please provide a crop image."}`
            },
            {
                role: 'user',
                content: [
                    {
                        type: 'text',
                        text: `Diagnose this crop image.
Output JSON format:
{
  "crop_type": "",
  "disease": { "name": "", "confidence": "High/Medium/Low" },
  "symptoms": [],
  "causes": [],
  "treatment": { "pesticide_name": "ONLY the precise name of the most reliable pesticide product (e.g. 'Mancozeb')", "preventive_measures": [] },
  "severity_level": "Low / Moderate / Severe"
}
If healthy, set disease name to "Healthy".`
                    },
                    {
                        type: 'image_url',
                        image_url: { url: `data:image/jpeg;base64,${image.base64}` }
                    }
                ]
            }
        ],
        response_format: { type: 'json_object' },
        max_tokens: 500,
        temperature: 0.1
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
        const response = await fetch(OPENAI_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENAI_API_KEY}`
            },
            body: JSON.stringify(payload),
            signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            const body = await response.text();
            throw new Error(`API_ERROR: ${response.status} - ${body}`);
        }

        const data = await response.json();
        const contentStr = data.choices?.[0]?.message?.content;

        if (!contentStr) throw new Error('No valid response from API.');

        const result = JSON.parse(contentStr);

        if (result.error) {
            if (result.error.includes("Invalid input")) {
                return { notPlant: true, imageUri: image.uri };
            }
            throw new Error(result.error);
        }

        const isHealthy = result.disease?.name?.toLowerCase().includes('healthy');
        
        let confNum = 0.85; // Default High
        const confStr = (result.disease?.confidence || '').toLowerCase();
        if (confStr.includes('low')) confNum = 0.4;
        if (confStr.includes('medium')) confNum = 0.7;
        if (confStr.includes('high')) confNum = 0.95;

        let severityObj = { level: result.severity_level || 'Low', color: '#4caf50', icon: 'information-circle' };
        const sevStr = (result.severity_level || '').toLowerCase();
        if (sevStr.includes('moderate')) severityObj = { level: 'Moderate', color: '#fbc02d', icon: 'warning' };
        if (sevStr.includes('severe')) severityObj = { level: 'Severe', color: '#d32f2f', icon: 'alert-circle' };

        // For UI compatibility, map treatment object:
        const mappedTreatment = {
            pesticide: result.treatment?.pesticide_name || 'Generic Organic Remedy',
            dosage: 'Refer to local guidelines or bottle instructions',
            spray_interval: 'N/A',
            organic_alternative: result.causes?.join(', ') || '',
            prevention: result.treatment?.preventive_measures || []
        };

        return {
            disease: {
                name: result.disease?.name || 'Unknown',
                color: isHealthy ? '#2e7d32' : '#d32f2f',
                icon: isHealthy ? 'checkmark-circle' : 'bug'
            },
            confidence: confNum,
            severity: severityObj,
            isHealthy,
            lowConfidence: confNum < 0.6,
            notPlant: false,
            treatment: isHealthy ? null : mappedTreatment,
            imageUri: image.uri,
            matchedLabels: [result.crop_type, ...result.symptoms].filter(Boolean),
            rawAIResult: result, 
            timestamp: new Date().toISOString(),
        };
    } catch (error) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') throw new Error('API_TIMEOUT');
        throw error;
    }
};

const getErrorMessage = (error) => {
    const errorMap = {
        CAMERA_PERMISSION_DENIED: 'Camera permission is required.',
        GALLERY_PERMISSION_DENIED: 'Gallery access is required.',
        IMAGE_CAPTURE_CANCELLED: 'Image capture was cancelled.',
        IMAGE_PICK_CANCELLED: 'Image selection was cancelled.',
        VISION_API_KEY_MISSING: 'API key is not configured.',
        API_TIMEOUT: 'Request timed out. Please check your internet connection.',
    };
    const message = error?.message || '';
    for (const [code, msg] of Object.entries(errorMap)) {
        if (message.includes(code)) return msg;
    }
    if (message.includes('Network request failed') || message.includes('network')) {
        return 'No internet connection.';
    }
    return message || 'Something went wrong. Please try again.';
};

export const CropClinicEngine = {
    captureImage,
    pickImage,
    diagnose,
    getErrorMessage,
};

export default CropClinicEngine;
