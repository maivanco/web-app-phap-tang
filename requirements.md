# Brief xây chatbot quản lý thu chi

**HỆ THỐNG PHÁP TẠNG**

## **1\. Mục tiêu**

Xây lại hệ thống nhập đơn bán hàng và chi tiêu bằng chatbot Telegram, backend Google Apps Script, dữ liệu và dashboard trên Google Sheets. Giữ cách hỏi từng bước và danh mục lựa chọn hiện tại, bổ sung kiểm soát dữ liệu, phân quyền sửa và theo dõi tiền quẹt thẻ về tài khoản.

## **2\. Phiên bản đầu**

| Gồm có | Chưa triển khai |
| :---- | :---- |
| Đơn nhiều sản phẩm, nhiều thương hiệu; chiết khấu chung theo đơn. | Đặt cọc, công nợ, tồn kho, giá vốn, chia hoa hồng. |
| Chi tiêu đã duyệt; quỹ tiền mặt riêng theo chi nhánh; tài khoản ngân hàng dùng danh mục chung. | Quy trình duyệt chi; thanh toán thẻ cho khoản chi. |
| Doanh thu theo thời gian, chi nhánh, thương hiệu, nguồn khách; số dư và tiền thẻ chờ về. | Quy trình đổi trả và hoàn tiền tự động; có thể ghi chú và quản lý xử lý điều chỉnh có lịch sử. |

## **3\. Nguyên tắc vận hành**

Một mã đơn liên kết nhiều dòng sản phẩm nhưng chỉ có một mức chiết khấu chung. Nhà phân phối trong giao diện được hiểu là thương hiệu, không phải nhà cung cấp. Sản phẩm nhập tự do theo loại sản phẩm và tên, ví dụ Nhang Nag, Vòng Băng Chủng, Vé PBNT.

Seller nhập tên tư vấn viên/người chi bằng tay. Hệ thống đồng thời lưu Telegram ID của người thao tác để kiểm soát quyền và truy vết. Chỉ quản lý được sửa hoặc hủy giao dịch đã lưu.

Chi nhánh đã chọn được giữ trong phiên nhập và lưu vào từng giao dịch. Không hỏi lại chi nhánh khi chọn tiền mặt. Khi bắt đầu mới mà phiên chưa có chi nhánh, bot yêu cầu chọn một lần trước khi nhập nghiệp vụ; đây là quy ước triển khai để cả luồng thu và chi luôn có chi nhánh.

# **4 Danh mục lựa chọn**

| Mã | Chi nhánh |
| :---- | :---- |
| A | 240 Xã Đàn, Thanh Xuân, Hà Nội |
| B | 764 Nguyễn Chí Thanh, Phường Minh Phụng, TP Hồ Chí Minh |
| C | 11A Tôn Đức Thắng, Phường Sài Gòn, Quận 1, Hồ Chí Minh |

Giữ nguyên tên địa chỉ do chủ hệ thống cung cấp. Mỗi chi nhánh tương ứng một quỹ tiền mặt độc lập.

| Mã | Nguồn khách | Chiết khấu toàn đơn |
| :---- | :---- | :---- |
| A | Tiktok | Giảm 3% |
| B | Facebook | Giảm 5% |
| C | Vãng lai | Giảm 10% |
| D | Đạo tràng | Giảm 15% |
| E | Cũ | Không giảm |
| F | Khác | Không áp dụng |

Nguồn khách và chiết khấu là hai câu hỏi độc lập. Danh mục nguồn khách có A–F; danh mục chiết khấu chỉ có A–E.

| Mã | Tài khoản hoặc lựa chọn |
| :---- | :---- |
| A | CK PHÚ |
| B | CK TRUNG |
| C | CK HKD MGEMS |
| D | CK HKD PT |
| E | CK BẢO YẾN |
| F | QUẸT THẺ |
| G | CK ĐST |

Thương hiệu: a. Pháp Tạng; b. MGEMS; c. MJADE. Giới tính: Nam/Nữ. Thanh toán: A. Tiền mặt; B. Chuyển khoản.

# **5 Module nhập đơn bán hàng**

Gõ start hoặc /start → nút Nhập mới → A. Đơn hàng / B. Chi tiêu. Chọn A để ghi đơn. Người dùng chọn bằng nút; nếu hỗ trợ nhập chữ A/B/C thì xử lý tương đương nút tại đúng bước hiện tại.

| Bước | Bot hỏi hoặc thực hiện |
| :---- | :---- |
| 1 | Chi nhánh A–C. Dùng chi nhánh đã chọn trong phiên; không hỏi trùng. |
| 2 | Tên tư vấn viên → Tên khách → SĐT khách → Giới tính Nam/Nữ. |
| 3 | Nguồn khách A–F. |
| 4 | Tên sản phẩm → Nhà phân phối a/b/c → Số lượng → Giá 1 đơn. |
| 5 | Thêm sản phẩm / Xong, lưu đơn. Thêm sản phẩm quay lại bước 4\. |
| 6 | Xong, lưu đơn kết thúc phần sản phẩm, chưa ghi đơn chính thức. Hỏi chiết khấu A–E. |
| 7 | Ghi chú cho đơn. Gõ dấu \- nếu không có. |
| 8 | Hình thức thanh toán: Tiền mặt / Chuyển khoản. |
| 9 | Tiền mặt: gắn quỹ chi nhánh. Chuyển khoản: hỏi tài khoản A–G. |
| 10 | Nếu tài khoản F: hỏi ngày khách quẹt, mặc định hôm nay; trạng thái Chờ tiền về. |
| 11 | Lưu toàn bộ đơn thành công → gửi tóm tắt và nút Start. |

## **Quy tắc nhập liệu**

Số lượng là số dương; đơn giá là số không âm. Mặc định dùng VND nguyên đồng; không nhận chữ như “150k”. Nếu sai, bot báo lỗi tại đúng bước và giữ dữ liệu đã nhập. SĐT lưu dạng văn bản, giữ số 0 đầu; không tự suy đoán hoặc thay đổi số khách.

Không áp đặt dấu gạch ngang trong tên sản phẩm. Chuẩn hóa khoảng trắng; lưu cả tên tư vấn viên nhập và định danh người thao tác. Không tự gộp người trùng tên. Quyền thao tác dựa trên Telegram ID, không dựa vào tên gõ.

## **Hủy và bắt đầu lại**

Gõ /huy tại bất kỳ bước nào để bỏ bản nháp; nhập /start để nhập lại từ đầu

## **Tóm tắt sau khi lưu**

Hiển thị mã đơn, ngày giờ, chi nhánh, tư vấn viên, khách, nguồn khách; các sản phẩm với thương hiệu, số lượng, đơn giá và thành tiền; tổng trước giảm, tỷ lệ/số tiền giảm, tổng sau giảm; thanh toán, tài khoản hoặc quỹ, ghi chú. Đơn thẻ hiển thị ngày quẹt và Chờ tiền về. Chỉ báo “Đã lưu đơn” sau khi ghi hoàn tất.

# **6 Module chi tiêu và quản lý giao dịch**

Từ Nhập mới chọn B. Chi tiêu. Dùng chi nhánh đã có trong phiên; không thêm câu hỏi chi nhánh khi chi tiền mặt.

| Bước | Nội dung |
| :---- | :---- |
| 1 | Người chi → Nội dung chi. |
| 2 | Số lượng → Giá tiền. |
| 3 | Hình thức thanh toán A. Tiền mặt / B. Chuyển khoản. |
| 4 | Tiền mặt: tự gắn quỹ chi nhánh. Chuyển khoản: hỏi Chi từ tài khoản nào, chọn A–G; F chưa sử dụng. |
| 5 | Ghi chú: nhập nội dung hoặc dấu \-. |
| 6 | Lưu → “Đã lưu đơn chi tiêu” → tóm tắt mã chi, chi nhánh, người chi, nội dung, số lượng, giá tiền, tổng chi, nguồn tiền, ghi chú → Start. |

Quy ước triển khai: Giá tiền là đơn giá; Tổng chi \= Số lượng × Giá tiền. Với một tổng hóa đơn, nhập số lượng 1\.

## **Quyền và thao tác quản lý**

| Vai trò | Quyền |
| :---- | :---- |
| Seller | Tạo thu/chi, bỏ nháp; không sửa/hủy giao dịch đã lưu, không cập nhật tiền thẻ về. |
| Quản lý | Tra cứu mã đơn/mã chi; sửa hoặc hủy có lý do; cập nhật tiền thẻ về; quản lý danh mục và số dư đầu kỳ. |

Giao diện quản lý tối thiểu: Tra cứu giao dịch, Sửa giao dịch, Hủy giao dịch và Tiền thẻ chờ về. Khi sửa, hiển thị trước/sau và yêu cầu xác nhận. Không xóa vật lý bản ghi. Mọi thay đổi lưu người thao tác, thời điểm, lý do và phiên bản.

Hủy đơn không đồng nghĩa khách đã nhận hoàn tiền. Với giao dịch đã có tiền thực nhận, quản lý phải xác định khoản điều chỉnh/hoàn tiền thực tế; hệ thống không tự giảm số dư chỉ vì đổi trạng thái đơn. Không cho sửa số tiền đơn đã đối soát thẻ mà bỏ qua kiểm tra chênh lệch thanh toán.

## **Giới hạn quyền xem**

Chỉ quản lý được quyền edit.

# **7 Tính tiền và theo dõi số dư**

## **Chiết khấu chung toàn đơn**

Thành tiền dòng \= Số lượng × Đơn giá. Giảm giá đơn \= làm tròn(Tổng trước giảm × tỷ lệ). Doanh thu đơn \= Tổng trước giảm − Giảm giá đơn. Tiền giảm của mỗi dòng phân bổ theo tỷ trọng thành tiền trước giảm; làm tròn đến đồng và điều chỉnh sai số ở dòng cuối. Tổng các dòng sau giảm phải khớp tổng đơn.

| Dòng hàng | Trước giảm | Giảm phân bổ | Sau giảm |
| :---- | :---- | :---- | :---- |
| Pháp Tạng | 1.000.000 | 100.000 | 900.000 |
| MGEMS | 2.000.000 | 200.000 | 1.800.000 |
| Tổng đơn giảm 10% | 3.000.000 | 300.000 | 2.700.000 |

## **Thu tiền mặt và chuyển khoản**

Do chưa triển khai đặt cọc, khi lưu đơn tiền mặt/chuyển khoản coi như đã nhận đủ số tiền sau giảm. Người nhập chỉ chọn chuyển khoản sau khi xác nhận tiền đã vào. Một đơn ghi một phương thức ở phiên bản đầu; chưa hỗ trợ thanh toán kết hợp.

## **Quẹt thẻ và tiền về**

Khi seller chọn F, lưu ngày quẹt và số tiền sau giảm; ghi nhận doanh thu theo ngày bán, tạo khoản chờ tiền về, chưa tăng số dư ngân hàng. Quản lý chọn mã giao dịch rồi nhập ngày tiền về, tài khoản nhận thực tế, số tiền thực về và phí thẻ nếu có.

Quy ước phiên bản đầu: một giao dịch thẻ tất toán một lần. Số thực về \+ phí phải bằng số quẹt; nếu không khớp thì giữ chờ đối soát, không tự xóa chênh lệch. Ngày tiền về không trước ngày quẹt. Tài khoản nhận phải là tài khoản thực, không được chọn F.

Ví dụ quẹt 1.000.000, phí 20.000, thực về 980.000: doanh thu vẫn 1.000.000; ngân hàng tăng 980.000; phí được báo cáo riêng 20.000. Không trừ phí thêm lần nữa khỏi số dư. Cập nhật tiền về không tạo đơn hoặc doanh thu mới.

## **Quỹ và chuyển tiền nội bộ**

Số dư cuối kỳ \= Số dư đầu kỳ \+ tiền thực vào − tiền thực ra. Mỗi chi nhánh có quỹ tiền mặt riêng; ngân hàng theo từng tài khoản thực trong danh mục. Số dư đầu kỳ phải có ngày hiệu lực để tránh cộng giao dịch trước thời điểm khởi tạo.

Bổ sung tối thiểu thao tác quản lý chuyển tiền nội bộ: ngày, quỹ/tài khoản nguồn, quỹ/tài khoản đích, số tiền, ghi chú. Ghi giảm nguồn và tăng đích cùng mã chuyển, không tính doanh thu hoặc chi phí. Đây là yêu cầu hỗ trợ số dư, không thêm vào luồng nhập đơn của seller.

Hoàn tiền/đổi trả chưa có quy trình tự động. Ghi chú không tự thay đổi số dư; nếu phát sinh tiền thực ra, quản lý ghi điều chỉnh có liên kết mã đơn và phân loại riêng, tránh tính thành chi phí vận hành hoặc hoàn tiền hai lần.

# **8 Cấu trúc dữ liệu Google Sheets**

Đề xuất các bảng dưới đây để coder triển khai. Có thể đổi tên kỹ thuật nhưng phải giữ quan hệ và nguồn dữ liệu duy nhất. Không lấy các sheet Chi tiết cũ làm nguồn cộng doanh thu.

| Bảng và mức dữ liệu | Trường bắt buộc chính |
| :---- | :---- |
| Don\_HangMột dòng mỗi đơn | order\_id, ngày bán, created\_at, created\_by, branch\_id, tên tư vấn viên, tên khách, phone dạng text, giới tính, source\_id, tổng trước giảm, discount\_rate, discount\_amount, net\_revenue, ghi chú, status, version. |
| Chi\_Tiet\_DonMột dòng mỗi sản phẩm | line\_id, order\_id, số thứ tự, tên sản phẩm, brand\_id, quantity, unit\_price, gross\_amount, allocated\_discount, net\_amount. |
| Thanh\_ToanMột dòng mỗi thanh toán | payment\_id, order\_id, method, account\_id/cash\_fund\_id, số tiền khách trả, ngày nhận hoặc ngày quẹt, ngày tiền về, tài khoản thực nhận, số thực về, phí, status, người cập nhật. |
| Data\_ChiMột dòng mỗi khoản chi | expense\_id, branch\_id, ngày thanh toán, người chi, nội dung, quantity, unit\_price, amount, method, account\_id/cash\_fund\_id, ghi chú, status, created\_by, version. |
| Chuyen\_Tien và Dieu\_Chinh | Mã, ngày, nguồn/đích, số tiền, loại nghiệp vụ, mã đơn liên quan nếu có, lý do, người tạo. Phân biệt chuyển nội bộ, hoàn tiền và điều chỉnh. |
| Danh\_Muc và So\_Du\_Dau\_Ky | Mã ổn định, nhãn, trạng thái sử dụng; Telegram ID và vai trò; chi nhánh/quỹ/thương hiệu/nguồn/tài khoản; số dư và thời điểm hiệu lực. |
| Nhat\_Ky và Xu\_Ly\_Su\_Kien | Lịch sử thay đổi trước/sau; mã sự kiện Telegram, trạng thái xử lý, transaction\_id, lỗi và lần thử; không ghi token. |
| Dashboard và bảng tổng hợp | Chỉ đọc từ giao dịch hoàn tất, hợp lệ; không nhập lại số liệu. Có thể tạo Data Thu dạng phẳng để xem theo bố cục cũ. |

Khóa liên kết: order\_id nối Don\_Hang với Chi\_Tiet\_Don và Thanh\_Toan. Một đơn nhiều dòng hàng nhưng tiền thanh toán không lặp trên từng dòng để cộng tổng. Nhãn danh mục có thể đổi; mã định danh giữ ổn định.

## **Báo cáo bắt buộc**

Bộ lọc ngày bắt đầu/kết thúc, chi nhánh và thương hiệu; xem ngày/tháng/quý. Doanh thu dùng ngày bán và giá trị sau giảm. Tiền thực thu/chi dùng ngày thực nhận/thanh toán; số dư theo quỹ/tài khoản, không ép phân bổ theo thương hiệu.

Chỉ tiêu: tổng trước giảm, tổng giảm, doanh thu sau giảm, số đơn duy nhất; doanh thu và tỷ trọng theo chi nhánh/thương hiệu; doanh thu và số đơn theo nguồn khách; tiền vào/ra và số dư; giao dịch thẻ chờ về/đã về/phí. Số đơn theo thương hiệu có thể trùng giữa nhóm, không cộng để ra tổng hệ thống. Không gọi thu trừ chi là lợi nhuận.

# **9 Yêu cầu triển khai và nghiệm thu**

## **Yêu cầu kỹ thuật**

Telegram → backend Apps Script → kiểm tra và tính tiền → Google Sheets → tóm tắt Telegram. Coder kiểm tra tài liệu chính thức và giới hạn nền tảng tại thời điểm triển khai; không phụ thuộc vào công thức xuất Excel để chạy nghiệp vụ.

Lưu trạng thái hội thoại theo người dùng và cuộc trò chuyện; phân biệt nháp với dữ liệu đã ghi. Có mã sự kiện và mã giao dịch để chống ghi trùng, khóa khi ghi đồng thời, trạng thái hoàn tất để báo cáo không đọc đơn ghi dở. Nếu gửi tóm tắt lỗi sau khi đã lưu, thử gửi lại thay vì tạo lại đơn.

Token và cấu hình bí mật không đặt trong sheet cho seller xem. Chỉ Telegram ID được cấp quyền mới dùng bot; kiểm tra quyền trên mọi thao tác quản lý. Chuỗi do người dùng nhập phải lưu như văn bản, không thực thi thành công thức Sheets. Dữ liệu mới tự vào báo cáo, không giới hạn phạm vi cố định.

## **Kịch bản nghiệm thu**

| Mã | Tình huống và kết quả mong đợi |
| :---- | :---- |
| T01 | Start → Nhập mới → đúng hai lựa chọn; chi nhánh trong phiên được gắn vào cả thu/chi, không hỏi lại khi chọn tiền mặt. |
| T02 | Một đơn 3 sản phẩm thuộc 3 thương hiệu: một mã đơn, 3 dòng hàng, một thanh toán. |
| T03 | Thử đủ mức giảm 0/3/5/10/15%; số lẻ làm tròn; tổng giảm và doanh thu dòng khớp tổng đơn. |
| T04 | Nhập sai số lượng/giá/SĐT: báo lỗi, giữ phiên. SĐT bắt đầu 0 không mất số. /huy không tạo giao dịch. |
| T05 | Tiền mặt tăng/giảm đúng chi nhánh; chuyển khoản đúng tài khoản. Chi số lượng 2 × 100.000 cho tổng 200.000. |
| T06 | Thẻ 1.000.000 chờ về không tăng ngân hàng; nhận 980.000 và phí 20.000 thì tăng 980.000, không tăng doanh thu lần hai. |
| T07 | F trong chi tiêu không ghi được giao dịch; yêu cầu chọn tài khoản đang sử dụng. |
| T08 | Bấm/gửi lại xác nhận; hai seller nhập đồng thời; lỗi ghi giữa chừng: không trùng, không mất hoặc lẫn đơn. |
| T09 | Seller không sửa được đơn đã lưu; quản lý sửa/hủy có lý do và nhật ký; không tự hoàn tiền khi hủy đơn. |
| T10 | Chuyển quỹ sang ngân hàng: giảm nguồn tăng đích, tổng tiền không đổi; không phát sinh doanh thu/chi phí. |
| T11 | Thêm dữ liệu vượt dòng 271/80 vẫn vào dashboard; tổng thương hiệu bằng doanh thu hệ thống trong cùng bộ lọc. |

## **Bàn giao và cấu hình trước khi chạy**

Bàn giao mã Apps Script, quyền sở hữu bot và Sheets cho chủ hệ thống, hướng dẫn triển khai/cấu hình, danh mục, thao tác seller/quản lý, sao lưu và khôi phục, biên bản kiểm thử. Chuẩn bị danh sách Telegram ID và vai trò, số dư đầu kỳ từng quỹ/tài khoản, ngày bắt đầu chạy và quyền xem Sheets.

Mặc định triển khai dữ liệu mới. Nếu cần chuyển dữ liệu cũ, báo giá/phạm vi riêng: giữ bản gốc, chuẩn hóa có đối chiếu; không tự gộp đơn chỉ từ thời gian/tên khách vì file cũ thiếu mã đơn. Không đưa sheet Chi tiết vào nhập trùng.