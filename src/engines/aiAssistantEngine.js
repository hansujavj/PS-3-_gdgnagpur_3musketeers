/**
 * aiAssistantEngine.js
 * 
 * Purpose: Offline AI assistant for farming queries
 * Features:
 * - Keyword-based query matching
 * - Multilingual support (EN/HI/MR)
 * - Crop-specific knowledge (Wheat, Rice, Cotton, etc.)
 * - Soil health and pest control guidance
 * - Quick action suggestions
 * - Simulated voice and image analysis
 * 
 * Knowledge Base:
 * - Crop management (sowing, irrigation, fertilizer)
 * - Soil health (rotation, testing, organic matter)
 * - Pest control (IPM, neem oil, chemical options)
 * - General farming tips
 */

import { CROPS } from '../utils/constants';

/**
 * Offline Knowledge Base for farming queries
 * Organized by language and topic
 */
const KNOWLEDGE_BASE = {
    en: {
        wheat: {
            sowing: "Wheat is best sown in November. Ensure soil moisture is adequate.",
            water: "Wheat requires 4-6 irrigations at critical stages like CRI (21 days).",
            fertilizer: "Apply NPK 120:60:40 kg/ha for optimal yield.",
            disease: "Watch out for Rusts (Yellow/Brown). use Propiconazole if detected."
        },
        rice: {
            sowing: "Rice nursery preparation starts in May-June.",
            water: "Maintain standing water of 2-5cm during reproductive stages.",
            disease: "Blast and Sheath Blight are common. Use Tricyclazole."
        },
        soil: {
            health: "To keep soil healthy: 1. Rotate crops (Legume-Cereal). 2. Use green manure (Sesbania). 3. Avoid excessive Urea.",
            testing: "Soil testing should be done every 3 years. Collect samples from 5 spots in a zig-zag pattern."
        },
        pest: {
            control: "Integrated Pest Management (IPM) is best. Use pheromone traps first. Spray chemicals only if pest population crosses Economic Threshold Level (ETL).",
            neem: "Neem oil (10000 ppm) is an effective organic pesticide for many sucking pests."
        },
        general: {
            weather: "I can't predict live weather yet, but check the home screen!",
            unknown: "I'm learning! Ask me about Wheat, Rice, Soil Health, or Pest Control."
        }
    },
    hi: {
        wheat: {
            sowing: "गेहूं की बुवाई नवंबर में करें। मिट्टी में नमी सुनिश्चित करें।",
            water: "गेहूं को 4-6 सिंचाई की आवश्यकता होती है, विशेष रूप से सीआरआई (21 दिन) पर।",
            fertilizer: "अच्छी उपज के लिए NPK 120:60:40 किग्रा/हेक्टेयर डालें।",
            disease: "रतुआ रोग (पीला/भूरा) से सावधान रहें। प्रोपिकोनाज़ोल का प्रयोग करें।"
        },
        soil: {
            health: "मिट्टी को स्वस्थ रखने के लिए: 1. फसल चक्र अपनाएं। 2. हरी खाद (ढैंचा) का प्रयोग करें। 3. यूरिया का अधिक प्रयोग न करें।",
        },
        // Add more localized strings...
    }
};

// Delay to simulate AI "thinking" if offline
const SIMULATE_DELAY = 800;

// Gemini API Configuration
// NOTE: Replace with your actual Gemini API Key
const GEMINI_API_KEY = "AIzaSyCDAJSotv9yEcVfvc_g3oRstsS6B6s9KUA";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

export const AiAssistantEngine = {
    /**
     * Process user query and return relevant farming advice
     * @param {string} query - User's question
     * @param {string} lang - Language code (en/hi/mr)
     * @returns {Promise<string>} - AI response
     */
    ask: async (query, lang = 'en') => {
        const q = query.toLowerCase();

        // 1. Handle Visual/Voice Commands (Simulation)
        if (q.includes('analyzing_image_cmd')) {
            await new Promise(r => setTimeout(r, SIMULATE_DELAY));
            return lang === 'hi' ? "यह पत्ता स्वस्थ लग रहा है, लेकिन हल्का पीलापन नाइट्रोजन की कमी का संकेत हो सकता है।" : "This leaf looks mostly healthy, but slight yellowing suggests Nitrogen deficiency. Apply Urea.";
        }

        // 2. Try Online (Gemini API)
        try {
            // Construct prompt based on language
            const systemPrompt = lang === 'hi'
                ? "आप एक किसान सहायक 'एग्री सहायक' हैं। हिंदी में उत्तर दें। बहुत ही सरल और संक्षिप्त रखें।"
                : "You are 'Agri Sahayak', a farming assistant. Answer efficiently and simply.";

            const payload = {
                contents: [{
                    parts: [{
                        text: `${systemPrompt} User asks: ${query}`
                    }]
                }]
            };

            const response = await fetch(GEMINI_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                const data = await response.json();
                if (data.candidates && data.candidates[0].content && data.candidates[0].content.parts) {
                    return data.candidates[0].content.parts[0].text;
                }
            }
        } catch (error) {
            console.log("Offline or API Error, falling back to local DB:", error);
        }

        // 3. Fallback to Offline Knowledge Base
        await new Promise(r => setTimeout(r, SIMULATE_DELAY));
        const kb = KNOWLEDGE_BASE[lang] || KNOWLEDGE_BASE['en'];

        if (q.includes('voice_cmd_soil')) return kb.soil.health;

        // Knowledge Matching
        if (q.includes('wheat') || q.includes('गेहूं')) {
            if (q.includes('water') || q.includes('पानी')) return kb.wheat.water;
            if (q.includes('sow') || q.includes('बुवाई')) return kb.wheat.sowing;
            if (q.includes('fertilizer') || q.includes('खाद')) return kb.wheat.fertilizer;
            return kb.wheat.sowing + " " + kb.wheat.fertilizer;
        }
        if (q.includes('rice') || q.includes('धान')) {
            if (q.includes('water')) return kb.rice.water;
            return kb.rice.sowing;
        }
        if (q.includes('soil') || q.includes('मिट्टी')) {
            return kb.soil.health;
        }
        if (q.includes('pest') || q.includes('कीट') || q.includes('neem')) {
            return kb.pest.control + " " + kb.pest.neem;
        }

        if (lang === 'hi') return "क्षमा करें, मैं अभी ऑफ़लाइन हूँ और मुझे इसका उत्तर नहीं पता। कृपया गेहूँ/धान या मिट्टी के बारे में पूछें।";
        return "I am currently offline and limited to basic topics (Wheat, Rice, Soil). Please check your internet connection for full AI assistance.";
    },

    getQuickActions: (lang = 'en') => {
        return [
            { id: 1, label: lang === 'hi' ? 'बुवाई कब करें?' : 'Sowing Date?', query: 'Wheat sowing' },
            { id: 2, label: lang === 'hi' ? 'मिट्टी का स्वास्थ्य?' : 'Soil Health?', query: 'How to keep soil healthy?' },
            { id: 3, label: lang === 'hi' ? 'कीट नियंत्रण?' : 'Pest Control?', query: 'How to control pests?' },
        ];
    }
};
