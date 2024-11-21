require ('dotenv').config();
const express = require('express');
const app = express();
const authRoutes = require('./src/routes/auth');
const profileRoutes = require('./src/routes/profile');

app.use(express.json());

app.use('/Users', authRoutes);
app.use('/Users', profileRoutes);

app.get("/", (req, res) => {
    res.json({
        message: "Response Success!"
    })
})

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});