import { isEnabled, isEnglishPage } from '/src/modules/config.js';
import { createToast } from '/src/modules/utils.js';

// Làm sạch response từ API
function cleanAPIResponse(response) {
    try {
        response = response.trim();
        const startIndex = response.indexOf('{');
        const endIndex = response.lastIndexOf('}') + 1;
        
        if (startIndex === -1 || endIndex === 0) {
            throw new Error('Không tìm thấy JSON object hợp lệ trong response');
        }
        
        response = response.substring(startIndex, endIndex);
        JSON.parse(response);
        return response;
    } catch (e) {
        console.error('Clean API Response Error:', e);
        console.log('Original Response:', response);
        throw new Error('Không thể làm sạch response: ' + e.message);
    }
}

// Kiểm tra response từ API
function validateAPIResponse(data) {
    if (!data) {
        throw new Error('API response is empty');
    }
    
    if (!data.replacements || !Array.isArray(data.replacements)) {
        throw new Error('Invalid response format: missing replacements array');
    }
    
    data.replacements.forEach((item, index) => {
        if (!item.vietnamese || !item.english || !item.meaning) {
            throw new Error(`Invalid replacement at index ${index}: missing required fields`);
        }
        if (typeof item.vietnamese !== 'string' || 
            typeof item.english !== 'string' || 
            typeof item.meaning !== 'string') {
            throw new Error(`Invalid replacement at index ${index}: fields must be strings`);
        }
    });
    
    return true;
}

// Gửi nội dung đến OpenAI API
export async function processWithOpenAI(contents) {
    if (!isEnabled || contents.length === 0) return null;

    try {
        if (!chrome.runtime?.id) {
            throw new Error('Extension context không khả dụng');
        }

        const response = await chrome.storage.sync.get(['apiKey', 'model', 'replacementRate']);
        if (chrome.runtime.lastError) {
            throw new Error('Lỗi khi lấy cài đặt: ' + chrome.runtime.lastError.message);
        }

        if (!response.apiKey) {
            createToast('API key không được cung cấp. Vui lòng nhập API key trong phần cài đặt.');
            return null;
        }

        const combinedText = contents.map(item => item.text).join('\n---\n');

        const prompt = isEnglishPage ?
            `Analyze the following English text and:
            1. Identify important words/phrases to replace with Vietnamese (about ${response.replacementRate || 20}% of words)
            2. Return JSON with format:
            {
                "replacements": [
                    {
                        "english": "english word",
                        "vietnamese": "từ tiếng việt",
                        "meaning": "english meaning"
                    }
                ]
            }` :
            `Hãy phân tích các đoạn văn bản tiếng Việt sau và thực hiện:
            1. Xác định các từ/cụm từ quan trọng có thể thay thế bằng tiếng Anh (khoảng ${response.replacementRate || 20}% số từ)
            2. Trả về JSON với format:
            {
                "replacements": [
                    {
                        "vietnamese": "từ tiếng việt",
                        "english": "từ tiếng anh",
                        "meaning": "nghĩa tiếng việt"
                    }
                ]
            }`;

        const apiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${response.apiKey}`
            },
            body: JSON.stringify({
                model: response.model || 'gpt-4-mini',
                messages: [
                    {
                        role: "system",
                        content: "You are a language learning assistant. Always return valid JSON with the following format ONLY: {\"replacements\": [{\"vietnamese\": \"text\", \"english\": \"text\", \"meaning\": \"text\"}]}"
                    },
                    {
                        role: "user",
                        content: `${prompt}\n\nText: ${combinedText}`
                    }
                ]
            })
        });

        if (!apiResponse.ok) {
            const errorData = await apiResponse.json();
            createToast(`Lỗi API: ${errorData.error?.message || 'Unknown error'}`);
            return null;
        }

        const data = await apiResponse.json();
        
        if (!data.choices || !data.choices[0] || !data.choices[0].message) {
            createToast('API trả về dữ liệu không hợp lệ');
            return null;
        }

        try {
            const cleanedResponse = cleanAPIResponse(data.choices[0].message.content);
            console.log('Original API Response:', data.choices[0].message.content);
            console.log('Cleaned API Response:', cleanedResponse);

            const parsedData = JSON.parse(cleanedResponse);
            validateAPIResponse(parsedData);
            return parsedData;
        } catch (e) {
            createToast(`Lỗi xử lý dữ liệu: ${e.message}`);
            console.error('Original API Response:', data.choices[0].message.content);
            console.error('Parse Error:', e);
            return null;
        }
    } catch (error) {
        createToast(`Lỗi kết nối: ${error.message}`);
        console.error('API Error:', error);
        return null;
    }
}
