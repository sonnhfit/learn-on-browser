// Khởi tạo extension
chrome.runtime.onInstalled.addListener(() => {
  console.log('English Learning Assistant đã được cài đặt');
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
  console.log('Extension đã được khởi động lại');
});
