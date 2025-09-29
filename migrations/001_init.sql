-- TODO: Candidate must design proper schema

CREATE TABLE rooms (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL
);

CREATE TABLE reservations (
    id SERIAL PRIMARY KEY,
    room_id INT REFERENCES rooms(id),
    check_in DATE NOT NULL,
    check_out DATE NOT NULL,
    created_at TIMESTAMP DEFAULT now()
);
