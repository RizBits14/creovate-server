const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const app = express();

app.use(
    cors({
        origin: [
            "http://localhost:5173",
            "http://localhost:3000",
            process.env.CLIENT_URL,
            process.env.CLIENT_URL_2,
        ].filter(Boolean),
        credentials: true,
    })
);
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@riz14.17psksb.mongodb.net/?retryWrites=true&w=majority&appName=Riz14`;

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    },
});

let db,
    artsCollection,
    favouriteCollection,
    reviewsCollection,
    messagesCollection;

async function connectDB() {
    if (db) return;
    // await client.connect();

    db = client.db("creovate_db");
    artsCollection = db.collection("arts");
    favouriteCollection = db.collection("favourites");
    reviewsCollection = db.collection("reviews");
    messagesCollection = db.collection("messages");

    await reviewsCollection.createIndex({ artworkId: 1, userEmail: 1 }, { unique: true });
    await artsCollection.createIndex({ createdAt: -1 });
    await favouriteCollection.createIndex({ userEmail: 1, artworkId: 1 });
    await messagesCollection.createIndex({ createdAt: -1 });

    console.log("✅ MongoDB connected + indexes ensured");
}

app.get("/", (req, res) => {
    res.send("Creovate server is running ✅");
});

app.get("/arts", async (req, res) => {
    try {
        await connectDB();
        const { visibility, email } = req.query;

        const query = {};
        if (visibility) query.visibility = visibility;
        if (email) query.email = email;

        const result = await artsCollection.find(query).sort({ createdAt: -1 }).toArray();
        res.json(result);
    } catch (err) {
        console.error("GET /arts error:", err);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

app.get("/my-arts", async (req, res) => {
    try {
        await connectDB();
        const { email } = req.query;
        if (!email) return res.json([]);

        const result = await artsCollection.find({ email }).sort({ createdAt: -1 }).toArray();
        res.json(result);
    } catch (err) {
        console.error("GET /my-arts error:", err);
        res.status(500).json([]);
    }
});

app.get("/arts/:id", async (req, res) => {
    try {
        await connectDB();
        const { id } = req.params;

        const result = await artsCollection.findOne({ _id: new ObjectId(id) });
        res.json(result);
    } catch (err) {
        console.error("GET /arts/:id error:", err);
        res.status(500).json(null);
    }
});

app.get("/featured", async (req, res) => {
    try {
        await connectDB();
        const result = await artsCollection
            .find({ visibility: "Public" })
            .sort({ createdAt: -1 })
            .limit(6)
            .toArray();

        res.json(result);
    } catch (err) {
        console.error("GET /featured error:", err);
        res.status(500).json([]);
    }
});

app.post("/arts", async (req, res) => {
    try {
        await connectDB();
        const newArt = req.body || {};

        newArt.createdAt = new Date().toISOString();
        if (typeof newArt.likes !== "number") newArt.likes = 0;

        const result = await artsCollection.insertOne(newArt);
        res.status(201).json({ success: true, insertedId: result.insertedId });
    } catch (err) {
        console.error("POST /arts error:", err);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

app.patch("/arts/:id", async (req, res) => {
    try {
        await connectDB();
        const { id } = req.params;

        const updatedData = { ...req.body };
        delete updatedData._id;

        const result = await artsCollection.updateOne(
            { _id: new ObjectId(id) },
            { $set: updatedData }
        );

        res.json({ success: true, modifiedCount: result.modifiedCount });
    } catch (err) {
        console.error("PATCH /arts/:id error:", err);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

app.patch("/arts/:id/like", async (req, res) => {
    try {
        await connectDB();
        const { id } = req.params;

        const result = await artsCollection.updateOne(
            { _id: new ObjectId(id) },
            { $inc: { likes: 1 } }
        );

        res.json({ success: true, modifiedCount: result.modifiedCount });
    } catch (err) {
        console.error("PATCH /arts/:id/like error:", err);
        res.status(500).json({ success: false });
    }
});

app.delete("/arts/:id", async (req, res) => {
    try {
        await connectDB();
        const { id } = req.params;

        const result = await artsCollection.deleteOne({ _id: new ObjectId(id) });
        if (result.deletedCount === 0) {
            return res.status(404).json({ success: false, message: "Not found" });
        }

        res.json({ success: true, deletedCount: result.deletedCount });
    } catch (err) {
        console.error("DELETE /arts/:id error:", err);
        res.status(500).json({ success: false });
    }
});

app.post("/favourites", async (req, res) => {
    try {
        await connectDB();
        const { userEmail, artworkId } = req.body || {};
        if (!userEmail || !artworkId) {
            return res.status(400).json({ success: false, message: "Missing userEmail or artworkId" });
        }

        const exists = await favouriteCollection.findOne({ userEmail, artworkId });
        if (exists) return res.json({ success: true, already: true });

        await favouriteCollection.insertOne({
            userEmail,
            artworkId,
            createdAt: new Date().toISOString(),
        });

        res.status(201).json({ success: true });
    } catch (err) {
        console.error("POST /favourites error:", err);
        res.status(500).json({ success: false });
    }
});

app.get("/favourites", async (req, res) => {
    try {
        await connectDB();
        const { email } = req.query;
        if (!email) return res.json([]);

        const result = await favouriteCollection.find({ userEmail: email }).toArray();
        res.json(result);
    } catch (err) {
        console.error("GET /favourites error:", err);
        res.status(500).json([]);
    }
});

app.get("/favourites/check", async (req, res) => {
    try {
        await connectDB();
        const { email, artId } = req.query;
        if (!email || !artId) return res.json({ exists: false });

        const exists = await favouriteCollection.findOne({ userEmail: email, artworkId: artId });
        res.json({ exists: !!exists });
    } catch (err) {
        console.error("GET /favourites/check error:", err);
        res.json({ exists: false });
    }
});

app.delete("/favourites/:artworkId", async (req, res) => {
    try {
        await connectDB();
        const { artworkId } = req.params;
        const { email } = req.query;

        if (!email) {
            return res.status(400).json({ success: false, message: "Missing email query param" });
        }

        const result = await favouriteCollection.deleteOne({ artworkId, userEmail: email });
        res.json({ success: true, deletedCount: result.deletedCount });
    } catch (err) {
        console.error("DELETE /favourites/:artworkId error:", err);
        res.status(500).json({ success: false });
    }
});

app.get("/reviews", async (req, res) => {
    try {
        await connectDB();
        const { artworkId } = req.query;
        if (!artworkId) return res.json([]);

        const result = await reviewsCollection.find({ artworkId }).sort({ createdAt: -1 }).toArray();
        res.json(result);
    } catch (err) {
        console.error("GET /reviews error:", err);
        res.status(500).json([]);
    }
});

app.post("/reviews", async (req, res) => {
    try {
        await connectDB();
        const { artworkId, userEmail, userName, rating, comment } = req.body || {};

        if (!artworkId || !userEmail) {
            return res.status(400).json({ success: false, message: "artworkId and userEmail are required" });
        }

        const r = Number(rating);
        if (Number.isNaN(r) || r < 1 || r > 5) {
            return res.status(400).json({ success: false, message: "Rating must be between 1 and 5" });
        }

        const c = String(comment || "").trim();
        if (c.length < 10) {
            return res.status(400).json({ success: false, message: "Comment must be at least 10 characters" });
        }

        const doc = {
            artworkId,
            userEmail,
            userName: userName || "User",
            rating: r,
            comment: c,
            createdAt: new Date().toISOString(),
        };

        const result = await reviewsCollection.insertOne(doc);
        res.status(201).json({ success: true, insertedId: result.insertedId });
    } catch (err) {
        if (err?.code === 11000) return res.json({ already: true });
        console.error("POST /reviews error:", err);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

app.post("/contact", async (req, res) => {
    try {
        await connectDB();
        const { name, email, message } = req.body || {};

        const n = String(name || "").trim();
        const e = String(email || "").trim();
        const m = String(message || "").trim();

        if (n.length < 2) return res.status(400).json({ success: false, message: "Name too short" });
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return res.status(400).json({ success: false, message: "Invalid email" });
        if (m.length < 10) return res.status(400).json({ success: false, message: "Message too short" });

        await messagesCollection.insertOne({
            name: n,
            email: e,
            message: m,
            createdAt: new Date().toISOString(),
        });

        res.status(201).json({ success: true });
    } catch (err) {
        console.error("POST /contact error:", err);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

if (require.main === module) {
    const port = process.env.PORT || 3000;
    app.listen(port, () => console.log(`🚀 Server listening on port ${port}`));
}

module.exports = app;
