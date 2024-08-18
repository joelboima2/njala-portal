const express = require('express');
const bodyParser = require('body-parser');
const redis = require('redis');
const { promisify } = require('util');
const path = require('path');

const app = express();
app.use(bodyParser.json());

// Serve static files from the "public" directory
app.use(express.static(path.join(__dirname, 'public')));

const redisClient = redis.createClient();
const hgetallAsync = promisify(redisClient.hgetall).bind(redisClient);
const lrangeAsync = promisify(redisClient.lrange).bind(redisClient);
const hmsetAsync = promisify(redisClient.hmset).bind(redisClient);
const incrAsync = promisify(redisClient.incr).bind(redisClient);
const rpushAsync = promisify(redisClient.rpush).bind(redisClient);

app.post('/login', async (req, res) => {
    const { loginId } = req.body;
    const student = await hgetallAsync(`student:${loginId}`);

    if (student) {
        res.json({ success: true, student });
    } else {
        res.json({ success: false, message: 'Invalid Student ID' });
    }
});

app.get('/grades', async (req, res) => {
    const { studentId } = req.query;
    const grades = await hgetallAsync(`grades:${studentId}`);

    if (grades) {
        res.json({ success: true, grades });
    } else {
        res.json({ success: false });
    }
});

app.get('/news', async (req, res) => {
    const newsTitles = await lrangeAsync('news', 0, -1);
    const newsItems = await Promise.all(newsTitles.map(title => hgetallAsync(`news:${title}`)));

    if (newsItems) {
        res.json({ success: true, news: newsItems });
    } else {
        res.json({ success: false });
    }
});

app.post('/complaint', async (req, res) => {
    const { studentId, content } = req.body;
    const complaintId = await incrAsync('complaintId');
    await hmsetAsync(`complaint:${complaintId}`, { studentId, content });
    res.json({ success: true });
});

app.get('/chat', async (req, res) => {
    const messages = await lrangeAsync('chatMessages', 0, -1);
    res.json({ success: true, messages: messages.map(JSON.parse) });
});

app.post('/chat', async (req, res) => {
    const { studentId, message } = req.body;
    const student = await hgetallAsync(`student:${studentId}`);
    const chatMessage = JSON.stringify({ sender: student.name, text: message });
    await rpushAsync('chatMessages', chatMessage);
    res.json({ success: true });
});

// Default route for any unspecified paths (e.g., index.html)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(3000, () => console.log('Server running on port 3000'));
