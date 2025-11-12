const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()

const app = express()
const port = process.env.PORT || 3000

// Middlewares
app.use(cors())
app.use(express.json())

const uri = `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@riz14.17psksb.mongodb.net/?appName=Riz14`;

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

app.get('/', (req, res) => {
    res.send('Creovate is Running')
})

async function run() {
    try {
        await client.connect()

        const db = client.db('creovate_db')
        const artsCollections = db.collection('arts')
        const favouriteCollection = db.collection('favourites')

        // Arts APIs
        app.get('/arts', async (req, res) => {
            const email = req.query.email
            const query = {}
            if (email) {
                query.email = email
            }
            const cursor = artsCollections.find(query)
            const result = await cursor.toArray()
            res.send(result)
        })

        app.get('/arts/:id', async (req, res) => {
            const id = req.params.id
            const query = { _id: new ObjectId(id) }
            const result = await artsCollections.findOne(query)
            res.send(result)
        })

        app.post('/arts', async (req, res) => {
            const newArts = req.body
            const result = await artsCollections.insertOne(newArts)
            res.send(result)
        })

        app.patch('/arts/:id', async (req, res) => {
            const id = req.params.id
            const updatedArts = req.body
            const query = { _id: new ObjectId(id) }
            const update = {
                $set: {
                    name: updatedArts.name,
                    painting: updatedArts.painting
                }
            }
            const result = await artsCollections.updateOne(query, update)
            res.send(result)
        })

        app.patch('/arts/:id/like', async (req, res) => {
            const id = req.params.id
            const query = { _id: new ObjectId(id) }
            const update = { $inc: { likes: 1 } }
            const result = await artsCollections.updateOne(query, update)
            res.send(result)
        })

        app.delete('/arts/:id', async (req, res) => {
            const id = req.params.id
            const query = { _id: new ObjectId(id) }
            const result = await artsCollections.deleteOne(query)
            res.send(result)
        })

        // Favourite APIs
        app.post('/favourites', async (req, res) => {
            const { userEmail, artworkId } = req.body
            const result = await favouriteCollection.insertOne({ userEmail, artworkId })
            res.send(result)
        })

        app.get('/favourites', async (req, res) => {
            const email = req.query.email
            const result = await favouriteCollection.find({ userEmail: email }).toArray()
            res.send(result)
        })

        app.delete('/favourites/:artworkkId', async (req, res) => {
            const { artworkId } = req.params
            const result = await favouriteCollection.deleteOne({ artworkId })
            res.send(result)
        })

        await client.db("admin").command({ ping: 1 })
        console.log("Pinged your deployment. You successfully connected to MongoDB!")
    }
    finally {

    }
}

run().catch(console.dir)

app.listen(port, () => {
    console.log(`Creovate server is running on port: ${port}`)
})