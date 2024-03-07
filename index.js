import express from "express";


const app = express();
const PORT = 8000;

app.use("/", (req, res) => {
    res.json({ message: "Service is live" });
})

app.listen(PORT, () => {
    console.log('Connected');
})

