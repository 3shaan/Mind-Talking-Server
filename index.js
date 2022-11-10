const express = require('express');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 5000
require("dotenv").config();
const jwt = require("jsonwebtoken");


//middle ware

app.use(cors());
app.use(express.json());


app.get('/', (req, res) => {
    res.send('mind talking server is running')
})

//token verify function 
const verifyjwt = (req, res, next) => {
    const authHeader = req.headers.authorization;
      if (!authHeader) {
        return res.status(401).send({ message: "unauthorized access, Token absence" });
      }
    console.log(authHeader);
    jwt.verify(authHeader, process.env.WEB_TOKEN, (err, decoder) => {
        if (err) {
            return res.status(401).send({ message: "unauthorized access, token problem" }); 
        }
        req.decoder = decoder;
        next();
     })
    
}

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
    const reviewCollection = client.db("mind-talking").collection("review");

    // jwt token
    app.post('/jwt', (req, res) => {
        const user = req.body;
        const token = jwt.sign(user, process.env.WEB_TOKEN, { expiresIn: '1hr' });
        res.send({token});
    })



    //get all service

    app.get('/services', async (req, res) => {
        const query = {};
        const service = await serviceCollection.find(query).toArray();
        res.send(service);
    });

    //post all services

    app.post("/services", verifyjwt, async (req, res) => {
      const data = req.body;
      const result = await serviceCollection.insertOne(data);
      res.send(result);
    });

    // limit services
    app.get('/homeservice', async (req, res) => {
        const query = {};
        const service = await serviceCollection.find(query).limit(3).sort({_id:-1}).toArray();
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
    });

    // get all review 
    app.get('/review', async (req, res) => {
        const query = {};
        const result = await reviewCollection.find(query).toArray();
        res.send(result);
    });

    //review get based on service 
    app.get('/review/:id', async (req, res) => {
        const id = req.params.id;
        const query = { "serviceId": { "$in": [id] } };
        const result = await reviewCollection.find(query).toArray();
        res.send(result);
    });

    // get review by email 
    app.get("/myreview/:email", verifyjwt, async (req, res) => {
      const email = req.params.email;
      const query = { email: { $in: [email] } };
      const result = await reviewCollection.find(query).toArray();
      res.send(result);
    });

    // get review by review id 
    app.get("/user_review/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await reviewCollection.findOne(query);
      res.send(result);
    });

    // review post
    app.post("/review", async (req, res) => {
        const data = req.body;
        const result = reviewCollection.insertOne(data);
        res.send(result)
    });

    // patch review based on id 
    app.put("/user_review/:id", async (req, res) => {
        const id = req.params.id;
        const data = req.body;
        const query = { _id: ObjectId(id) };
        const option = { upsert: true };
        const updateReview = {
            $set: {
                name: data.name,
                rating: data.rating,
                img: data.img,
                comment:data.comment
            }
        }
        const result = await reviewCollection.updateOne(query, updateReview, option);
        res.send(result);
    });

    //delete review
    app.delete("/user_review/:id", (req, res) => {
        const id = req.params.id;
        const query = { _id: ObjectId(id) }
        const result = reviewCollection.deleteOne(query);
        res.send(result);
    })



}
run().catch(err => console.log(err));


app.listen(port, () => {
    console.log(`sever is running at ${port}`)
})
