// Lưu trữ các từ đã thay thế để hiển thị nghĩa khi hover
let replacedWords = new Map();
let isEnabled = true;
let isProcessing = false;
let blacklist = [];
let hasProcessedPage = false; // Flag để kiểm tra đã xử lý page chưa

// Thêm font Unicode cho tiếng Việt
const fontStyle = document.createElement('style');
fontStyle.textContent = `
@import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&display=swap');

.english-word, 
.english-word::after {
    font-family: 'Roboto', -apple-system, BlinkMacSystemFont, 'Segoe UI', 
                 'Helvetica Neue', Arial, sans-serif;
}
`;
document.head.appendChild(fontStyle);

// Hàm encode/decode Unicode cho tiếng Việt
function encodeVietnamese(str) {
    return encodeURIComponent(str).replace(/%/g, '\\');
}

function decodeVietnamese(str) {
    return decodeURIComponent(str.replace(/\\/g, '%'));
}

// Kiểm tra xem trang web hiện tại có trong blacklist không
function isBlacklisted() {
    const currentDomain = window.location.hostname.toLowerCase()
        .replace(/^www\./i, ''); // Loại bỏ www. nếu có
    
    return blacklist.some(domain => {
        // Chuyển domain trong blacklist thành regex pattern
        const pattern = domain
            .replace(/\./g, '\\.') // Escape dấu chấm
            .replace(/\*/g, '.*'); // Chuyển * thành .*
        const regex = new RegExp(`^${pattern}$`);
        return regex.test(currentDomain);
    });
}

// Tạo toast notification
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

// Kiểm tra trạng thái ban đầu và blacklist
function initializeExtension() {
    try {
        if (!chrome.runtime?.id) {
            console.log('Extension context không khả dụng');
            return;
        }
        
        chrome.storage.sync.get(['isEnabled', 'blacklist'], function(result) {
            if (chrome.runtime.lastError) {
                console.error('Error loading settings:', chrome.runtime.lastError);
                return;
            }
            isEnabled = result.isEnabled !== undefined ? result.isEnabled : true;
            if (result.blacklist) {
                blacklist = result.blacklist.split('\n')
                    .map(domain => domain.trim().toLowerCase())
                    .filter(domain => domain);
            }
        });
    } catch (error) {
        console.error('Error initializing extension:', error);
    }
}

initializeExtension();

// Lắng nghe thay đổi từ popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    try {
        if (!chrome.runtime?.id) {
            console.log('Extension context không khả dụng');
            return;
        }

        if (message.type === 'settingsUpdated') {
            isEnabled = message.isEnabled;
            if (message.blacklist) {
                blacklist = message.blacklist;
            }
            if (!isEnabled) {
                removeAllReplacements();
            }
            sendResponse({success: true});
        }
    } catch (error) {
        console.error('Error handling message:', error);
        sendResponse({success: false, error: error.message});
    }
    return true; // Giữ kết nối message cho đến khi sendResponse được gọi
});

// Hàm xóa tất cả các từ đã thay thế
function removeAllReplacements() {
    const replacedElements = document.querySelectorAll('.english-word');
    replacedElements.forEach(element => {
        const text = element.textContent;
        const textNode = document.createTextNode(text);
        element.parentNode.replaceChild(textNode, element);
    });
    hasProcessedPage = false; // Reset flag khi xóa hết replacements
}

// Hàm làm sạch HTML và bảo toàn Unicode
function sanitizeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// Hàm làm sạch response từ API
function cleanAPIResponse(response) {
    try {
        // Loại bỏ các ký tự không phải JSON ở đầu và cuối
        response = response.trim();
        
        // Tìm vị trí bắt đầu của JSON object (ký tự '{')
        const startIndex = response.indexOf('{');
        // Tìm vị trí kết thúc của JSON object (ký tự '}' cuối cùng)
        const endIndex = response.lastIndexOf('}') + 1;
        
        if (startIndex === -1 || endIndex === 0) {
            throw new Error('Không tìm thấy JSON object hợp lệ trong response');
        }
        
        // Chỉ lấy phần JSON object
        response = response.substring(startIndex, endIndex);
        
        // Thử parse để kiểm tra tính hợp lệ
        JSON.parse(response);
        
        return response;
    } catch (e) {
        console.error('Clean API Response Error:', e);
        console.log('Original Response:', response);
        throw new Error('Không thể làm sạch response: ' + e.message);
    }
}

// Hàm kiểm tra response từ API
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

// Hàm lấy tất cả nội dung text cần xử lý
function getAllContent() {
    const targetElements = document.querySelectorAll('h1, h2, h3, h4, h5, h6, p, span');
    const contents = [];

    targetElements.forEach(element => {
        // Bỏ qua các phần tử đã được xử lý
        if (element.closest('.english-word')) return;
        
        // Bỏ qua các script, style và các phần tử không hiển thị
        if (element.tagName === 'SCRIPT' || 
            element.tagName === 'STYLE' || 
            element.tagName === 'NOSCRIPT' ||
            getComputedStyle(element).display === 'none' ||
            getComputedStyle(element).visibility === 'hidden') {
            return;
        }

        // Chỉ lấy text content, không lấy HTML
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

// Hàm gửi nội dung đến OpenAI API
async function processWithOpenAI(contents) {
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

        const apiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${response.apiKey}`
            },
            body: JSON.stringify({
                model: response.model || 'gpt-4o-mini',
                messages: [
                    {
                        role: "system",
                        content: "You are a language learning assistant. Always return valid JSON with the following format ONLY: {\"replacements\": [{\"vietnamese\": \"text\", \"english\": \"text\", \"meaning\": \"text\"}]}"
                    },
                    {
                        role: "user",
                        content: `
                        Hãy phân tích các đoạn văn bản tiếng Việt sau và thực hiện:
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
                        }
                        
                        Văn bản: ${combinedText}`
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
            // Làm sạch response trước khi parse
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

// Hàm thay thế text với từ tiếng Anh
function applyReplacements(element, replacements) {
    if (!isEnabled) return;

    try {
        // Tạo một bản sao của element để làm việc
        const tempContainer = document.createElement('div');
        tempContainer.innerHTML = element.innerHTML;

        // Lấy tất cả các text node
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

        // Thay thế text trong mỗi text node
        textNodes.forEach(textNode => {
            let content = textNode.textContent;
            replacements.forEach(({ vietnamese, english, meaning }) => {
                try {
                    replacedWords.set(english, meaning);
                    const safeEnglish = sanitizeHTML(english);
                    const safeMeaning = sanitizeHTML(meaning);
                    
                    // Tạo regex an toàn hơn để tránh match HTML tags và bảo toàn Unicode
                    const escapedVietnamese = vietnamese.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    const regex = new RegExp(`(?<!<[^>]*)${escapedVietnamese}(?![^<]*>)`, 'gi');
                    content = content.replace(regex, `<span class="english-word" data-meaning="${safeMeaning}">${safeEnglish}</span>`);
                } catch (e) {
                    console.error('Replacement Error:', e);
                }
            });
            
            // Tạo một container tạm thời để parse HTML
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = content;
            
            // Thay thế text node cũ bằng nội dung mới
            const fragment = document.createDocumentFragment();
            while (tempDiv.firstChild) {
                fragment.appendChild(tempDiv.firstChild);
            }
            textNode.parentNode.replaceChild(fragment, textNode);
        });

        // Cập nhật nội dung gốc
        element.innerHTML = tempContainer.innerHTML;
    } catch (error) {
        console.error('Apply Replacements Error:', error);
        createToast('Lỗi khi thay thế text: ' + error.message);
    }
}

// Thêm CSS cho tooltip và highlight
const style = document.createElement('style');
style.textContent = `
.english-word {
    background-color: rgba(255, 0, 0, 0.2);
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
document.head.appendChild(style);

// Hàm chính để xử lý trang
async function processPage() {
    // Kiểm tra đã xử lý page chưa và có đang xử lý không
    if (!isEnabled || isProcessing || hasProcessedPage) return;
    
    try {
        if (!chrome.runtime?.id) {
            throw new Error('Extension context không khả dụng');
        }

        // Kiểm tra blacklist
        if (isBlacklisted()) {
            console.log('Trang web này nằm trong blacklist');
            return;
        }
        
        isProcessing = true;
        const contents = getAllContent();
        
        if (contents.length === 0) {
            createToast('Không tìm thấy nội dung để xử lý', 'info');
            return;
        }

        const result = await processWithOpenAI(contents);
        if (result && result.replacements) {
            contents.forEach(({element}) => {
                applyReplacements(element, result.replacements);
            });
            hasProcessedPage = true; // Đánh dấu đã xử lý page
            createToast('Đã xử lý thành công!', 'success');
        }
    } catch (error) {
        console.error('Process Page Error:', error);
        createToast('Lỗi xử lý trang: ' + error.message);
        if (error.message.includes('Extension context không khả dụng')) {
            // Thử khởi động lại extension
            setTimeout(initializeExtension, 1000);
        }
    } finally {
        isProcessing = false;
    }
}

// Đợi trang web load hoàn toàn và tất cả resources
function waitForFullLoad() {
    return new Promise(resolve => {
        // Kiểm tra nếu page đã load xong
        if (document.readyState === 'complete') {
            // Thêm delay để đảm bảo tất cả resources đã load
            setTimeout(resolve, 500);
        } else {
            // Đăng ký event listener cho load event
            window.addEventListener('load', () => {
                // Thêm delay để đảm bảo tất cả resources đã load
                setTimeout(resolve, 500);
            });
        }
    });
}

// Khởi động extension
async function initialize() {
    try {
        await waitForFullLoad(); // Đợi page load hoàn toàn
        if (!chrome.runtime?.id) {
            throw new Error('Extension context không khả dụng');
        }
        if (isEnabled && !isBlacklisted() && !hasProcessedPage) {
            await processPage();
        }
    } catch (error) {
        console.error('Initialization Error:', error);
        createToast('Lỗi khởi động extension: ' + error.message);
        if (error.message.includes('Extension context không khả dụng')) {
            // Thử khởi động lại extension
            setTimeout(initializeExtension, 1000);
        }
    }
}

initialize();

// Thêm nút để kích hoạt lại việc xử lý
const button = document.createElement('button');
button.textContent = 'Refresh English Words';
button.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    z-index: 10000;
    padding: 10px;
    background: #4CAF50;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    display: none;
    font-family: 'Roboto', -apple-system, BlinkMacSystemFont, 'Segoe UI', 
                 'Helvetica Neue', Arial, sans-serif;
`;

// Chỉ hiển thị nút khi trang không nằm trong blacklist
if (!isBlacklisted()) {
    button.style.display = 'block';
}

button.addEventListener('click', async () => {
    try {
        if (!chrome.runtime?.id) {
            throw new Error('Extension context không khả dụng');
        }
        if (isEnabled && !isProcessing && !isBlacklisted()) {
            // Reset flag khi người dùng chủ động refresh
            hasProcessedPage = false;
            await processPage();
        }
    } catch (error) {
        console.error('Button Click Error:', error);
        createToast('Lỗi: ' + error.message);
        if (error.message.includes('Extension context không khả dụng')) {
            // Thử khởi động lại extension
            setTimeout(initializeExtension, 1000);
        }
    }
});
document.body.appendChild(button);
