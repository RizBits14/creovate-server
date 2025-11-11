const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config()

const app = express()
const port = process.env.PORT || 3000

// Middlewares
app.use(cors())
app.use(express.json())

const mongoose = require('mongoose')
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

        app.post('/arts', async(req, res) => {
            const newArts = req.body
            const result = await artsCollections.insertOne(newArts)
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
    console.log(`Creovate server is running on por: ${port}`)
})