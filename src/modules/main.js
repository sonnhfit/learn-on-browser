import { 
    isEnabled, isProcessing, hasProcessedPage, setIsProcessing, 
    setHasProcessedPage, setIsEnglishPage, updateConfig,
    fontStyle, tooltipStyle 
} from '/src/modules/config.js';

import { 
    detectPageLanguage, isBlacklisted, createToast, 
    waitForFullLoad, getAllContent 
} from '/src/modules/utils.js';

import { processWithOpenAI } from '/src/modules/api.js';
import { applyReplacements, removeAllReplacements, createRefreshButton } from '/src/modules/dom.js';

// Khởi tạo extension
async function initializeExtension() {
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
            updateConfig({
                isEnabled: result.isEnabled !== undefined ? result.isEnabled : true,
                blacklist: result.blacklist ? result.blacklist.split('\n')
                    .map(domain => domain.trim().toLowerCase())
                    .filter(domain => domain) : []
            });
        });
    } catch (error) {
        console.error('Error initializing extension:', error);
    }
}

// Xử lý trang
async function processPage() {
    if (!isEnabled || isProcessing || hasProcessedPage) return;
    
    try {
        if (!chrome.runtime?.id) {
            throw new Error('Extension context không khả dụng');
        }

        if (isBlacklisted()) {
            console.log('Trang web này nằm trong blacklist');
            return;
        }
        
        setIsProcessing(true);
        
        setIsEnglishPage(detectPageLanguage() === 'en');
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
            setHasProcessedPage(true);
            createToast(`Đã xử lý thành công trang ${isEnglishPage ? 'tiếng Anh' : 'tiếng Việt'}!`, 'success');
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

// Khởi động extension
export async function initialize() {
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

        // Tạo nút refresh
        const { button, updateButtonText } = createRefreshButton();
        
        if (!isBlacklisted()) {
            button.style.display = 'block';
        }

        button.addEventListener('click', async () => {
            try {
                if (!chrome.runtime?.id) {
                    throw new Error('Extension context không khả dụng');
                }
                if (isEnabled && !isProcessing && !isBlacklisted()) {
                    setHasProcessedPage(false);
                    await processPage();
                }
            } catch (error) {
                console.error('Button Click Error:', error);
                createToast('Lỗi: ' + error.message);
                if (error.message.includes('Extension context không khả dụng')) {
                    setTimeout(initializeExtension, 1000);
                }
            }
        });

        document.body.appendChild(button);

        // Lắng nghe messages từ popup
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            try {
                if (!chrome.runtime?.id) {
                    console.log('Extension context không khả dụng');
                    return;
                }

                if (message.type === 'settingsUpdated') {
                    updateConfig({
                        isEnabled: message.isEnabled,
                        blacklist: message.blacklist
                    });
                    if (!isEnabled) {
                        removeAllReplacements();
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
        if (isEnabled && !isBlacklisted() && !hasProcessedPage) {
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
