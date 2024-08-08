const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config();
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

app.use(cors())
app.use(express.static('public'))
app.use(bodyParser.urlencoded({extended: false}));
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

const userSchema = new mongoose.Schema({
  username: {type: String, required: true, unique: true }
});
const User = mongoose.model('User', userSchema);

const exerciseSchema = new mongoose.Schema({
  userId: {type: String, required: true},
  description: { type: String, required: true},
  duration: {type: Number, required: true},
  date: {type: Date, default: Date.now }
});
const Exercise = mongoose.model('Exercise', exerciseSchema);

module.exports = {User, Exercise};

app.post('/api/users', async (req, res) => {
  const {username} = req.body;
  
  try {
    const newUser = new User({username});
    await newUser.save();
    res.json({
      username: newUser.username,
      _id: newUser._id
    });
  } catch (error) {
    res.status(400).json({error: "User creation failed"});
  }
});

app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find({});
    res.json(users);
  } catch (error) {
    res.status(400).json({ error: 'Error fetching users' });
  }
});

app.post('/api/users/:_id/exercises', async (req, res) => {
  const { _id } = req.params;
  const {description, duration, date} = req.body;

  try {
    const user = await User.findById(_id);
    if(!user)
      return res.status(400).json({error: "User not found"});
    const exerciseDate = date ? new Date(date) : new Date();
    const newExercise = new Exercise({
      userId: _id,
      description,
      duration: parseInt(duration),
      date: exerciseDate
    });
    await newExercise.save();

    res.json({
      username: user.username,
      description: newExercise.description,
      duration: newExercise.duration,
      date: newExercise.date.toDateString(),
      _id: user._id
    });
  } catch (error) {
    res.status(400).json({ error: 'Error adding exercise' });
  }
});

app.get('/api/users/:_id/logs', async (req, res) => {
  const {_id} = req.params;
  const {from, to, limit} = req.query;

  try {
    const user = await User.findById(_id);
    if(!user)
      return res.status(400).json({error: "User not found"});
    let query = {userId: _id};
    if (from || to) {
      query.date = {};
      if (from) query.date.$gte = new Date(from);
      if (to) query.date.$lte = new Date(to);
    }

    const exercises = await Exercise.find(query).limit(parseInt(limit) || 0).exec();

    res.json({
      username: user.username,
      count: exercises.length,
      _id: user._id,
      log: exercises.map(ex => ({
        description: ex.description,
        duration: ex.duration,
        date: ex.date.toDateString()
      }))
    });
  } catch (error) {
    res.status(400).json({ error: 'Error fetching logs' });
  }
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
