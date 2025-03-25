import express from 'express';
import cors from 'cors';
import pool from './db.js';
import { encrypt,decrypt } from './crypto.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const app = express();
app.use(cors());
app.use(express.json());

const publicKey = ``;

const privateKey = ``;

const aesKey = '';

app.get('/students', async (req, res) => {
    try {
        const result = await pool.query('SELECT student_id, name FROM students');
        const students = result.rows.map(student => ({
            student_id: student.student_id,
            name: decrypt(student.name) 
        }));

        res.json(students);
    } catch (error) {
        console.error('Error fetching students:', error);
        res.status(500).json({ error: 'Database error' });
    }
});

app.post('/students', async (req, res) => {
    const { student_id, name, ssn, address } = req.body;
    try {
        const encryptedName = encrypt(name);
        const encryptedSsn = encrypt(ssn);
        const encryptedAddress = encrypt(address);
        const result = await pool.query(
            'INSERT INTO students (student_id, name, ssn, address) VALUES ($1, $2, $3, $4) RETURNING student_id',
            [student_id, encryptedName, encryptedSsn, encryptedAddress]
        );
        res.status(201).json({ message: 'Student created successfully', student_id: result.rows[0].student_id });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Database error' });
    }
});


app.post('/transfer-student', async (req, res) => {
    const { student_id } = req.body;

    try {
        const result = await pool.query('SELECT transcript_data FROM transcripts WHERE student_id = $1', [student_id]);

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Transcript not found' });
        }

        const encryptedTranscript = result.rows[0].transcript_data;
        await pool.query(
            'INSERT INTO received_transcripts (student_id, transcript_data) VALUES ($1, $2)',
            [student_id, encryptedTranscript]
        );

        res.json({ message: 'Transcript successfully transferred to College B!' });
    } catch (error) {
        console.error('Error transferring transcript:', error);
        res.status(500).json({ error: 'Transfer failed' });
    }
});
;

app.get('/received-transcripts', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM received_transcripts ORDER BY received_at DESC');
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching received transcripts:', error);
        res.status(500).json({ error: 'Failed to fetch transcripts' });
    }
});


app.get('/received-transcripts/:student_id', async (req, res) => {
    const { student_id } = req.params;

    if (!student_id || isNaN(student_id)) {
        console.error('Invalid student_id:', student_id);
        return res.status(400).json({ error: 'Invalid student ID' });
    }

    try {
        console.log(`Fetching transcript for student_id: ${student_id}`);

        const result = await pool.query(
            'SELECT transcript_data FROM received_transcripts WHERE student_id = $1',
            [parseInt(student_id)]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Transcript not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error fetching received transcript:', error);
        res.status(500).json({ error: 'Failed to fetch transcript' });
    }
});



app.listen(5000, () => {
    console.log('Server running on port 5000');
});