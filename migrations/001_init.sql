-- TODO: Candidate must design proper schema

-- Room status lookup table
CREATE TABLE IF NOT EXISTS room_status (
    status INT PRIMARY KEY,
    description TEXT NOT NULL,
    CHECK (status BETWEEN 0 AND 3)
);

-- Defined statuses
INSERT INTO room_status (status, description) VALUES
    (0, 'Available'),
    (1, 'Reserved but waiting for payment'),
    (2, 'Reserved'),
    (3, 'Unavailable')
    ON CONFLICT (status) DO NOTHING;

-- Rooms table
CREATE TABLE IF NOT EXISTS rooms (
    id INT PRIMARY KEY,
    name TEXT NOT NULL,
    status INT NOT NULL DEFAULT 0 REFERENCES room_status(status)
);

-- Reservations table
CREATE TABLE IF NOT EXISTS reservations (
    id SERIAL PRIMARY KEY,
    room_id INT NOT NULL REFERENCES rooms(id),
    check_in DATE NOT NULL,
    check_out DATE NOT NULL,
    created_at TIMESTAMP DEFAULT now(),
    paid_at TIMESTAMP DEFAULT NULL,
    noted TEXT,
    CHECK (check_out > check_in)
);

-- Insert some sample for testing
INSERT INTO rooms (id, name, status) VALUES
    (101, 'Standard_1', 0),
    (102, 'Standard_2', 1),
    (103, 'Deluxe', 2),
    (104, 'Suite', 3)
    ON CONFLICT (id) DO NOTHING;
