// Cấu hình và biến toàn cục
let replacedWords = new Map();
let isEnabled = true;
let isProcessing = false;
let blacklist = [];
let hasProcessedPage = false;
let isEnglishPage = false;
let pageLanguageSetting = 'both';
let currentApiProvider = '';  // Không đặt giá trị mặc định
let currentApiKey = '';
let currentModel = '';

// Font style cho tiếng Việt
const fontStyle = document.createElement('style');
fontStyle.textContent = `
@import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&display=swap');

.english-word, 
.english-word::after {
    font-family: 'Roboto', -apple-system, BlinkMacSystemFont, 'Segoe UI', 
                 'Helvetica Neue', Arial, sans-serif;
}
`;

// CSS cho tooltip và highlight
const tooltipStyle = document.createElement('style');
tooltipStyle.textContent = `
.english-word {
    background-color: #f65b66;
    padding: 0 2px;
    border-radius: 3px;
    cursor: help;
    position: relative;
    display: inline-block;
    color: #000;
    font-weight: bold;
    font-family: 'Roboto', -apple-system, BlinkMacSystemFont, 'Segoe UI', 
                 'Helvetica Neue', Arial, sans-serif;
}

.english-word:hover {
    background-color: rgba(255, 0, 0, 0.3);
}

.english-word:hover::after {
    content: attr(data-meaning);
    position: absolute;
    bottom: 100%;
    left: 50%;
    transform: translateX(-50%);
    padding: 5px;
    background: #333;
    color: white;
    border-radius: 4px;
    font-size: 14px;
    white-space: nowrap;
    z-index: 1000;
    font-family: 'Roboto', -apple-system, BlinkMacSystemFont, 'Segoe UI', 
                 'Helvetica Neue', Arial, sans-serif;
}`;

// Cập nhật các biến config
function updateConfig(newConfig) {
    const oldPageLanguage = pageLanguageSetting;
    const oldProvider = currentApiProvider;
    
    if (newConfig.isEnabled !== undefined) {
        isEnabled = newConfig.isEnabled;
    }
    if (newConfig.blacklist) {
        blacklist = newConfig.blacklist;
    }
    if (newConfig.pageLanguage !== undefined) {
        pageLanguageSetting = newConfig.pageLanguage;
    }
    if (newConfig.apiProvider !== undefined) {
        currentApiProvider = newConfig.apiProvider;
    }
    if (newConfig.apiKey !== undefined) {
        currentApiKey = newConfig.apiKey;
    }
    if (newConfig.model !== undefined) {
        currentModel = newConfig.model;
    }

    // Reset trạng thái và xử lý lại trang nếu cài đặt ngôn ngữ hoặc provider thay đổi
    if (oldPageLanguage !== pageLanguageSetting || oldProvider !== currentApiProvider) {
        removeAllReplacements();
        hasProcessedPage = false;
        isProcessing = false;
        
        // Kiểm tra và xử lý lại trang nếu cần
        if (isEnabled && !isBlacklisted() && shouldProcessPage()) {
            processPage();
        }
    }
}

function setIsProcessing(value) {
    isProcessing = value;
}

function setHasProcessedPage(value) {
    hasProcessedPage = value;
}

function setIsEnglishPage(value) {
    isEnglishPage = value;
}

// Utility Functions
function detectPageLanguage() {
    const htmlLang = document.documentElement.lang.toLowerCase();
    const metaLang = document.querySelector('meta[http-equiv="content-language"]')?.content?.toLowerCase();
    
    if (htmlLang.includes('en') || metaLang?.includes('en')) {
        return 'en';
    }
    if (htmlLang.includes('vi') || metaLang?.includes('vi')) {
        return 'vi';
    }

    const text = document.body.innerText.toLowerCase();
    const englishWords = text.match(/\b(the|is|are|was|were|have|has|had|this|that|these|those)\b/gi) || [];
    const vietnameseWords = text.match(/\b(của|và|trong|những|các|được|là|có|không|để)\b/gi) || [];

    return englishWords.length > vietnameseWords.length ? 'en' : 'vi';
}

// Kiểm tra xem có nên xử lý trang dựa trên cài đặt ngôn ngữ
function shouldProcessPage() {
    const currentPageLanguage = detectPageLanguage();
    console.log('Current page language:', currentPageLanguage);
    console.log('Page language setting:', pageLanguageSetting);
    
    switch (pageLanguageSetting) {
        case 'english':
            return currentPageLanguage === 'en';
        case 'vietnamese':
            return currentPageLanguage === 'vi';
        case 'both':
            return true;
        default:
            return false; // Mặc định không xử lý nếu cài đặt không hợp lệ
    }
}

function encodeVietnamese(str) {
    return encodeURIComponent(str).replace(/%/g, '\\');
}

function decodeVietnamese(str) {
    return decodeURIComponent(str.replace(/\\/g, '%'));
}

function isBlacklisted() {
    const currentDomain = window.location.hostname.toLowerCase()
        .replace(/^www\./i, '');
    
    return blacklist.some(domain => {
        const cleanDomain = domain.toLowerCase().replace(/^www\./i, '');
        
        if (cleanDomain.startsWith('*.')) {
            const mainDomain = cleanDomain.substring(2);
            return currentDomain.endsWith(mainDomain);
        }
        
        if (currentDomain === cleanDomain) {
            return true;
        }
        
        if (currentDomain.endsWith('.' + cleanDomain)) {
            return true;
        }
        
        return false;
    });
}

function createToast(message, type = 'error') {
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed;
        bottom: 80px;
        right: 20px;
        padding: 12px 20px;
        background: ${type === 'error' ? '#ff4444' : '#4CAF50'};
        color: white;
        border-radius: 4px;
        z-index: 10001;
        font-family: 'Roboto', -apple-system, BlinkMacSystemFont, 'Segoe UI', 
                     'Helvetica Neue', Arial, sans-serif;
        max-width: 300px;
        box-shadow: 0 2px 5px rgba(0,0,0,0.2);
    `;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.remove();
    }, 5000);
}

function sanitizeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function waitForFullLoad() {
    return new Promise(resolve => {
        if (document.readyState === 'complete') {
            setTimeout(resolve, 500);
        } else {
            window.addEventListener('load', () => {
                setTimeout(resolve, 500);
            });
        }
    });
}

function getAllContent() {
    const targetElements = document.querySelectorAll('h1, h2, h3, h4, h5, h6, p, span');
    const contents = [];

    targetElements.forEach(element => {
        if (element.closest('.english-word')) return;
        
        if (element.tagName === 'SCRIPT' || 
            element.tagName === 'STYLE' || 
            element.tagName === 'NOSCRIPT' ||
            getComputedStyle(element).display === 'none' ||
            getComputedStyle(element).visibility === 'hidden') {
            return;
        }

        const text = element.textContent.trim();
        if (text) {
            contents.push({
                element: element,
                text: text
            });
        }
    });

    return contents;
}

// DOM Functions
function applyReplacements(element, replacements) {
    if (!isEnabled || !shouldProcessPage()) return;

    try {
        const tempContainer = document.createElement('div');
        tempContainer.innerHTML = element.innerHTML;

        const walker = document.createTreeWalker(
            tempContainer,
            NodeFilter.SHOW_TEXT,
            null,
            false
        );

        const textNodes = [];
        let node;
        while (node = walker.nextNode()) {
            textNodes.push(node);
        }

        textNodes.forEach(textNode => {
            let content = textNode.textContent;
            replacements.forEach(replacement => {
                try {
                    const sourceWord = isEnglishPage ? replacement.english : replacement.vietnamese;
                    const targetWord = isEnglishPage ? replacement.vietnamese : replacement.english;
                    const meaning = isEnglishPage ? replacement.english : replacement.meaning;
                    
                    replacedWords.set(targetWord, meaning);
                    const safeTargetWord = sanitizeHTML(targetWord);
                    const safeMeaning = sanitizeHTML(meaning);
                    
                    const escapedSourceWord = sourceWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    const regex = new RegExp(`(?<!<[^>]*)${escapedSourceWord}(?![^<]*>)`, 'gi');
                    content = content.replace(regex, `<span class="english-word" data-meaning="${safeMeaning}">${safeTargetWord}</span>`);
                } catch (e) {
                    console.error('Replacement Error:', e);
                }
            });
            
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = content;
            
            const fragment = document.createDocumentFragment();
            while (tempDiv.firstChild) {
                fragment.appendChild(tempDiv.firstChild);
            }
            textNode.parentNode.replaceChild(fragment, textNode);
        });

        element.innerHTML = tempContainer.innerHTML;
    } catch (error) {
        console.error('Apply Replacements Error:', error);
        createToast('Lỗi khi thay thế text: ' + error.message);
    }
}

function removeAllReplacements() {
    const replacedElements = document.querySelectorAll('.english-word');
    replacedElements.forEach(element => {
        const text = element.textContent;
        const textNode = document.createTextNode(text);
        element.parentNode.replaceChild(textNode, element);
    });
}

// API Functions
async function processWithOpenAI(contents) {
    if (!isEnabled || contents.length === 0 || !shouldProcessPage()) return null;

    try {
        if (!chrome.runtime?.id) {
            throw new Error('Extension context không khả dụng');
        }

        const response = await chrome.storage.sync.get(['replacementRate']);
        if (chrome.runtime.lastError) {
            throw new Error('Lỗi khi lấy cài đặt: ' + chrome.runtime.lastError.message);
        }

        if (!currentApiKey) {
            createToast('OpenAI API key không được cung cấp. Vui lòng nhập API key trong phần cài đặt.');
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
                'Authorization': `Bearer ${currentApiKey}`
            },
            body: JSON.stringify({
                model: currentModel || 'gpt-4-mini',
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
            createToast(`Lỗi OpenAI API: ${errorData.error?.message || 'Unknown error'}`);
            return null;
        }

        const data = await apiResponse.json();
        
        if (!data.choices || !data.choices[0] || !data.choices[0].message) {
            createToast('OpenAI API trả về dữ liệu không hợp lệ');
            return null;
        }

        try {
            const cleanedResponse = cleanAPIResponse(data.choices[0].message.content);
            console.log('Original OpenAI API Response:', data.choices[0].message.content);
            console.log('Cleaned OpenAI API Response:', cleanedResponse);

            const parsedData = JSON.parse(cleanedResponse);
            validateAPIResponse(parsedData);
            return parsedData;
        } catch (e) {
            createToast(`Lỗi xử lý dữ liệu OpenAI: ${e.message}`);
            console.error('Original OpenAI API Response:', data.choices[0].message.content);
            console.error('Parse Error:', e);
            return null;
        }
    } catch (error) {
        createToast(`Lỗi kết nối OpenAI: ${error.message}`);
        console.error('OpenAI API Error:', error);
        return null;
    }
}

async function processWithGemini(contents) {
    if (!isEnabled || contents.length === 0 || !shouldProcessPage()) return null;

    try {
        if (!chrome.runtime?.id) {
            throw new Error('Extension context không khả dụng');
        }

        const response = await chrome.storage.sync.get(['replacementRate']);
        if (chrome.runtime.lastError) {
            throw new Error('Lỗi khi lấy cài đặt: ' + chrome.runtime.lastError.message);
        }

        if (!currentApiKey) {
            createToast('Gemini API key không được cung cấp. Vui lòng nhập API key trong phần cài đặt.');
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

        const apiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${currentModel}:generateContent?key=${currentApiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                system_instruction: {
                    parts: [
                        {
                            text: "You are a language learning assistant. Always return valid JSON with the following format ONLY: {\"replacements\": [{\"vietnamese\": \"text\", \"english\": \"text\", \"meaning\": \"text\"}]}"
                        }
                    ]
                },
                contents: [
                    {
                        parts: [
                            {
                                text: `${prompt}\n\nText: ${combinedText}`
                            }
                        ]
                    }
                ]
            })
        });

        if (!apiResponse.ok) {
            const errorData = await apiResponse.json();
            createToast(`Lỗi Gemini API: ${errorData.error?.message || 'Unknown error'}`);
            return null;
        }

        const data = await apiResponse.json();
        
        if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
            createToast('Gemini API trả về dữ liệu không hợp lệ');
            return null;
        }

        try {
            const cleanedResponse = cleanAPIResponse(data.candidates[0].content.parts[0].text);
            console.log('Original Gemini API Response:', data.candidates[0].content.parts[0].text);
            console.log('Cleaned Gemini API Response:', cleanedResponse);

            const parsedData = JSON.parse(cleanedResponse);
            validateAPIResponse(parsedData);
            return parsedData;
        } catch (e) {
            createToast(`Lỗi xử lý dữ liệu Gemini: ${e.message}`);
            console.error('Original Gemini API Response:', data.candidates[0].content.parts[0].text);
            console.error('Parse Error:', e);
            return null;
        }
    } catch (error) {
        createToast(`Lỗi kết nối Gemini: ${error.message}`);
        console.error('Gemini API Error:', error);
        return null;
    }
}

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

// Main Functions
async function initializeExtension() {
    try {
        if (!chrome.runtime?.id) {
            console.log('Extension context không khả dụng');
            return;
        }
        
        chrome.storage.sync.get([
            'isEnabled', 
            'blacklist', 
            'pageLanguage',
            'apiProvider',
            'openaiKey',
            'geminiKey',
            'openaiModel',
            'geminiModel'
        ], function(result) {
            if (chrome.runtime.lastError) {
                console.error('Error loading settings:', chrome.runtime.lastError);
                return;
            }
            
            // Xác định provider và key tương ứng
            const provider = result.apiProvider;
            const apiKey = provider === 'openai' ? result.openaiKey : result.geminiKey;
            const model = provider === 'openai' ? result.openaiModel : result.geminiModel;
            
            // Cập nhật cấu hình
            updateConfig({
                isEnabled: result.isEnabled !== undefined ? result.isEnabled : true,
                blacklist: result.blacklist ? result.blacklist.split('\n')
                    .map(domain => domain.trim().toLowerCase())
                    .filter(domain => domain) : [],
                pageLanguage: result.pageLanguage || 'both',
                apiProvider: provider,
                apiKey: apiKey,
                model: model
            });

            // Kiểm tra điều kiện trước khi xử lý trang
            if (!provider) {
                createToast('Vui lòng chọn API provider (OpenAI hoặc Gemini) trong phần cài đặt');
                return;
            }

            if (!apiKey) {
                createToast(`Vui lòng nhập API key cho ${provider} trong phần cài đặt`);
                return;
            }
            
            // Chỉ xử lý trang khi đã có đủ thông tin cần thiết
            if (isEnabled && !isBlacklisted() && !hasProcessedPage && shouldProcessPage()) {
                processPage();
            }
        });
    } catch (error) {
        console.error('Error initializing extension:', error);
    }
}

async function processPage() {
    if (!isEnabled || isProcessing || !shouldProcessPage()) return;
    
    try {
        if (!chrome.runtime?.id) {
            throw new Error('Extension context không khả dụng');
        }

        // Lấy cài đặt mới nhất từ storage
        const settings = await new Promise((resolve) => {
            chrome.storage.sync.get([
                'apiProvider',
                'openaiKey',
                'geminiKey',
                'openaiModel',
                'geminiModel'
            ], resolve);
        });

        // Cập nhật cấu hình với thông tin mới nhất
        const provider = settings.apiProvider;
        const apiKey = provider === 'openai' ? settings.openaiKey : settings.geminiKey;
        const model = provider === 'openai' ? settings.openaiModel : settings.geminiModel;
        
        updateConfig({
            apiProvider: provider,
            apiKey: apiKey,
            model: model
        });

        if (isBlacklisted()) {
            console.log('Trang web này nằm trong blacklist');
            return;
        }

        // Kiểm tra cài đặt ngôn ngữ
        if (!shouldProcessPage()) {
            console.log('Trang web này không phù hợp với cài đặt ngôn ngữ');
            createToast('Trang web này không phù hợp với cài đặt ngôn ngữ đã chọn', 'info');
            return;
        }

        // Kiểm tra API provider đã được chọn chưa
        if (!currentApiProvider) {
            createToast('Vui lòng chọn API provider (OpenAI hoặc Gemini) trong phần cài đặt');
            return;
        }
        
        setIsProcessing(true);
        
        setIsEnglishPage(detectPageLanguage() === 'en');
        const contents = getAllContent();
        
        if (contents.length === 0) {
            createToast('Không tìm thấy nội dung để xử lý', 'info');
            return;
        }

        let result;
        // Chỉ gọi API tương ứng với provider được chọn
        if (currentApiProvider === 'openai') {
            if (!currentApiKey) {
                createToast('OpenAI API key không được cung cấp. Vui lòng nhập API key trong phần cài đặt.');
                return;
            }
            result = await processWithOpenAI(contents);
        } else if (currentApiProvider === 'gemini') {
            if (!currentApiKey) {
                createToast('Gemini API key không được cung cấp. Vui lòng nhập API key trong phần cài đặt.');
                return;
            }
            result = await processWithGemini(contents);
        } else {
            createToast('API provider không hợp lệ');
            return;
        }

        if (result && result.replacements) {
            contents.forEach(({element}) => {
                applyReplacements(element, result.replacements);
            });
            setHasProcessedPage(true);
            createToast(`Đã xử lý thành công trang ${isEnglishPage ? 'tiếng Anh' : 'tiếng Việt'} với ${currentApiProvider}!`, 'success');
        }
    } catch (error) {
        console.error('Process Page Error:', error);
        createToast('Lỗi xử lý trang: ' + error.message);
        if (error.message.includes('Extension context không khả dụng')) {
            setTimeout(initializeExtension, 1000);
        }
    } finally {
        setIsProcessing(false);
    }
}

async function initialize() {
    try {
        // Thêm styles
        document.head.appendChild(fontStyle);
        document.head.appendChild(tooltipStyle);

        await waitForFullLoad();
        if (!chrome.runtime?.id) {
            throw new Error('Extension context không khả dụng');
        }

        // Khởi tạo extension và lắng nghe messages
        await initializeExtension();

        // Lắng nghe messages từ popup
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            try {
                if (!chrome.runtime?.id) {
                    console.log('Extension context không khả dụng');
                    return;
                }

                if (message.type === 'settingsUpdated') {
                    // Xóa tất cả replacements hiện tại
                    removeAllReplacements();
                    
                    // Cập nhật cấu hình mới
                    updateConfig({
                        isEnabled: message.isEnabled,
                        blacklist: message.blacklist,
                        pageLanguage: message.pageLanguage,
                        apiProvider: message.apiProvider,
                        apiKey: message.apiKey,
                        model: message.model
                    });
                    
                    // Reset các trạng thái
                    hasProcessedPage = false;
                    isProcessing = false;
                    
                    // Kiểm tra và xử lý lại trang nếu cần
                    if (isEnabled && !isBlacklisted() && shouldProcessPage()) {
                        processPage();
                    }
                    
                    sendResponse({success: true});
                } else if (message.type === 'refreshWords') {
                    // Xóa tất cả replacements hiện tại
                    removeAllReplacements();
                    
                    // Cập nhật cấu hình mới
                    updateConfig({
                        isEnabled: message.isEnabled,
                        blacklist: message.blacklist,
                        pageLanguage: message.pageLanguage,
                        apiProvider: message.apiProvider,
                        apiKey: message.apiKey,
                        model: message.model
                    });
                    
                    // Reset các trạng thái
                    hasProcessedPage = false;
                    isProcessing = false;
                    
                    // Xử lý lại trang
                    if (isEnabled && !isBlacklisted() && shouldProcessPage()) {
                        processPage();
                    }
                    
                    sendResponse({success: true});
                }
            } catch (error) {
                console.error('Error handling message:', error);
                sendResponse({success: false, error: error.message});
            }
            return true;
        });

        // Xử lý trang nếu được kích hoạt
        if (isEnabled && !isBlacklisted() && !hasProcessedPage && shouldProcessPage()) {
            await processPage();
        }

    } catch (error) {
        console.error('Initialization Error:', error);
        createToast('Lỗi khởi động extension: ' + error.message);
        if (error.message.includes('Extension context không khả dụng')) {
            setTimeout(initializeExtension, 1000);
        }
    }
}

// Khởi động extension
initialize();
