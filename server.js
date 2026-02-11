
// server.js
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = process.env.PORT || 3000;

// Хранилище для комнат и сообщений (имитация базы данных)
// В реальном приложении использовалась бы настоящая база данных (MongoDB, PostgreSQL и т.д.)
const roomsData = {}; // { roomCode: { name: "Комната X", messages: [], users: [] } }

// Подавать статические файлы (index.html, CSS, JS) из текущей директории
app.use(express.static(__dirname));

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

io.on('connection', (socket) => {
    console.log('Пользователь подключился:', socket.id);

    // Обработчик для создания комнаты
    socket.on('createRoom', ({ roomCode, roomName, userName }) => {
        if (!roomsData[roomCode]) {
            roomsData[roomCode] = {
                name: roomName,
                messages: [],
                users: [], // Список пользователей в комнате
                creatorId: socket.id // Можно сохранить, кто создал
            };
            console.log(`Комната создана: ${roomCode} (${roomName})`);
        }
        // Пользователь автоматически присоединяется к созданной комнате
        socket.join(roomCode);
        socket.roomCode = roomCode; // Сохраняем код комнаты для сокета
        if (!roomsData[roomCode].users.includes(userName)) {
            roomsData[roomCode].users.push(userName);
        }
        
        // Отправляем информацию о комнате создателю
        socket.emit('roomCreated', roomsData[roomCode]);
        // Обновляем списки комнат у всех пользователей
        io.emit('updateRoomList', Object.values(roomsData).map(room => ({ code: room.code, name: room.name })));
        
        // Отправляем текущие сообщения комнаты создателю
        socket.emit('loadMessages', roomsData[roomCode].messages);
        
        console.log(`Пользователь ${userName} присоединился к комнате ${roomCode}`);
        io.to(roomCode).emit('userJoined', `${userName} присоединился к комнате.`);
    });

    // Обработчик для присоединения к комнате
    socket.on('joinRoom', ({ roomCode, userName }) => {
        if (roomsData[roomCode]) {
            socket.join(roomCode);
            socket.roomCode = roomCode; // Сохраняем код комнаты для сокета

            if (!roomsData[roomCode].users.includes(userName)) {
                roomsData[roomCode].users.push(userName);
            }
            
            // Отправляем информацию о комнате присоединившемуся
            socket.emit('roomJoined', roomsData[roomCode]);
            // Отправляем текущие сообщения комнаты
            socket.emit('loadMessages', roomsData[roomCode].messages);
            
            console.log(`Пользователь ${userName} присоединился к комнате ${roomCode}`);
            io.to(roomCode).emit('userJoined', `${userName} присоединился к комнате.`);
        } else {
            socket.emit('roomNotFound', `Комната с кодом ${roomCode} не найдена.`);
        }
    });

    // Обработчик для получения списка комнат (для боковой панели)
    socket.on('getRoomList', () => {
        socket.emit('updateRoomList', Object.values(roomsData).map(room => ({ code: room.code, name: room.name })));
    });

    // Обработчик для сообщений
    socket.on('sendMessage', ({ roomCode, sender, text, timestamp }) => {
        if (roomsData[roomCode]) {
            const message = { sender, text, timestamp };
            roomsData[roomCode].messages.push(message);
            // Отправляем сообщение всем в этой комнате
            io.to(roomCode).emit('receiveMessage', message);
            console.log(`Сообщение в комнате ${roomCode} от ${sender}: ${text}`);
        }
    });
    
    // Обработчик отключения пользователя
    socket.on('disconnect', () => {
        console.log('Пользователь отключился:', socket.id);
        if (socket.roomCode) {
            const roomCode = socket.roomCode;
            const room = roomsData[roomCode];
            if (room) {
                // В реальном приложении нужно отслеживать userName для каждого сокета,
                // сейчас это просто имитация
                // io.to(roomCode).emit('userLeft', 'Пользователь покинул комнату.');
            }
        }
    });
});

server.listen(PORT, () => {
    console.log(`Сервер запущен на http://localhost:${PORT}`);
});

