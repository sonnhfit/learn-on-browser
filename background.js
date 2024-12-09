// Khởi tạo extension
chrome.runtime.onInstalled.addListener(() => {
  console.log('English Learning Assistant đã được cài đặt - Hỗ trợ cả trang tiếng Anh và tiếng Việt');
});

// Lắng nghe messages từ content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  try {
    if (request.type === 'processText') {
      // Kiểm tra context của extension
      if (!chrome.runtime?.id) {
        sendResponse({
          success: false,
          error: 'Extension context không khả dụng'
        });
        return true;
      }

      // Log thông tin về ngôn ngữ trang web
      console.log(`Xử lý trang web: ${sender.tab?.url}`);
      console.log(`Ngôn ngữ được phát hiện: ${request.language || 'chưa xác định'}`);

      // Xử lý message
      sendResponse({success: true});
    }
  } catch (error) {
    console.error('Error handling message:', error);
    sendResponse({
      success: false,
      error: error.message
    });
  }
  return true; // Giữ kết nối message cho đến khi sendResponse được gọi
});

// Xử lý khi extension được reload hoặc update
chrome.runtime.onSuspend.addListener(() => {
  console.log('Extension đang được reload hoặc update');
});

// Xử lý khi extension được khôi phục
chrome.runtime.onStartup.addListener(() => {
  console.log('Extension đã được khởi động lại - Sẵn sàng xử lý cả trang tiếng Anh và tiếng Việt');
});

// Xử lý khi tab được kích hoạt
chrome.tabs.onActivated.addListener((activeInfo) => {
  chrome.tabs.get(activeInfo.tabId, (tab) => {
    console.log(`Tab mới được kích hoạt: ${tab.url}`);
    console.log('Extension sẽ tự động phát hiện ngôn ngữ của trang');
  });
});
