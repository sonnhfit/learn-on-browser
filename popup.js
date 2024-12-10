document.addEventListener('DOMContentLoaded', async () => {
    // Elements
    const apiProviderSelect = document.getElementById('apiProvider');
    const openaiSection = document.getElementById('openaiSection');
    const geminiSection = document.getElementById('geminiSection');
    const openaiKeyInput = document.getElementById('openaiKey');
    const geminiKeyInput = document.getElementById('geminiKey');
    const openaiModelSelect = document.getElementById('openaiModel');
    const geminiModelSelect = document.getElementById('geminiModel');
    const rateInput = document.getElementById('replacementRate');
    const saveButton = document.getElementById('saveButton');
    const refreshButton = document.getElementById('refreshButton');
    const extensionToggle = document.getElementById('extensionToggle');
    const blacklistInput = document.getElementById('blacklist');
    const languageRadios = document.getElementsByName('pageLanguage');

    // Load saved settings
    const settings = await chrome.storage.sync.get([
        'apiProvider',
        'openaiKey', 
        'geminiKey',
        'openaiModel', 
        'geminiModel',
        'replacementRate', 
        'isEnabled', 
        'blacklist',
        'pageLanguage'
    ]);
    
    // Set values from saved settings
    if (settings.apiProvider) apiProviderSelect.value = settings.apiProvider;
    if (settings.openaiKey) openaiKeyInput.value = settings.openaiKey;
    if (settings.geminiKey) geminiKeyInput.value = settings.geminiKey;
    if (settings.openaiModel) openaiModelSelect.value = settings.openaiModel;
    if (settings.geminiModel) geminiModelSelect.value = settings.geminiModel;
    if (settings.replacementRate) rateInput.value = settings.replacementRate;
    if (settings.isEnabled !== undefined) extensionToggle.checked = settings.isEnabled;
    else extensionToggle.checked = true; // Mặc định bật extension
    if (settings.blacklist) blacklistInput.value = settings.blacklist;
    
    // Show/hide API sections based on selected provider
    updateApiSections(settings.apiProvider || 'openai');
    
    // Set default language option to 'both' if not set
    const selectedLanguage = settings.pageLanguage || 'both';
    for (let radio of languageRadios) {
        if (radio.value === selectedLanguage) {
            radio.checked = true;
            break;
        }
    }

    // Handle API provider change
    apiProviderSelect.addEventListener('change', (e) => {
        updateApiSections(e.target.value);
    });

    function updateApiSections(provider) {
        if (provider === 'openai') {
            openaiSection.style.display = 'block';
            geminiSection.style.display = 'none';
        } else {
            openaiSection.style.display = 'none';
            geminiSection.style.display = 'block';
        }
    }

    // Save settings when button is clicked
    saveButton.addEventListener('click', () => {
        // Xử lý và làm sạch blacklist
        const blacklist = blacklistInput.value
            .split('\n')
            .map(domain => domain.trim().toLowerCase())
            .filter(domain => domain) // Loại bỏ các dòng trống
            .map(domain => {
                // Loại bỏ http://, https://, www. nếu có
                return domain
                    .replace(/^https?:\/\//i, '')
                    .replace(/^www\./i, '');
            });

        // Get selected language option
        let selectedLanguage = 'both';
        for (let radio of languageRadios) {
            if (radio.checked) {
                selectedLanguage = radio.value;
                break;
            }
        }

        // Get current API provider settings
        const currentProvider = apiProviderSelect.value;
        const apiKey = currentProvider === 'openai' ? openaiKeyInput.value : geminiKeyInput.value;
        const model = currentProvider === 'openai' ? openaiModelSelect.value : geminiModelSelect.value;

        chrome.storage.sync.set({
            apiProvider: currentProvider,
            openaiKey: openaiKeyInput.value,
            geminiKey: geminiKeyInput.value,
            openaiModel: openaiModelSelect.value,
            geminiModel: geminiModelSelect.value,
            replacementRate: rateInput.value,
            isEnabled: extensionToggle.checked,
            blacklist: blacklist.join('\n'),
            pageLanguage: selectedLanguage
        }, () => {
            // Thông báo cho content script biết có sự thay đổi
            chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
                chrome.tabs.sendMessage(tabs[0].id, {
                    type: 'settingsUpdated',
                    isEnabled: extensionToggle.checked,
                    blacklist: blacklist,
                    pageLanguage: selectedLanguage,
                    apiProvider: currentProvider,
                    apiKey: apiKey,
                    model: model
                });
            });
            
            // Hiển thị thông báo đã lưu
            saveButton.textContent = 'Save Done!';
            setTimeout(() => {
                saveButton.textContent = 'Save';
            }, 2000);
        });
    });

    // Refresh words when refresh button is clicked
    refreshButton.addEventListener('click', () => {
        // Get current API provider settings
        const currentProvider = apiProviderSelect.value;
        const apiKey = currentProvider === 'openai' ? openaiKeyInput.value : geminiKeyInput.value;
        const model = currentProvider === 'openai' ? openaiModelSelect.value : geminiModelSelect.value;

        // Get selected language option
        let selectedLanguage = 'both';
        for (let radio of languageRadios) {
            if (radio.checked) {
                selectedLanguage = radio.value;
                break;
            }
        }

        // Get blacklist
        const blacklist = blacklistInput.value
            .split('\n')
            .map(domain => domain.trim().toLowerCase())
            .filter(domain => domain)
            .map(domain => {
                return domain
                    .replace(/^https?:\/\//i, '')
                    .replace(/^www\./i, '');
            });

        // Thông báo cho content script để refresh words
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            chrome.tabs.sendMessage(tabs[0].id, {
                type: 'refreshWords',
                isEnabled: extensionToggle.checked,
                blacklist: blacklist,
                pageLanguage: selectedLanguage,
                apiProvider: currentProvider,
                apiKey: apiKey,
                model: model
            });
        });

        // Hiển thị thông báo đang refresh
        refreshButton.textContent = 'Refreshing...';
        setTimeout(() => {
            refreshButton.textContent = 'Refresh Words';
        }, 2000);
    });

    // Lưu trạng thái bật/tắt ngay khi toggle
    extensionToggle.addEventListener('change', () => {
        const blacklist = blacklistInput.value
            .split('\n')
            .map(domain => domain.trim().toLowerCase())
            .filter(domain => domain)
            .map(domain => {
                return domain
                    .replace(/^https?:\/\//i, '')
                    .replace(/^www\./i, '');
            });

        // Get selected language option
        let selectedLanguage = 'both';
        for (let radio of languageRadios) {
            if (radio.checked) {
                selectedLanguage = radio.value;
                break;
            }
        }

        // Get current API provider settings
        const currentProvider = apiProviderSelect.value;
        const apiKey = currentProvider === 'openai' ? openaiKeyInput.value : geminiKeyInput.value;
        const model = currentProvider === 'openai' ? openaiModelSelect.value : geminiModelSelect.value;

        chrome.storage.sync.set({
            isEnabled: extensionToggle.checked,
            blacklist: blacklist.join('\n'),
            pageLanguage: selectedLanguage,
            apiProvider: currentProvider
        }, () => {
            // Thông báo cho content script
            chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
                chrome.tabs.sendMessage(tabs[0].id, {
                    type: 'settingsUpdated',
                    isEnabled: extensionToggle.checked,
                    blacklist: blacklist,
                    pageLanguage: selectedLanguage,
                    apiProvider: currentProvider,
                    apiKey: apiKey,
                    model: model
                });
            });
        });
    });

    // Lưu cài đặt ngôn ngữ khi thay đổi
    for (let radio of languageRadios) {
        radio.addEventListener('change', () => {
            const blacklist = blacklistInput.value
                .split('\n')
                .map(domain => domain.trim().toLowerCase())
                .filter(domain => domain)
                .map(domain => {
                    return domain
                        .replace(/^https?:\/\//i, '')
                        .replace(/^www\./i, '');
                });

            // Get current API provider settings
            const currentProvider = apiProviderSelect.value;
            const apiKey = currentProvider === 'openai' ? openaiKeyInput.value : geminiKeyInput.value;
            const model = currentProvider === 'openai' ? openaiModelSelect.value : geminiModelSelect.value;

            chrome.storage.sync.set({
                pageLanguage: radio.value,
                isEnabled: extensionToggle.checked,
                blacklist: blacklist.join('\n'),
                apiProvider: currentProvider
            }, () => {
                // Thông báo cho content script
                chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
                    chrome.tabs.sendMessage(tabs[0].id, {
                        type: 'settingsUpdated',
                        isEnabled: extensionToggle.checked,
                        blacklist: blacklist,
                        pageLanguage: radio.value,
                        apiProvider: currentProvider,
                        apiKey: apiKey,
                        model: model
                    });
                });
            });
        });
    }
});
