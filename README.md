# MindBot Backend Developer Test

## Context
คุณได้รับมอบหมายให้พัฒนาส่วนหนึ่งของ **Hotel Booking System**  
ระบบนี้ต้องรองรับลูกค้าที่จองห้องแบบ real-time โดยไม่ให้เกิด **double booking**  

---

## Deploy project
```bash
$docker compose up --build
```

## Run Test
```bash
$docker exec -it mindbot-backend-test_api_1 sh

$npm run test
```

## สิ่งที่ทำ

### 1. Database Schema
- room_status
  +--------+-----------------------------------+
  | status | description                       |
  +--------+-----------------------------------+
  |   0    | Available                         |
  |   1    | Reserved but waiting for payment  |
  |   2    | Reserved                          |
  |   3    | Unavailable                       |
  +--------+-----------------------------------+
- rooms (example)
  +-----+--------------+--------+
  | id  | name         | status |
  +-----+--------------+--------+
  | ..  | ....         |   0    |
  +-----+--------------+--------+
  | ..  | ....         |   2    |
  +-----+--------------+--------+

- reservations (example)
```
  +----+---------+------------+------------+---------------------+---------------------+------------------------+
  | id | room_id | check_in   | check_out  | created_at          | paid_at             | noted                  |
  +----+---------+------------+------------+---------------------+---------------------+------------------------+
  | 1  | 101     | 2025-10-05 | 2025-10-08 | 2025-10-01 09:15:30 | 2025-10-01 09:20:45 | NULL                   |
  | 2  | 102     | 2025-10-10 | 2025-10-15 | 2025-10-01 10:30:12 | NULL                | Early check-in needed  |
  | 3  | 103     | 2025-10-01 | 2025-10-03 | 2025-09-28 14:22:08 | 2025-09-28 14:25:33 | Honeymoon package      |
  | 4  | 101     | 2025-10-20 | 2025-10-25 | 2025-10-01 11:45:19 | 2025-10-01 11:50:02 | Business trip          |
  | 5  | 105     | 2025-10-12 | 2025-10-14 | 2025-10-01 13:10:44 | NULL                | NULL                   |
  | 6  | 103     | 2025-10-08 | 2025-10-10 | 2025-10-01 15:33:21 | 2025-10-01 15:35:08 | Anniversary couple     |
  | 7  | 102     | 2025-09-25 | 2025-09-28 | 2025-09-20 08:12:45 | 2025-09-20 08:15:10 | NULL                   |
  +----+---------+------------+------------+---------------------+---------------------+------------------------+
  ```


- ป้องกันการจองซ้ำซ้อนโดยใช้ "rooms.status" ที่ reference ไปยัง table room_status เป็นตัวบอกสถานะห้องแบบ Real-time
```
  [0] Available                          -> พร้อมให้จองได้ทันที
  [1] Reserved but waiting for payment   -> มีคนจองแต่ยังไม่จ่ายเงิน
  [2] Reserved                           -> จองและชำระเงินเรียบร้อย
  [3] Unavailable                        -> มีผู้เข้าพักในขณะนั้น/ปิดปรับปรุง/ซ่อมแซม
```

- หลักการสำคัญ: 1 ห้อง = 1 สถานะเท่านั้น นอกจากนี้ยังมีการตรวจสอบข้อมูลใน room_status ด้วยคำสั่ง CHECK (status BETWEEN 0 AND 3)

### 2. API
- ใช้ Transaction ในการทำงานของ request ที่เข้ามาใน endpoint เพื่อรองรับคำสั่งที่ต้องทำงานหลายขั้นตอน นอกจากนี้ยังสามารถทำการล็อคข้อมูลที่ระบบยังทำไม่สำเร็จเพื่อป้องกันไม่ให้มีคำขออื่นมาเปลี่ยนข้อมูลใน db ที่กำลังใช้งานอยู่ ป้องกันปัญหาเกี่ยวกับ Data Integrity และป้องกันการเกิด double booking
- นอกจากนี้ยังมีการทำ Error Handling เพื่อป้องกันปัญหาต่างๆที่อาจทำให้ระบบ API เกิดปัญหา ช่วยให้ระบบมีความเสถียรมากยิ่งขึ้น

### 3. Testing
- เขียน integration tests ใน tests/ เพื่อทดสอบการทำงานของ API โดยมีการทดสอบดังนี้
```
✔ healthcheck works
✔ (Should Success) create reservation
✔ (Should Error) empty input
✔ (Should Error) create reservation with invalid dates
✔ (Should Error) reserve room which not available
✔ (Should Success) confirm reservation payment
✔ (Should Error) Input Empty
✔ (Should Error) confirm non-existent reservation
✔ (Should Error) confirm reservation with wrong status
✔ (Should Success) cancel reservation
✔ (Should Error) Input Empty
✔ (Should Error)cancel non-existent reservation
```

### 4. Dockerize
- สร้าง docker-compose.yml เพื่อรัน API และ PostgreSQL ดังนี้

```
version: '3.9'
services:
  db:
    image: postgres:15
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: booking
    ports:
      - "5432:5432"
    volumes:
      - ./migrations:/docker-entrypoint-initdb.d

  api:
    image: node:22
    ports:
      - '3000:3000'
    volumes:
      - ./api:/usr/src/app
      - ./tests:/usr/src/app/tests
      - /usr/src/app/node_modules
    working_dir: /usr/src/app
    command: sh -c "npm install && npm run start"
    environment:
      DATABASE_URL: postgres://postgres:postgres@db:5432/booking
    depends_on:
      - db

```
- package.json สำหรับ Dependency ต่างๆ
```
{
  "name": "booking-api",
  "version": "1.0.0",
  "type": "module",
  "main": "app.js",
  "scripts": {
    "start": "node app.js",
    "test": "node --test tests/reservation.test.js"
  },
  "dependencies": {
    "body-parser": "^1.20.2",
    "express": "^4.21.2",
    "node-fetch": "^3.3.2",
    "pg": "^8.11.0"
  }
}

```

### 5. Git
- สร้าง branch ชื่อว่า candidate_Kiattiphan_Wareerak

---
