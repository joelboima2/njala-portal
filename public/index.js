const express = require('express');
const bodyParser = require('body-parser');
const redis = require('redis');

const app = express();
app.use(bodyParser.json());

const redisClient = redis.createClient();

app.post('/login', async (req, res) => {
    const { loginId } = req.body;
    const student = await redisClient.hgetallAsync(`student:${loginId}`);

    if (student) {
        res.json({ success: true, student });
    } else {
        res.json({ success: false, message: 'Invalid Student ID' });
    }
});

app.get('/grades', async (req, res) => {
    const { studentId } = req.query;
    const grades = await redisClient.hgetallAsync(`grades:${studentId}`);

    if (grades) {
        res.json({ success: true, grades });
    } else {
        res.json({ success: false });
    }
});

app.get('/news', async (req, res) => {
    const newsTitles = await redisClient.lrangeAsync('news', 0, -1);
    const newsItems = await Promise.all(newsTitles.map(title => redisClient.hgetallAsync(`news:${title}`)));

    if (newsItems) {
        res.json({ success: true, news: newsItems });
    } else {
        res.json({ success: false });
    }
});

app.post('/complaint', async (req, res) => {
    const { studentId, content } = req.body;
    const complaintId = await redisClient.incrAsync('complaintId');
    await redisClient.hmsetAsync(`complaint:${complaintId}`, { studentId, content });
    res.json({ success: true });
});

app.get('/chat', async (req, res) => {
    const messages = await redisClient.lrangeAsync('chatMessages', 0, -1);
    res.json({ success: true, messages: messages.map(JSON.parse) });
});

app.post('/chat', async (req, res) => {
    const { studentId, message } = req.body;
    const student = await redisClient.hgetallAsync(`student:${studentId}`);
    const chatMessage = JSON.stringify({ sender: student.name, text: message });
    await redisClient.rpushAsync('chatMessages', chatMessage);
    res.json({ success: true });
});

app.listen(3000, () => console.log('Server running on port 3000'));
