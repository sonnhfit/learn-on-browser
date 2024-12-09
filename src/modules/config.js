// Cấu hình và biến toàn cục
export let replacedWords = new Map();
export let isEnabled = true;
export let isProcessing = false;
export let blacklist = [];
export let hasProcessedPage = false;
export let isEnglishPage = false;

// Font style cho tiếng Việt
export const fontStyle = document.createElement('style');
fontStyle.textContent = `
@import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&display=swap');

.english-word, 
.english-word::after {
    font-family: 'Roboto', -apple-system, BlinkMacSystemFont, 'Segoe UI', 
                 'Helvetica Neue', Arial, sans-serif;
}
`;

// CSS cho tooltip và highlight
export const tooltipStyle = document.createElement('style');
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
export function updateConfig(newConfig) {
    if (newConfig.isEnabled !== undefined) {
        isEnabled = newConfig.isEnabled;
    }
    if (newConfig.blacklist) {
        blacklist = newConfig.blacklist;
    }
}

// Export các biến để có thể cập nhật từ bên ngoài
export function setIsProcessing(value) {
    isProcessing = value;
}

export function setHasProcessedPage(value) {
    hasProcessedPage = value;
}

export function setIsEnglishPage(value) {
    isEnglishPage = value;
}
