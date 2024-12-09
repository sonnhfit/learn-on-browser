# English Learning Assistant Extension

## Giới thiệu
English Learning Assistant là extension Chrome giúp bạn học tiếng Anh thông qua việc thay thế từ vựng trên các trang web. Extension hoạt động với cả trang tiếng Việt (thay thế từ Việt bằng từ Anh) và trang tiếng Anh (thay thế từ Anh bằng từ Việt).

## Tính năng chính
- Tự động phát hiện ngôn ngữ của trang web
- Thay thế từ vựng với nghĩa tương ứng
- Hiển thị nghĩa khi di chuột qua từ được thay thế
- Tùy chọn xử lý theo loại trang (tiếng Anh/tiếng Việt/cả hai)
- Tùy chỉnh tỉ lệ từ được thay thế
- Blacklist các trang web không muốn xử lý
- Nút refresh để cập nhật từ vựng mới
- Giao diện thân thiện, dễ sử dụng

## Yêu cầu
- Google Chrome hoặc trình duyệt tương thích với Chrome Extension
- OpenAI API key (để sử dụng GPT-4 cho việc phân tích và thay thế từ)

## Cài đặt
1. Tải extension về máy và giải nén
2. Mở Chrome, vào menu > More Tools > Extensions
3. Bật chế độ Developer mode (góc phải)
4. Chọn "Load unpacked" và chọn thư mục chứa extension đã giải nén
5. Extension sẽ xuất hiện trên thanh công cụ Chrome

## Cấu hình ban đầu
1. Click vào icon extension trên thanh công cụ
2. Nhập OpenAI API key vào ô "API Key"
3. Chọn model GPT muốn sử dụng
4. Điều chỉnh tỉ lệ từ muốn thay thế (mặc định 20%)
5. Chọn loại trang web muốn xử lý:
   - Cả trang tiếng Anh và tiếng Việt
   - Chỉ trang tiếng Anh
   - Chỉ trang tiếng Việt
6. (Tùy chọn) Thêm các trang web vào blacklist nếu không muốn extension hoạt động

## Cách sử dụng
1. Truy cập bất kỳ trang web nào
2. Extension sẽ tự động phát hiện ngôn ngữ và thay thế từ vựng nếu phù hợp với cài đặt
3. Di chuột qua các từ được highlight để xem nghĩa
4. Sử dụng nút Refresh ở góc phải dưới để cập nhật từ vựng mới
5. Bật/tắt extension bằng công tắc trong popup

## Cấu hình Blacklist
Có hai cách để thêm trang web vào blacklist:
1. Chặn domain cụ thể:
   ```
   example.com
   ```
   Sẽ chặn: example.com, abc.example.com, xyz.example.com

2. Chỉ định rõ việc chặn subdomain:
   ```
   *.example.com
   ```
   Sẽ chặn: example.com và tất cả subdomain

Lưu ý: 
- Không cần nhập http:// hoặc www.
- Mỗi domain một dòng
- Các thay đổi trong blacklist có hiệu lực ngay lập tức

## Báo lỗi và Góp ý
Nếu bạn gặp lỗi hoặc có ý tưởng cải thiện, vui lòng liên hệ qua [Facebook](https://www.facebook.com/nhsonit).

## Lưu ý
- Extension cần OpenAI API key để hoạt động
- Việc sử dụng API có thể phát sinh phí tùy theo số lượng request
- Nên điều chỉnh tỉ lệ thay thế từ phù hợp để tối ưu chi phí và trải nghiệm học tập
