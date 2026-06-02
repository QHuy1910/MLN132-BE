# Tổng hợp chức năng Backend

Tài liệu này tổng hợp các chức năng backend hiện có trong project `monopoly-game`, dựa trên các file route, controller, service, socket và model.

## 1. Tổng quan kiến trúc BE

Backend được xây theo mô hình:

- `Express` làm HTTP server.
- `MongoDB + Mongoose` để lưu dữ liệu phòng chơi, người chơi và khán giả.
- `Socket.IO` để đồng bộ realtime trạng thái phòng và trạng thái game.
- `Swagger` để mô tả và test API.

Luồng tổng quát:

1. Client gọi REST API để tạo, tham gia, rời, bắt đầu hoặc kết thúc phòng.
2. Client dùng Socket.IO để join room realtime và nhận cập nhật trạng thái.
3. `roomService` xử lý logic nghiệp vụ chính.
4. `Room` model lưu toàn bộ trạng thái game trong MongoDB.

## 2. Chức năng khởi động và cấu hình server

### `src/server.js`

- Kết nối MongoDB khi server khởi động.
- Tạo HTTP server từ Express app.
- Gắn Socket.IO vào cùng server.
- Tự động thử port tiếp theo nếu port mặc định đang bị chiếm.
- Lắng nghe biến môi trường `PORT`, mặc định là `3000`.

### `src/app.js`

- Bật CORS.
- Parse JSON request body.
- Log request để debug.
- Serve Swagger UI tại `/api-docs`.
- Expose Swagger JSON tại `/api-docs.json`.
- Serve static file trong `src/public`.
- Cung cấp endpoint `/server-config` để client lấy URL server thực tế.

### `src/config/db.js`

- Kết nối MongoDB qua `MONGO_URI`.
- Dừng ứng dụng nếu không kết nối được database.

## 3. REST API quản lý phòng chơi

Base path: `/api/rooms`

### Danh sách API

- `GET /api/rooms`
  - Lấy danh sách tất cả phòng.
  - Sắp xếp theo thời gian tạo mới nhất.

- `POST /api/rooms`
  - Tạo phòng mới.
  - Nhận các field chính: `name`, `host`, `maxPlayers`.
  - Trạng thái mặc định: `waiting`.

- `GET /api/rooms/:id`
  - Lấy chi tiết một phòng theo ID.

- `PUT /api/rooms/:id`
  - Cập nhật thông tin phòng.
  - Có thể cập nhật `name`, `status`, `maxPlayers` và các field khác tùy payload.

- `DELETE /api/rooms/:id`
  - Xóa phòng.

- `POST /api/rooms/:id/join`
  - Người chơi tham gia phòng.
  - Kiểm tra số lượng tối đa trước khi thêm.
  - Người chơi được khởi tạo với `position`, `money`, `isConnected`, `isReady`, `role`.

- `POST /api/rooms/:id/start`
  - Bắt đầu game.
  - Chỉ cho phép khi phòng đang ở trạng thái `waiting`.
  - Yêu cầu tối thiểu 2 người chơi.

- `POST /api/rooms/:id/end`
  - Kết thúc game.
  - Chỉ cho phép khi phòng đang ở trạng thái `playing`.

- `POST /api/rooms/:id/leave`
  - Người chơi rời phòng.
  - Có hỗ trợ tìm theo `name` hoặc `playerId`.

- `POST /api/rooms/:id/ready`
  - Cập nhật trạng thái sẵn sàng của người chơi.
  - Nhận `name` và `isReady`.

- `POST /api/rooms/:id/spectators`
  - Thêm khán giả vào phòng.

- `POST /api/rooms/:id/spectate`
  - Alias của endpoint thêm khán giả, dùng để tương thích client test.

- `POST /api/rooms/:id/spectators/leave`
  - Xóa khán giả khỏi phòng.

## 4. Logic nghiệp vụ trong service

### `src/services/roomService.js`

Đây là nơi xử lý business logic chính của backend.

#### Quản lý phòng

- `createRoom(data)`
  - Tạo và lưu phòng mới.

- `getRooms()`
  - Lấy toàn bộ phòng.

- `getRoomById(id)`
  - Lấy phòng theo ID.

- `updateRoom(id, update)`
  - Cập nhật phòng theo ID.

- `deleteRoom(id)`
  - Xóa phòng theo ID.

#### Quản lý người chơi

- `joinRoom(id, playerData)`
  - Thêm người chơi vào room.
  - Tự sinh `playerId` nếu client không truyền.
  - Mặc định `money = 1500`, `position = 0`, `isReady = false`.
  - Kiểm tra phòng tồn tại và không vượt quá `maxPlayers`.

- `leaveRoom(id, playerName)`
  - Xóa người chơi theo `name` hoặc `playerId`.
  - Nếu không còn ai thì đưa phòng về `waiting`.
  - Nếu đang chơi mà số người còn lại < 2 thì kết thúc game.

- `setPlayerReady(id, playerName, isReady)`
  - Đặt trạng thái ready cho người chơi.

- `setPlayerConnected(id, playerId, isConnected, socketId?)`
  - Cập nhật trạng thái kết nối của người chơi.
  - Có thể cập nhật luôn `socketId` nếu được truyền thêm.

#### Điều khiển ván chơi

- `startRoom(id)`
  - Chuyển phòng sang `playing`.
  - Set `currentTurnIndex = 0`.
  - Reset `hasRolledThisTurn = false`.

- `endRoom(id)`
  - Chuyển phòng sang `finished`.

- `getCurrentPlayer(id)`
  - Lấy người chơi đang tới lượt.

- `rollDice(id)`
  - Sinh ngẫu nhiên giá trị xúc xắc từ 1 đến 6.
  - Chỉ cho phép khi game đang `playing`.
  - Không cho roll lại trong cùng một lượt.

- `movePlayer(id, playerIndex, steps)`
  - Di chuyển người chơi theo số bước.
  - Vị trí mới được tính theo vòng tròn dựa trên `boardSize`.

- `nextTurn(id)`
  - Chuyển sang lượt tiếp theo.
  - Reset `hasRolledThisTurn`.

#### Quản lý khán giả

- `addSpectator(id, spectatorData)`
  - Thêm khán giả vào phòng.
  - Tự sinh `spectatorId` nếu cần.

- `removeSpectator(id, spectatorName)`
  - Xóa khán giả theo `name` hoặc `spectatorId`.

- `setSpectatorConnected(id, spectatorId, isConnected)`
  - Cập nhật trạng thái kết nối của khán giả.

## 5. Realtime socket events

### `src/sockets/gameSocket.js`

Socket.IO được dùng để đồng bộ state giữa các client trong cùng phòng.

#### Event từ client lên server

- `joinRoom`
  - Người chơi tham gia phòng realtime.
  - Server cập nhật `socketId`, `isConnected` và phát broadcast `playerJoined`.

- `joinAsSpectator`
  - Khán giả tham gia phòng realtime.
  - Server phát broadcast `spectatorJoined`.

- `leaveRoom`
  - Người chơi rời phòng realtime.
  - Server phát broadcast `playerLeft`.

- `leaveAsSpectator`
  - Khán giả rời phòng realtime.
  - Server phát broadcast `spectatorLeft`.

- `setReady`
  - Đặt trạng thái ready của người chơi.
  - Khán giả không được phép dùng event này.

- `startGame`
  - Host khởi động game realtime.
  - Nếu phòng còn `waiting`, server chuyển sang `playing` rồi broadcast `gameStarted`.

- `rollDice`
  - Người chơi đang tới lượt roll xúc xắc.
  - Server phát broadcast `diceRolled`.

- `movePlayer`
  - Di chuyển người chơi sau khi roll.
  - Server phát broadcast `playerMoved` rồi tự động kết thúc lượt bằng `turnEnded`.

- `endTurn`
  - Kết thúc lượt hiện tại thủ công.
  - Server phát broadcast `turnEnded`.

- `getGameState`
  - Client xin toàn bộ state hiện tại của room.
  - Server trả về event `gameState`.

#### Event server broadcast tới client

- `playerJoined`
- `spectatorJoined`
- `playerLeft`
- `spectatorLeft`
- `playerReadyChanged`
- `gameStarted`
- `diceRolled`
- `playerMoved`
- `turnEnded`
- `gameState`
- `error`

#### Xử lý khi disconnect

- Nếu socket ngắt kết nối mà còn thông tin room và user:
  - Với spectator: tự xóa khỏi room và phát `spectatorLeft`.
  - Với player: tự xóa khỏi room và phát `playerLeft`.
- Mục tiêu là tránh trạng thái treo khi người dùng tắt tab hoặc mất mạng.

## 6. Dữ liệu và schema

### `src/models/Room.js`

#### Player schema

- `playerId`: mã định danh người chơi.
- `name`: tên người chơi, bắt buộc.
- `socketId`: socket hiện tại.
- `position`: vị trí trên bàn cờ.
- `money`: tiền mặc định là `1500`.
- `isConnected`: trạng thái kết nối.
- `isReady`: trạng thái sẵn sàng.
- `role`: `player` hoặc `spectator`.

#### Spectator schema

- `spectatorId`: mã định danh khán giả.
- `name`: tên khán giả, bắt buộc.
- `socketId`: socket hiện tại.
- `isConnected`: trạng thái kết nối.

#### Room schema

- `name`: tên phòng.
- `host`: chủ phòng.
- `players`: danh sách người chơi.
- `spectators`: danh sách khán giả.
- `maxPlayers`: số người chơi tối đa, mặc định `4`.
- `status`: `waiting`, `playing`, hoặc `finished`.
- `boardState`: trạng thái bàn cờ dạng dữ liệu linh hoạt.
- `boardSize`: số ô trên bàn cờ, mặc định `20`.
- `currentTurnIndex`: index người đang tới lượt.
- `hasRolledThisTurn`: đã roll trong lượt này hay chưa.
- `gameHistory`: lịch sử game.
- `createdAt`: thời điểm tạo phòng.

## 7. Swagger và tài liệu API

Project đã có sẵn Swagger để mô tả API:

- UI: `/api-docs`
- JSON: `/api-docs.json`

Các route trong `roomRoutes.js` đều có annotation OpenAPI, nên có thể dùng trực tiếp để test hoặc sinh tài liệu API.

## 8. Tóm tắt chức năng chính của BE

- Tạo, xem, sửa, xóa phòng.
- Cho người chơi vào / ra phòng.
- Cho khán giả vào / ra phòng.
- Đặt trạng thái ready cho người chơi.
- Bắt đầu và kết thúc game.
- Roll xúc xắc, di chuyển người chơi, kết thúc lượt.
- Đồng bộ realtime trạng thái phòng bằng Socket.IO.
- Tự xử lý khi disconnect để tránh dữ liệu bị treo.
- Lưu toàn bộ trạng thái game vào MongoDB.

## 9. Ghi chú nhanh

- Backend hiện tập trung nhiều vào quản lý phòng và luồng chơi cơ bản.
- Logic nghiệp vụ game chi tiết hơn vẫn còn có thể mở rộng thêm sau này.
- Một số endpoint socket và REST đang cùng phục vụ cùng một nghiệp vụ, giúp frontend có thể dùng theo cả 2 kiểu giao tiếp.
