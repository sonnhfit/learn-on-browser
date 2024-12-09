import { blacklist } from '/src/modules/config.js';

// Hàm phát hiện ngôn ngữ của trang
export function detectPageLanguage() {
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

// Hàm encode/decode Unicode cho tiếng Việt
export function encodeVietnamese(str) {
    return encodeURIComponent(str).replace(/%/g, '\\');
}

export function decodeVietnamese(str) {
    return decodeURIComponent(str.replace(/\\/g, '%'));
}

// Kiểm tra trang web có trong blacklist
export function isBlacklisted() {
    const currentDomain = window.location.hostname.toLowerCase()
        .replace(/^www\./i, '');
    
    return blacklist.some(domain => {
        // Loại bỏ www. từ domain trong blacklist
        const cleanDomain = domain.toLowerCase().replace(/^www\./i, '');
        
        // Nếu domain trong blacklist bắt đầu bằng dấu * 
        if (cleanDomain.startsWith('*.')) {
            // Lấy phần domain chính (bỏ dấu *.)
            const mainDomain = cleanDomain.substring(2);
            // Kiểm tra xem domain hiện tại có kết thúc bằng domain chính không
            return currentDomain.endsWith(mainDomain);
        }
        
        // Nếu domain trong blacklist không có dấu *, kiểm tra chính xác
        if (currentDomain === cleanDomain) {
            return true;
        }
        
        // Kiểm tra xem domain hiện tại có phải là subdomain của domain trong blacklist
        if (currentDomain.endsWith('.' + cleanDomain)) {
            return true;
        }
        
        return false;
    });
}

// Tạo toast notification
export function createToast(message, type = 'error') {
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

// Làm sạch HTML và bảo toàn Unicode
export function sanitizeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// Đợi trang web load hoàn toàn
export function waitForFullLoad() {
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

// Lấy tất cả nội dung text cần xử lý
export function getAllContent() {
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
