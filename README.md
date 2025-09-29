# MindBot Backend Developer Test

## Context
คุณได้รับมอบหมายให้พัฒนาส่วนหนึ่งของ **Hotel Booking System**  
ระบบนี้ต้องรองรับลูกค้าที่จองห้องแบบ real-time โดยไม่ให้เกิด **double booking**  

---

## Environment Setup
```bash
docker compose up --build
```
API รันที่ `http://localhost:3000`  
Database: `postgres://postgres:postgres@localhost:5432/booking`

---

## สิ่งที่ต้องทำ

### 1. Database Schema
- ออกแบบ schema สำหรับ `rooms` และ `reservations`  
- ป้องกันไม่ให้มีการจองห้องซ้ำในช่วงเวลาเดียวกัน

### 2. API
- `POST /reservations`
  - รับ body:
    ```json
    {
      "room_id": 101,
      "check_in": "2025-10-01",
      "check_out": "2025-10-05"
    }
    ```
  - ถ้าห้องว่าง → สร้าง reservation  
  - ถ้าห้องไม่ว่าง → ตอบ `409 Conflict`  

- ต้อง handle **concurrent request** ให้ไม่เกิด double booking

### 3. Testing
- เขียน integration tests ใน `tests/`

### 4. Dockerize
- ใช้ docker-compose เพื่อรัน PostgreSQL และ API
- สร้าง Dockerfile สำหรับ API ที่ติดตั้ง dependency ทั้งหมดและรัน server ได้

### 5. Git
- สร้าง branch และ commit งานอย่างเหมาะสม

### 6. Documentation
- อธิบายใน `README.md` ว่า
  - ออกแบบ schema อย่างไร
  - ป้องกัน double booking แบบไหน
  - trade-off ที่เลือก

---
