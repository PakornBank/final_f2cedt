const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const axios = require("axios");
require("dotenv").config();

const createDOMPurify = require("dompurify");
const { JSDOM } = require("jsdom");

const window = new JSDOM("").window;
const DOMPurify = createDOMPurify(window);

const app = express();
app.use(express.json());
app.use(cors());

const userSchema = new mongoose.Schema({
  name: String,
  uid: String,
  solvedProblems: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Problem",
    },
  ],
});
const User = mongoose.model("User", userSchema);

function getJudge0LanguageId(language) {
  switch (language) {
    case "JavaScript":
      return 63;
    case "Python":
      return 71;
    case "Java":
      return 62;
    case "C++":
      return 54;
    default:
      return 71;
  }
}

const problemSchema = new mongoose.Schema({
  title: String,
  description: String,
  difficulty: String,
  testCases: [
    {
      input: String,
      output: String,
    },
  ],
  solution: String,
});

const Problem = mongoose.model("Problem", problemSchema);

// Register Endpoint
app.post("/register", async (req, res) => {
  if (await User.findOne({ name: req.body.name })) {
    return res.status(400).send("User already exists");
  }
  const { name } = req.body;
  const uid = Math.random().toString(36).substring(2, 10);
  const newUser = new User({ name, uid });
  await newUser.save();
  res.json({ uid });
});

// Login Endpoint
app.post("/login", async (req, res) => {
  const { name } = req.body;
  const user = await User.findOne({ name });
  if (user) {
    res.json({ uid: user.uid });
  } else {
    res.status(404).send("User not found");
  }
});

// Create Battle Endpoint
app.post("/create-battle", async (req, res) => {
  const newRoomId = Math.random().toString(36).substring(2, 9);
  const newBattleRoom = new BattleRoom({
    roomId: newRoomId,
    problemId: req.body.problemId,
    creator: req.body.name,
    active: true,
  });
  await newBattleRoom.save();
  res.json({ roomId: newRoomId });
});

// Join Battle Endpoint
app.post("/join-battle", async (req, res) => {
  const roomIdToJoin = req.body.roomId;
  const battleRoom = await BattleRoom.findOne({
    roomId: roomIdToJoin,
    active: true,
  });
  if (battleRoom) {
    battleRoom.opponent = req.body.name;
    battleRoom.active = false;
    await battleRoom.save();
    res.status(200).send("Joined successfully");
  } else {
    res.status(404).send("Room not found or already full");
  }
});

// List Active Battles
app.get("/active-battles", async (req, res) => {
  const activeBattles = await BattleRoom.find({ active: true });
  res.json(activeBattles);
});

// Get Problem by ID
app.get("/problems/:id", async (req, res) => {
  try {
    const problem = await Problem.findById(req.params.id);
    res.json(problem);
  } catch {
    res.status(404).send("Problem not found");
  }
});

// List all Problems
app.get("/problems", async (req, res) => {
  const problems = await Problem.find({});
  res.json(problems);
});

// Create Problem Endpoint
app.post("/problems", async (req, res) => {
  try {
    const sanitizedDescription = DOMPurify.sanitize(req.body.description);

    const newProblem = new Problem({
      title: req.body.title,
      description: sanitizedDescription,
      difficulty: req.body.difficulty,
      testCases: req.body.testCases,
    });
    await newProblem.save();
    res.status(200).send("Problem created successfully");
  } catch (error) {
    res.status(500).send("Error creating the problem");
  }
});

app.get("/get-user/:uid", async (req, res) => {
  const uid = req.params.uid;
  const user = await User.findOne({ uid });
  if (user) {
    res.json({ name: user.name });
  } else {
    res.status(404).send("User not found");
  }
});

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const submitSingleTestCase = async (code, language, input, output) => {
  const judge0Url =
    "https://judge0-ce.p.rapidapi.com/submissions/?base64_encoded=false&wait=true";
  const languageId = getJudge0LanguageId(language);

  const data = {
    source_code: code,
    language_id: languageId,
    stdin: input,
    expected_output: output,
  };

  const response = await axios.post(judge0Url, data, {
    headers: {
      "Content-Type": "application/json",
      "X-RapidAPI-Key": "c57af75ebemsh3be8c6f6b87ac2dp1075a4jsnac034659ff31",
      "X-RapidAPI-Host": "judge0-ce.p.rapidapi.com",
    },
  });

  return response.data;
};

app.post("/update-profile-picture/:uid", async (req, res) => {
  const uid = req.params.uid;
  const user = await User.findOne({ uid });
  if (user) {
    user.profilePicture = req.body.profilePicture;
    await user.save();
    res.json({ success: true, message: "Profile picture updated." });
  } else {
    res.status(404).send("User not found");
  }
});

app.get("/get-user/:uid", async (req, res) => {
  const uid = req.params.uid;
  const user = await User.findOne({ uid });
  if (user) {
    res.json({ name: user.name, profilePicture: user.profilePicture });
  } else {
    res.status(404).send("User not found");
  }
});

app.use((req, res, next) => {
  next();
});

app.post("/submitsolution", async (req, res) => {
  const { code, language, problemId } = req.body;

  const problem = await Problem.findById(problemId);

  const results = [];
  for (let testCase of problem.testCases) {
    const result = await submitSingleTestCase(
      code,
      language,
      testCase.input,
      testCase.output
    );
    results.push(result);

    // Wait for 1 second
    await delay(1000);
  }

  const allPassed = results.every(
    (res) => res.status.description === "Accepted"
  );
  if (allPassed) {
    res.json({ message: "All test cases passed!" });
  } else {
    res.json({ message: "Some test cases failed." });
  }
});

// Delete Battle Endpoint
app.delete("/delete-battle/:roomId", async (req, res) => {
  await BattleRoom.findOneAndDelete({ roomId: req.params.roomId });
  res.status(200).send("Deleted successfully");
});

// Delete User Endpoint
app.delete("/delete-user/:uid", async (req, res) => {
  await User.findOneAndDelete({ uid: req.params.uid });
  res.status(200).send("Deleted successfully");
});

function connectToMongo() {
  try {
    const mongoUri =
      "mongodb+srv://codingbt:cedtcoding@cluster0.eroiiuw.mongodb.net/";
    mongoose
      .connect(mongoUri, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      })
      .then(() => {
        app.listen(5001, () => {
          console.log(`Server is listening on port 5001`);
        });
      })
      .catch((error) => {
        console.log("Error connecting to MongoDB Atlas:", error);
        console.log("Retrying to connect to MongoDB Atlas...");
        setTimeout(connectToMongo, 5000);
      });
  } catch (error) {
    console.log("Error connecting to MongoDB Atlas:", error);
  }
}

console.log("Connecting to MongoDB...");

// Initiate the connection process
connectToMongo();
