const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db, admin } = require('../config/firebase-config');
const firebaseAdmin = require('firebase-admin');

const router = express.Router();

// Blacklist untuk menyimpan token yang telah di-logout (opsional, bisa menggunakan Redis)
const tokenBlacklist = [];

// Middleware untuk memverifikasi Access Token (Bearer Token)
const verifyToken = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1]; // Ambil Bearer Token dari header

    if (!token) {
        return res.status(403).json({
            success: false,
            message: 'Access token is required',
        });
    }

    if (tokenBlacklist.includes(token)) {
        return res.status(401).json({
            success: false,
            message: 'Token is invalid or expired',
        });
    }

    try {
        // Verifikasi token
        const decoded = jwt.verify(token, process.env.SECRET_KEY);
        req.userId = decoded.userId;
        next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: 'Invalid or expired token',
            error: error.message,
        });
    }
};

// Register User
router.post('/Register', async (req, res) => {
    const { username, email, password } = req.body;

    try {
        // Cek apakah email sudah terdaftar di Firebase Authentication
        const userRecord = await firebaseAdmin.auth().getUserByEmail(email).catch((error) => {
            if (error.code !== 'auth/user-not-found') {
                throw error;
            }
        });

        if (userRecord) {
            return res.status(400).json({
                success: false,
                message: 'Email already exists',
            });
        }

        // Enkripsi password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Buat pengguna di Firebase Authentication
        const userCredential = await firebaseAdmin.auth().createUser({
            email: email,
            password: hashedPassword,
            displayName: username,
        });

        // Simpan data pengguna ke Firestore
        await db.collection('users').doc(userCredential.uid).set({
            username: username,
            email: email,
            password: hashedPassword,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            lastLogin: admin.firestore.FieldValue.serverTimestamp(),
        });

        return res.status(201).json({
            success: true,
            message: 'User registered successfully',
            userId: userCredential.uid,
        });
    } catch (error) {
        console.error('Error registering user:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to register user',
            error: error.message,
        });
    }
});

// Login User
router.post('/Login', async (req, res) => {
    const { email, password } = req.body;

    try {
        // Cek apakah pengguna ada di Firebase Authentication
        const userRecord = await firebaseAdmin.auth().getUserByEmail(email);

        // Dapatkan data pengguna dari Firestore
        const userDoc = await db.collection('users').doc(userRecord.uid).get();
        const userData = userDoc.data();

        // Verifikasi password yang dimasukkan dengan yang ada di Firestore
        const isPasswordValid = await bcrypt.compare(password, userData.password);

        if (!isPasswordValid) {
            return res.status(400).json({
                success: false,
                message: 'Invalid password',
            });
        }

        // Buat JWT token
        const accessToken = jwt.sign({ userId: userRecord.uid }, process.env.SECRET_KEY);

        // Perbarui waktu login terakhir di Firestore
        await db.collection('users').doc(userRecord.uid).update({
            lastLogin: admin.firestore.FieldValue.serverTimestamp(),
        });

        res.status(200).json({
            success: true,
            message: 'User logged in successfully',
            data: {
                username: userData.username,
                accessToken,
            },
        });
    } catch (error) {
        console.error('Error logging in user:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to login user',
            error: error.message,
        });
    }
});

// Logout User
router.post('/Logout', verifyToken, async (req, res) => {
    try {
        // Simpan token ke dalam blacklist
        const token = req.headers['authorization']?.split(' ')[1];
        tokenBlacklist.push(token);

        // Perbarui waktu logout terakhir di Firestore
        await db.collection('users').doc(req.userId).update({
            lastLogout: admin.firestore.FieldValue.serverTimestamp(),
        });

        res.status(200).json({
            success: true,
            message: 'User logged out successfully',
        });
    } catch (error) {
        console.error('Error logging out user:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to logout user',
            error: error.message,
        });
    }
});

module.exports = router;
