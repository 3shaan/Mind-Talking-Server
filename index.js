const express = require('express');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 5000
require("dotenv").config();
const jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const { query } = require('express');
const stripe = require("stripe")(process.env.STRIPE_KEY);


//middle ware

app.use(cors());
app.use(express.json());
app.use(express.static("public"));


app.get('/', (req, res) => {
    res.send('mind talking server is running')
})

//token verify function 
const verifyjwt = (req, res, next) => {
    const authHeader = req.headers.authorization;
      if (!authHeader) {
        return res.status(401).send({ message: "unauthorized access, Token absence" });
      }
    jwt.verify(authHeader, process.env.WEB_TOKEN, (err, decoder) => {
        if (err) {
            return res.status(401).send({ message: "unauthorized access, token problem" }); 
        }
        req.decoder = decoder;
        next();
     })
    
}

// admin check



//mongodb

// const uri = `mongodb://127.0.0.1:27017/?directConnection=true&serverSelectionTimeoutMS=2000&appName=mongosh+1.6.0`;

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.00o20sl.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});
async function run() {
    const serviceCollection = client.db('mind-talking').collection('services');
    const reviewCollection = client.db("mind-talking").collection("review");
    const blogsCollection = client.db("mind-talking").collection("blogs");
    const appointmentCollection = client.db('mind-talking').collection('appointment');
    const bookingCollection = client.db('mind-talking').collection('bookings');
    const usersCollection = client.db('mind-talking').collection('users');
    const doctorsCollection = client.db('mind-talking').collection('doctors');
    const paymentsCollection = client.db('mind-talking').collection('payments');

    // jwt token
    app.post('/jwt',async(req, res) => {
        const user = req.body;
        const query = {email:user}
        const findUser = await usersCollection.find();
        if (findUser) {
             const token = jwt.sign(user, process.env.WEB_TOKEN, {
               expiresIn: "1hr",
             });
           return  res.send({ token });  
        }
        res.sendStatus(403);
       
    })


    // verify admin middle ware 
    const adminCheck = async (req, res, next) => {
      const email = req.decoder.email;
      const query = { email };
        const admin = await usersCollection.findOne(query);
        if (admin.roll !== 'admin') {
            return res.sendStatus(403);
        }
       return next();
    };



    //get all service

    app.get('/services', async (req, res) => {
        const query = {};
        const service = await serviceCollection.find(query).toArray();
        res.send(service);
    });

    // service name collection 
     app.get("/services_name", async (req, res) => {
       const query = {};
       const service = await serviceCollection.find(query).project({title:1}).toArray();
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
        const result = await reviewCollection.insertOne(data);
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
    app.delete("/user_review/:id", async (req, res) => {
        const id = req.params.id;
        const query = { _id: ObjectId(id) }
        const result = await reviewCollection.deleteOne(query);
        res.send(result);
    });

    // blogs

    app.get('/blogs', async(req, res) => {
        const result = await blogsCollection.find({}).toArray();
        res.send(result);
    })
    
    // appointment data get
    app.get('/appointments', async (req, res) => {
        const date = req.query.date;
        const results = await appointmentCollection.find({}).toArray();
        //booked
        const bookedQuery = { appointmentDate: date };
        const alreadyBooked = await bookingCollection.find(bookedQuery).toArray();
        results.forEach(result => {
            const booked = alreadyBooked.filter(book => book.appointmentName === result.name);
            const bookedTime = booked.map((book) => book.appointmentTime);
            const remainingSlots = result.slots.filter(slot => !bookedTime.includes(slot))
            result.slots = remainingSlots;
         })
        res.send(results);
    })

    // booking data 
    app.post('/bookings', async (req, res) => {
        const bookingData = req.body;
        const query = {
          appointmentDate: bookingData.appointmentDate,
            appointmentName: bookingData.appointmentName,
            email: bookingData.email,
        };
        const alreadyBooked = await bookingCollection.find(query).toArray();

        if (alreadyBooked.length) {
            const message = `you already booked on this ${bookingData.appointmentDate}`
            return res.send({ acknowledged: false, message });
        }
        const result = await bookingCollection.insertOne(bookingData);
        res.send(result);
    });

    // use aggregate
    app.get("/v2/appointments", async (req, res) => {
        const date = req.query.date;
        const results = await appointmentCollection.aggregate([
            {
                $lookup: {
                    from: "bookings",
                    localField: "name",
                    foreignField: "appointmentName",
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $eq: ["appointmentDate", date],
                                },
                            },
                        },
                    ],
                    as: "booked",
                },
            },
            {
                $project: {
                    name: 1,
                    slots: 1,
                    booked: {
                        $map: {
                            input: "$booked",
                            as: "book",
                            in: "$$book.appointmentTime",
                        },
                    },
                },
            },
            {
                $project: {
                    name: 1,
                    slots: {
                        $setDifference: ['slots', "booked"]
                    }
                }
            }
        ]).toArray();
        res.send(results);
    });

    // appointment get
    app.get("/bookings", async (req, res) => {
        const email = req.query.email;
        const query = { email };
        const isAdmin = await usersCollection.findOne(query);
        if (isAdmin?.roll === 'admin') {
            const result = await bookingCollection.find({}).toArray();
            return res.send(result);
        }
        const result = await bookingCollection.find(query).toArray();
        res.send(result);
    });

    // users collection 
    app.post('/users', async (req, res) => {
        const user = req.body;
        const result = await usersCollection.insertOne(user);
        res.send(result);
    });

    //all users get
    
    app.get("/users", verifyjwt, async (req, res) => {
      const query = {};
      const result = await usersCollection.find(query).toArray();
      res.send(result);
    });
    
    //make admin 
    app.put("/users/admin/:id", verifyjwt, adminCheck, async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const updateUser = {
        $set: {
          roll: "admin",
        },
      };
      const result = await usersCollection.updateOne(query, updateUser, {
        upsert: true,
      });
        res.send(result);
    });

    // check admin

    app.get("/users/admin/:email", async (req, res) => {
        const email = req.params.email;
        const query = { email };
        const result = await usersCollection.findOne(query);
        res.send({ isAdmin: result?.roll === "admin" });
    });

    // add doctors

    app.post("/doctors", verifyjwt, adminCheck, async (req, res) => {
      const data = req.body;
      const result = await doctorsCollection.insertOne(data);
      res.send(result);
    });

    // all doctors get
    app.get("/doctors", verifyjwt, adminCheck, async (req, res) => {
      const email = req.decoder.email;
      const query = {};
      const result = await doctorsCollection.find(query).toArray();
      res.send(result);
    });

    // delete doctors

    app.delete("/doctors/:id", verifyjwt, adminCheck, async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await doctorsCollection.deleteOne(query);
      res.send(result);
    });

    // stripe payments

    app.post('/payments', async (req, res) => {
        const price = req?.body?.servicePrice;
        const payment = await stripe.paymentIntents.create({
            amount: price,
            currency: "usd",
            payment_method_types: ["card"],
        });
        res.send({
            clientSecret: payment.client_secret,
        })
    });

   // get data in payment section
    
    app.get('/payment/:id', async (req, res) => {
        const id = req.params.id;
        const query = { _id: ObjectId(id) };
        const result = await bookingCollection.findOne(query);
        res.send(result);
    });

    // store users payment info in database 
    app.post('/payments_info',async (req, res) => {
        const data = req.body;
        const query = { _id: ObjectId(data.serviceId) };
        const updateDoc = {
            $set: {
                paid:true
            }
        }

        const updateBookings = await bookingCollection.updateOne(query, updateDoc, { upsert: true });
        const result = await paymentsCollection.insertOne(data);
        res.send(result);
    })

}
run().catch(err => console.log(err));


app.listen(port, () => {
    console.log(`sever is running at ${port}`)
})
