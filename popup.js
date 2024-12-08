document.addEventListener('DOMContentLoaded', async () => {
    const apiKeyInput = document.getElementById('apiKey');
    const modelSelect = document.getElementById('model');
    const rateInput = document.getElementById('replacementRate');
    const saveButton = document.getElementById('saveButton');
    const extensionToggle = document.getElementById('extensionToggle');
    const blacklistInput = document.getElementById('blacklist');

    // Load saved settings
    const settings = await chrome.storage.sync.get(['apiKey', 'model', 'replacementRate', 'isEnabled', 'blacklist']);
    if (settings.apiKey) apiKeyInput.value = settings.apiKey;
    if (settings.model) modelSelect.value = settings.model;
    if (settings.replacementRate) rateInput.value = settings.replacementRate;
    if (settings.isEnabled !== undefined) extensionToggle.checked = settings.isEnabled;
    else extensionToggle.checked = true; // Mặc định bật extension
    if (settings.blacklist) blacklistInput.value = settings.blacklist;

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

        chrome.storage.sync.set({
            apiKey: apiKeyInput.value,
            model: modelSelect.value,
            replacementRate: rateInput.value,
            isEnabled: extensionToggle.checked,
            blacklist: blacklist.join('\n')
        }, () => {
            // Thông báo cho content script biết có sự thay đổi
            chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
                chrome.tabs.sendMessage(tabs[0].id, {
                    type: 'settingsUpdated',
                    isEnabled: extensionToggle.checked,
                    blacklist: blacklist
                });
            });
            
            // Hiển thị thông báo đã lưu
            saveButton.textContent = 'Save Done!';
            setTimeout(() => {
                saveButton.textContent = 'Save';
            }, 2000);
        });
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

        chrome.storage.sync.set({
            isEnabled: extensionToggle.checked,
            blacklist: blacklist.join('\n')
        }, () => {
            // Thông báo cho content script
            chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
                chrome.tabs.sendMessage(tabs[0].id, {
                    type: 'settingsUpdated',
                    isEnabled: extensionToggle.checked,
                    blacklist: blacklist
                });
            });
        });
    });
});
