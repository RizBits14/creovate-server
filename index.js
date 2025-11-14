const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB connection URI
const uri = `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@riz14.17psksb.mongodb.net/?retryWrites=true&w=majority&appName=Riz14`;

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

app.get('/', (req, res) => {
    res.send('Creovate backend is running');
});

async function run() {
    try {
        await client.connect();
        console.log("MongoDB connected successfully.");

        // DB & Collections
        const db = client.db('creovate_db');
        const artsCollections = db.collection('arts');
        const favouriteCollection = db.collection('favourites');

        app.get('/arts', async (req, res) => {
            const visibility = req.query.visibility;
            const email = req.query.email;
            const query = {};
            if (visibility) query.visibility = visibility;
            if (email) query.email = email;
            const result = await artsCollections.find(query).sort({ createdAt: -1 }).toArray();
            res.send(result);
        });

        app.get("/my-arts", async (req, res) => {
            const email = req.query.email;
            if (!email) return res.send([]);
            const result = await artsCollections.find({ email }).sort({ createdAt: -1 }).toArray();
            res.send(result);
        });

        app.get('/arts/:id', async (req, res) => {
            const id = req.params.id;
            const result = await artsCollections.findOne({ _id: new ObjectId(id) });
            res.send(result);
        });

        app.get('/featured', async (req, res) => {
            const result = await artsCollections.find({ visibility: "Public" }).sort({ createdAt: -1 }).limit(6).toArray();

            res.send(result);
        });

        app.post('/arts', async (req, res) => {
            const newArt = req.body;

            newArt.createdAt = new Date();

            const result = await artsCollections.insertOne(newArt);
            res.send(result);
        });

        app.patch('/arts/:id', async (req, res) => {
            const id = req.params.id;
            const updatedData = { ...req.body };
            delete updatedData._id;
            const result = await artsCollections.updateOne(
                { _id: new ObjectId(id) },
                { $set: updatedData }
            );
            res.json({ success: true, result });
        });


        app.patch('/arts/:id/like', async (req, res) => {
            const id = req.params.id;

            const result = await artsCollections.updateOne({ _id: new ObjectId(id) }, { $inc: { likes: 1 } }
            );

            res.send(result);
        });

        app.delete('/arts/:id', async (req, res) => {
            const id = req.params.id;
            const result = await artsCollections.deleteOne({ _id: new ObjectId(id) });
            if (result.deletedCount === 0) {
                return res.status(404).json({ success: false, deletedCount: 0, message: "Not found" });
            }
            res.json({ success: true, deletedCount: result.deletedCount });
        });

        app.post('/favourites', async (req, res) => {
            const result = await favouriteCollection.insertOne(req.body);
            res.send(result);
        });

        app.get('/favourites', async (req, res) => {
            const email = req.query.email;
            const result = await favouriteCollection.find({ userEmail: email }).toArray();
            res.send(result);
        });

        app.delete('/favourites/:artworkId', async (req, res) => {
            const artworkId = req.params.artworkId;
            const result = await favouriteCollection.deleteOne({ artworkId });
            res.send(result);
        });

        console.log("Creovate API is ready.");
    } catch (error) {
        console.error("Error connecting to MongoDB:", error);
    }
}

run().catch(console.dir);

app.listen(port, () => {
    console.log(`Creovate server running on port ${port}`);
});
