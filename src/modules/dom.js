import { isEnabled, isEnglishPage, replacedWords } from './config.js';
import { sanitizeHTML } from './utils.js';

// Thay thế text với từ tiếng Anh/Việt
export function applyReplacements(element, replacements) {
    if (!isEnabled) return;

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

// Xóa tất cả các từ đã thay thế
export function removeAllReplacements() {
    const replacedElements = document.querySelectorAll('.english-word');
    replacedElements.forEach(element => {
        const text = element.textContent;
        const textNode = document.createTextNode(text);
        element.parentNode.replaceChild(textNode, element);
    });
}

// Tạo nút refresh
export function createRefreshButton() {
    const button = document.createElement('button');
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

    function updateButtonText() {
        button.textContent = `Refresh ${isEnglishPage ? 'Vietnamese' : 'English'} Words`;
    }

    updateButtonText();
    return { button, updateButtonText };
}
