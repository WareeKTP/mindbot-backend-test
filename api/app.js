import express from "express";
import bodyParser from "body-parser";
import { pool } from "./db.js";

const app = express();
app.use(bodyParser.json());

// Healthcheck
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// TODO: implement POST /reservations
app.post("/reservations", async (req, res) => {
  const { room_id, check_in, check_out } = req.body;

  // Input validation
  if (!room_id || !check_in || !check_out) {
    return res.status(400).json({ error: "Input Validation Error" });
  }

  // Date validation
  const checkInDate = new Date(check_in);
  const checkOutDate = new Date(check_out);
  if (checkOutDate <= checkInDate) {
    return res.status(400).json({ error: "Date validation error" });
  }

  const client = await pool.connect();

  try {
    // Start transaction
    await client.query("BEGIN");

    // Lock the room row to prevent concurrent reservations
    const roomData = await client.query(
      `SELECT * 
      FROM rooms 
      WHERE id = $1 
      FOR UPDATE`,
      [room_id]
    );

    // Check if room existed
    if (roomData.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Room not found" });
    }

    // check if room available (status == 0 mean available)
    const room = roomData.rows[0];
    if (room.status !== 0) {
      await client.query("ROLLBACK");
      return res.status(409).json({ error: "Conflict, Room is not available" });
    }

    // Insert new reservation
    const insertResult = await client.query(
      `INSERT INTO reservations (room_id, check_in, check_out)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [room_id, check_in, check_out]
    );

    // Update room status to 1 (Reserved, waiting for payment)
    await client.query(
      `UPDATE rooms 
      SET status = 1 
      WHERE id = $1`,
      [room_id]
    );

    // Commit transaction
    await client.query("COMMIT");

    res.status(201).json({
      reservation: insertResult.rows[0],
      message: "Reservation created! Please pay within 1 hour."
    });

  } catch (err) {
    // Rollback if any error occurs
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ error: "Failed to create reservation" });
  } finally {
    client.release();
  }
});


// Confirm reservation after payment
app.post("/reservation/confirm", async (req, res) => {
  const { reservation_id } = req.body;

  // Validate input
  if (!reservation_id) {
    return res.status(400).json({ error: "Input Validation Error" });
  }

  const client = await pool.connect(); // get a client from the pool

  try {
    // Start transaction
    await client.query("BEGIN");

    // Get reservation and room info
    const reservationData = await client.query(
      `SELECT re.id AS reservation_id, re.room_id, ro.status, re.paid_at
       FROM reservations re
       JOIN rooms ro ON re.room_id = ro.id
       WHERE re.id = $1
       FOR UPDATE`, // lock for prevent concurrent request
      [reservation_id]
    );

    // Check if reservation existed
    if (reservationData.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Reservation not found" });
    }

    const { room_id, status, paid_at } = reservationData.rows[0];

    // Check room status (should be 1 = waiting for payment)
    if (status !== 1) {
      await client.query("ROLLBACK");
      return res.status(409).json({ error: "Conflict, Room is not waiting for payment" });
    }

    // Check if already paid
    if (paid_at) {
      await client.query("ROLLBACK");
      return res.status(409).json({ error: "Conflict, Reservation already paid" });
    }

    // Update reservation (paid_at)
    await client.query(
      `UPDATE reservations
       SET paid_at = NOW()
       WHERE id = $1`,
      [reservation_id]
    );

    // Update room status to 2 (Reserved)
    await client.query(
      `UPDATE rooms
       SET status = 2
       WHERE id = $1`,
      [room_id]
    );

    // Commit transaction
    await client.query("COMMIT");

    res.status(201).json({
      reservation_id,
      payment: "Confirmed"
    });

  } catch (err) {
    // Rollback transaction if there is any error
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ error: "Failed to confirm the reservation" });
  } finally {
    client.release();
  }
});

// Cancel the reservation
app.post("/reservation/cancel", async (req, res) => {
  const { reservation_id } = req.body;

  // Check Invput Validation
  if (!reservation_id) {
    return res.status(400).json({ error: "Input Validation Error" });
  }
  const client = await pool.connect();

  try {
    // Start transaction
    await client.query("BEGIN");

    // Get reservation and room info
    const resData = await client.query(
      `SELECT r.id AS reservation_id, r.room_id, ro.status
       FROM reservations r
       JOIN rooms ro ON r.room_id = ro.id
       WHERE r.id = $1
       FOR UPDATE`, // lock for prevent concurrent request
      [reservation_id]
    );

    // Check if reservation existed
    if (resData.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Reservation not found" });
    }

    const { room_id, status } = resData.rows[0];

    // Update room status to 0 (available)
    await client.query(
      `UPDATE rooms 
      SET status = 0 
      WHERE id = $1`,
      [room_id]
    );

    // mark reservation canceled (for history)
    await client.query(
      `UPDATE reservations
       SET noted = 'cancel'
       WHERE id = $1`,
      [reservation_id]
    );

    // Commit transaction
    await client.query("COMMIT");

    res.status(200).json({ message: "Reservation canceled" });

  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ error: "Failed to cancel the reservation" });
  } finally {
    client.release();
  }
});

app.listen(3000, () => console.log("API running on http://localhost:3000"));
