const express = require('express');
const { db } = require('../config/firebase-config');
const jwt = require('jsonwebtoken');

const router = express.Router();

// Middleware untuk memverifikasi Access Token (Bearer Token)
const verifyToken = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];

    if (!token) {
        return res.status(403).json({
            success: false,
            message: 'Access token is required'
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
            error: error.message
        });
    }
};

// Endpoint untuk membuat atau mengupdate profil pengguna
router.post('/CurrentUser', verifyToken, async (req, res) => {
    const { username, email, phone, address } = req.body;

    try {
        // Periksa apakah profil sudah ada
        const userDoc = await db.collection('profiles').doc(req.userId).get();

        if (userDoc.exists) {
            // Update profil pengguna yang sudah ada
            await db.collection('profiles').doc(req.userId).update({
                username, email, phone, address, updatedAt: new Date()
            });
            return res.status(200).json({
                success: true,
                message: 'Profile updated successfully'
            });
        } else {
            // Buat profil baru untuk pengguna
            await db.collection('profiles').doc(req.userId).set({
                username, email, phone, address, createdAt: new Date()
            });
            return res.status(201).json({
                success: true,
                message: 'Profile created successfully'
            });
        }
    } catch (error) {
        console.error('Error saving profile:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to save profile',
            error: error.message
        });
    }
});

router.get('/CurrentUser', verifyToken, async (req, res) => {
    try {
        if (!req.userId) {
            return res.status(400).json({
                success: false,
                message: 'User ID not found in request'
            });
        }

        const userSnapshot = await db.collection('profiles').doc(req.userId).get();

        if (!userSnapshot.exists) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const userData = userSnapshot.data();

        // Menggunakan fungsi untuk mengonversi waktu ke WIB
        let createdAt = userData.createdAt ? formatDateToIndonesiaTime(userData.createdAt) : 'N/A';

        return res.status(200).json({
            success: true,
            message: 'Profile fetched successfully',
            data: {
                ...userData,
                createdAt: createdAt,
            }
        });
    } catch (error) {
        console.error('Error fetching profile:', error);
        return res.status(500).json({
            success: false,
            message: 'Error fetching profile',
            error: error.message
        });
    }
});

function formatDateToIndonesiaTime(timestamp) {
    return new Date(timestamp._seconds * 1000)
        .toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })
        .replace(',', '');
}

module.exports = router;
