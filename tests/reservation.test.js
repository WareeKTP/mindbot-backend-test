import test from "node:test";
import assert from "node:assert";
import fetch from "node-fetch";

const API = "http://localhost:3000";

test("healthcheck works", async () => {
  const res = await fetch(`${API}/health`);
  const body = await res.json();
  assert.strictEqual(body.status, "ok");
});


// TODO: Candidate must add tests for reservation flow

let reservationId; // Define to use for each part
let roomId = 101;

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
// Reservation Part Test
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
// 01
test("(Should Success) create reservation", async () => {
  const res = await fetch(`${API}/reservations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      room_id: roomId,
      check_in: "2025-10-01",
      check_out: "2025-10-05",
    }),
  });

  assert.strictEqual(res.status, 201);
  const body = await res.json();
  assert.strictEqual(body.reservation.room_id, roomId);
  assert.strictEqual(body.message, "Reservation created! Please pay within 1 hour.");
  reservationId = body.reservation.id;
});

// 02
test("(Should Error) empty input", async () => {
  const res = await fetch(`${API}/reservations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      room_id: null,
      check_in: null,
      check_out: null,
    }),
  });

  assert.strictEqual(res.status, 400); // Bad Request
  const body = await res.json();
  assert.strictEqual(body.error, "Input Validation Error");
});

// 03
test("(Should Error) create reservation with invalid dates", async () => {
  const res = await fetch(`${API}/reservations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      room_id: roomId,
      check_in: "2025-10-10",
      check_out: "2025-10-08",
    }),
  });

  assert.strictEqual(res.status, 400); // Bad Request
  const body = await res.json();
  assert.strictEqual(body.error, "Date validation error");
});

// 04
test("(Should Error) reserve room which not available", async () => {
  const res = await fetch(`${API}/reservations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      room_id: roomId,
      check_in: "2025-10-10",
      check_out: "2025-10-12",
    }),
  });

  assert.strictEqual(res.status, 409); // Conflict
  const body = await res.json();
  assert.strictEqual(body.error, "Conflict, Room is not available");
});

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
// Confirm Part Test
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
// 05
test("(Should Success) confirm reservation payment", async () => {
  const res = await fetch(`${API}/reservation/confirm`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reservation_id: reservationId }),
  });

  assert.strictEqual(res.status, 201);
  const body = await res.json();
  assert.strictEqual(body.payment, "Confirmed");
});

// 06
test("(Should Error) Input Empty", async () => {
  const res = await fetch(`${API}/reservation/confirm`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reservation_id: null }),
  });

  assert.strictEqual(res.status, 400);
  const body = await res.json();
  assert.strictEqual(body.error, "Input Validation Error");
});

// 07
test("(Should Error) confirm non-existent reservation", async () => {
  const res = await fetch(`${API}/reservation/confirm`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reservation_id: 999999 }),
  });

  assert.strictEqual(res.status, 404);
  const body = await res.json();
  assert.strictEqual(body.error, "Reservation not found");
});

// 08
test("(Should Error) confirm reservation with wrong status", async () => {
  const res = await fetch(`${API}/reservation/confirm`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reservation_id: reservationId }),
  });

  assert.strictEqual(res.status, 409); // Conflict
  const body = await res.json();
  assert.strictEqual(body.error, "Conflict, Room is not waiting for payment");
});

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
// Cancel Part Test
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
// 09
test("(Should Success) cancel reservation", async () => {
  const res = await fetch(`${API}/reservation/cancel`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reservation_id: reservationId }),
  });

  assert.strictEqual(res.status, 200);
  const body = await res.json();
  assert.strictEqual(body.message, "Reservation canceled");
});

// 10
test("(Should Error) Input Empty", async () => {
  const res = await fetch(`${API}/reservation/cancel`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reservation_id: null }),
  });

  assert.strictEqual(res.status, 400);
  const body = await res.json();
  assert.strictEqual(body.error, "Input Validation Error");
});

// 11
test("(Should Error)cancel non-existent reservation", async () => {
  const res = await fetch(`${API}/reservation/cancel`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reservation_id: 999999 }), // reservation id 999999 not existed
  });

  assert.strictEqual(res.status, 404);
  const body = await res.json();
  assert.strictEqual(body.error, "Reservation not found");
});
