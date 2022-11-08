const express = require('express');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 5000
require("dotenv").config();


//middle ware

app.use(cors());
app.use(express.json());


app.get('/', (req, res) => {
    res.send('mind taling server is running')
})

//mongodb

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.00o20sl.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});
async function run() {
    const serviceCollection = client.db('mind-talking').collection('services');
    //get all service

    app.get('/services', async (req, res) => {
        const query = {};
        const service = await serviceCollection.find(query).toArray();
        res.send(service);
    });
    // limit services
    app.get('/homeservice', async (req, res) => {
        const query = {};
        const service = await serviceCollection.find(query).limit(3).toArray();
        res.send(service);
    });

    //single service get

    app.get("/services/:id", async (req, res) => {
        const id = req.params.id;
        const query = { _id: ObjectId(id) };
        const result = await serviceCollection.findOne(query);
        res.send(result);

    });

    //rest service data

    app.get('/rest/:id', async (req, res) => {
        const id = req.params.id;
        const query = { _id: { $ne: ObjectId(id) } }
        const result = await serviceCollection.find(query).toArray();
        res.send(result);
    })
}
run().catch(err => console.log(err));


app.listen(port, () => {
    console.log(`sever is running at ${port}`)
})
