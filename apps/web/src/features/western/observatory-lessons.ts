export type ObservatoryDiscipline = 'astrology' | 'tarot' | 'numerology';
type Lesson = {label:string; glyph:string; read:string; check:string; pitfall:string; practice:string};
type Course = {title:string; scope:string; steps:readonly Lesson[]};

/** Original editorial exercises; no predictions or additional calculation method. */
export const observatoryLessons: Record<ObservatoryDiscipline, Course> = {
  astrology: {
    title: 'Bốn lớp để đọc một bản đồ sao',
    scope: 'Khung Tropical / Whole Sign của công cụ hiện có. Xem số liệu và nguồn trong kết quả Natal; mô hình này không thể hiện kinh độ hay quỹ đạo thật.',
    steps: [
      {label:'Thiên thể', glyph:'☉', read:'Bắt đầu bằng chức năng được bộ đọc gán cho thiên thể. Ghi riêng vị trí quan sát được và câu diễn giải; một ký hiệu không đủ để mô tả một con người.', check:'Chọn thiên thể trên lá số đã tính, chép cung, nhà và trạng thái chuyển động trước khi đọc phần luận.', pitfall:'Lấy Mặt Trời làm đại diện cho toàn bộ lá số hoặc gán phẩm chất tốt/xấu cố định.', practice:'Chọn Mặt Trời và Mặt Trăng. Viết hai nhu cầu có thể khác nhau, rồi ghi một trải nghiệm thực tế không phù hợp với cách đọc đó.'},
      {label:'Cung', glyph:'♈', read:'Cung là lớp mô tả cách biểu đạt trong hệ biểu tượng đang dùng. Đọc cùng chức năng thiên thể, không tách thành danh sách tính cách chung.', check:'Đối chiếu tên cung với kinh độ trong bảng. Không đổi sang Sidereal chỉ bằng cách thay nhãn cung.', pitfall:'Đồng nhất cung với nhà, hoặc trộn chủ tinh hiện đại và truyền thống mà không ghi phương pháp.', practice:'Viết một câu “chức năng — cách biểu đạt”, bỏ những từ tuyệt đối như luôn luôn hoặc chắc chắn.'},
      {label:'Nhà', glyph:'⌂', read:'Nhà đưa câu đọc về một lĩnh vực đời sống. Giữ nguyên Ascendant và phương pháp nhà khi đối chiếu.', check:'Kiểm tra giờ sinh, múi giờ đã xác nhận và tọa độ đầu vào. Đọc chủ tinh nhà cùng các thiên thể hiện diện.', pitfall:'Nhà trống không có nghĩa lĩnh vực đó vắng mặt. Không tự đồng nhất MC với đầu nhà 10.', practice:'Chọn một nhà trống, tìm chủ tinh trong bảng kết quả rồi ghi một câu hỏi thực tế về lĩnh vực đó.'},
      {label:'Góc hợp', glyph:'△', read:'Nối hai chức năng đã đọc bằng góc hợp có trong bảng. Xem orb và bộ lọc, không chỉ dựa vào màu hoặc đường nối.', check:'Đọc đúng hai thiên thể, góc mục tiêu và orb trong bảng. Giữ phạm vi các góc của bộ đọc hiện tại.', pitfall:'Góc vuông không chứng minh biến cố xấu; tam hợp không bảo đảm thành công. Không suy applying/separating từ đường nối.', practice:'Chọn một cặp có trong bảng, ghi cả cơ hội lẫn căng thẳng và một quan sát có thể bác bỏ cách hiểu ban đầu.'},
    ],
  },
  tarot: {
    title: 'Từ hình ảnh đến một câu hỏi có ích',
    scope: 'Khung tự suy ngẫm của Thiên Đồ. Dữ liệu rút bài, chiều lá và vị trí thuộc trải bài hiện có; mô hình không xào hoặc rút lại lá.',
    steps: [
      {label:'Quan sát lá', glyph:'✦', read:'Mô tả điều nhìn thấy trước khi mở lời nghĩa: nhân vật, hướng nhìn, vật thể và khoảng trống. Phân biệt hình ảnh với liên tưởng cá nhân.', check:'Đối chiếu đúng tên, bộ bài và ảnh đang dùng. Cùng tên lá có thể được thể hiện khác giữa các bộ.', pitfall:'Gán chi tiết của một bộ sang mọi bộ khác hoặc xem biểu tượng như bằng chứng về người thật.', practice:'Viết ba chi tiết nhìn thấy và một liên tưởng. Đánh dấu rõ quan sát và suy diễn.'},
      {label:'Vị trí trải', glyph:'◇', read:'Vị trí tạo vai trò cho lá. Cùng một lá ở hiện trạng, trở ngại và hướng thử nghiệm cần câu hỏi khác nhau.', check:'Đọc tên vị trí và câu hỏi của trải trước lời nghĩa. Giữ chiều xuôi/ngược theo dữ liệu đã rút.', pitfall:'Đọc mỗi lá như kết luận độc lập, bỏ qua vị trí hoặc tự đảo lá để hợp câu chuyện.', practice:'Giữ nguyên một lá, thử viết hai câu hỏi cho hai vị trí khác nhau mà không thay kết quả rút.'},
      {label:'Nối các lá', glyph:'☽', read:'So sánh hai vị trí: điều lặp lại, điểm khác nhau và nhịp chuyển của câu chuyện. Có thể có nhiều cách nối hợp lý.', check:'Giải thích lý do nối bằng vai trò hai vị trí. Kiểm tra toàn bộ trải thay vì chỉ những lá gây ấn tượng.', pitfall:'Coi cặp gợi ý là định luật hoặc bỏ qua lá không khớp với diễn giải ban đầu.', practice:'Chọn một cặp trong bảng kết hợp, viết cách đọc khác và nêu vị trí giúp phân biệt hai cách.'},
      {label:'Hành động nhỏ', glyph:'☼', read:'Chuyển suy ngẫm thành hành động có thể kiểm tra và điều chỉnh. Giữ quyền lựa chọn ở người hỏi.', check:'Hành động nằm trong khả năng kiểm soát của bạn và có thời điểm xem lại cụ thể không?', pitfall:'Dùng Tarot để chẩn đoán, chắc chắn hóa tương lai hoặc thay lời khuyên chuyên môn về sức khỏe, tiền bạc và pháp lý.', practice:'Viết một việc nhỏ trong tuần, tiêu chí quan sát và điều kiện để dừng hoặc đổi hướng nếu không hữu ích.'},
    ],
  },
  numerology: {
    title: 'Đọc con số cùng dấu vết tính',
    scope: 'Khung Pythagoras hiện có; số chủ và cách xử lý Y giữ theo lựa chọn trong công cụ. Nội dung là tự suy ngẫm, không xác nhận khoa học về tính cách hay tương lai.',
    steps: [
      {label:'Đầu vào', glyph:'A', read:'Ngày sinh và tên là hai nhóm dữ liệu khác nhau. Chọn rõ tên nghiên cứu và cách chuẩn hóa trước khi so kết quả.', check:'Đối chiếu tên đã chuẩn hóa, ngày hợp lệ và lựa chọn Y. Không sửa tên chỉ để tạo con số mong muốn.', pitfall:'So hai lần tính có tên hoặc quy tắc Y khác nhau rồi kết luận thuật toán mâu thuẫn.', practice:'Ghi đầu vào và phương pháp. Nếu thử tên khác, giữ thành một lần đối chiếu riêng.'},
      {label:'Phép rút gọn', glyph:'Σ', read:'Theo dõi tổng và từng bước rút gọn, giữ quy tắc số chủ đã chọn. Không thay cách nhóm chỉ vì tổng cuối giống nhau.', check:'Dùng dấu vết từng chỉ số: đường đời, biểu đạt và linh hồn không lấy cùng một tập dữ liệu.', pitfall:'Gán số 0 khi không có nguyên âm hợp lệ hoặc trộn quy tắc số chủ giữa các chỉ số.', practice:'Chọn một chỉ số, ghi nguồn dữ liệu và cộng lại bằng tay để đối chiếu, không tự thay thuật toán.'},
      {label:'Chu kỳ', glyph:'◷', read:'Năm, tháng và ngày cá nhân là các lớp thời gian của phương pháp. Ngày nghiên cứu cần nằm trong năm đang đối chiếu.', check:'Kiểm tra năm và ngày đã chọn trước dấu vết. Phân biệt ngày chọn với ngày hiện tại của thiết bị.', pitfall:'Xem chu kỳ như dự báo sự kiện chắc chắn hoặc so hai năm mà quên đổi ngày.', practice:'So hai ngày hợp lệ cùng năm; chép kết quả công cụ và chỉ ra phần đầu vào đã đổi.'},
      {label:'Đối chiếu đời sống', glyph:'∞', read:'Đọc mô tả như giả thuyết để suy ngẫm. Tìm điểm phù hợp và không phù hợp rồi quyết định nó có ích không.', check:'Tách kết quả số học tính lại được khỏi ý nghĩa biểu tượng. Tổng đúng không chứng minh lời luận đúng.', pitfall:'Chỉ ghi ví dụ phù hợp, gán nhãn bản thân hoặc đánh giá người khác bằng một con số.', practice:'Viết một ví dụ, một phản ví dụ và hành động nhỏ không phụ thuộc vào việc lời luận đúng hay không.'},
    ],
  },
};
