const express = require('express')
const app = express();
const cors = require('cors')
require('dotenv').config();
const jwt = require("jsonwebtoken");
const port = process.env.PORT || 5000;

// middleware 
app.use(cors());
app.use(express.json())



const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.3rjzxua.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();


    // jwt related api
    app.post('/jwt',async(req,res)=>{
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN,{expiresIn:'1hr'})
      res.send({token})
    })

    // verify token
    const verifyToken = async(req,res,next)=>{
       console.log("headers", req.headers.authorization)
      //  next()
      if(!req.headers.authorization){
        return res.status(401).send({message: 'Forbidden access'})
      }
      const token = req.headers.authorization.split(" ")[1];
      if(!token){
        return res.status(401).send({message: 'Forbidden access'})
      }
      jwt.verify(token, process.env.ACCESS_TOKEN,(error,decoded)=>{
        if(error){
          return res.status(401).send({message: 'Forbidden access'})
        }
        req.decoded = decoded;
        next();
      })
    }

    //  verify admin
    const verifyAdmin = async(req,res, next)=>{
      const email = req.decoded.email;
      // console.log(email)
      const query = {email: email}
      const user = await userCollection.findOne(query);
      const isAdmin = user?.role === "admin";

      if(!isAdmin){
        return res.status(401).send({message: 'Forbidden access'})
      }
      next()
    }


    // menu collection
    const menuCollection = client.db("teast-treat").collection("menu");

    app.get("/menu", async(req,res)=>{
        const result = await menuCollection.find().toArray();
        res.send(result)
    })

    app.post("/menu",verifyToken, verifyAdmin, async(req,res)=>{
      const menu = req.body;
      const result = await menuCollection.insertOne(menu);
      res.send(result)
    })
    app.delete('/menu/:id',verifyToken,verifyAdmin, async(req,res)=>{
      const id = req.params.id;
      const query = {_id: new ObjectId(id)}
      const result = await menuCollection.deleteOne(query);
      res.send(result)
    })

    //  review collection
    const reviewsCollection = client.db("teast-treat").collection("reviews");

    app.get("/reviews", async(req,res)=>{
        const result = await reviewsCollection.find().toArray();
        res.send(result)
    })

     // menu collection
     const cartCollection = client.db("teast-treat").collection("carts");

     app.get("/carts", async(req,res)=>{
      const email = req.query.email;
      const query = {email : email}
      const result = await cartCollection.find(query).toArray();
      res.send(result);
     })

    app.post("/carts", async(req,res)=>{
      const cartItem = req.body;
      const result = await cartCollection.insertOne(cartItem);
      res.send(result);
    })

    app.delete("/carts/:id",async(req,res)=>{
      const id = req.params.id;
      const query = {_id: new ObjectId(id)} 
      const result = await cartCollection.deleteOne(query)
      res.send(result)
    })

      //  user collection
      const userCollection = client.db("teast-treat").collection("users");

      app.get("/users",verifyToken,verifyAdmin, async(req, res)=>{
        // console.log("headers", req.headers.authorization)
        const result = await userCollection.find().toArray()
        res.send(result)
        // console.log("decodddddd",req.decoded)
      })

      // check user or admin
      app.get("/users/admin/:email", verifyToken, async(req,res)=>{
        const email = req.params.email;
        if(email !== req.decoded.email){
          return res.status(403).send({message:"Unauthorized access"})
        }
        const query = {email: email}
        const user = await userCollection.findOne(query);
        let admin = false;
        if(user){
          admin = user?.role === "admin";
        }
        res.send({admin})

      })

      app.post("/users", async(req,res)=>{
        const user = req.body;
        // inser email if user does not exist
        const query = { email: user.email}
        const existingUser = await userCollection.findOne(query)
        if(existingUser){
          return res.send({message: "user already Exist"})
        }

        const result = await userCollection.insertOne(user);
        res.send(result)
      })

      app.delete('/users/:id',verifyToken,verifyAdmin, async(req,res)=>{
        const id = req.params.id;
        const query = {_id: new ObjectId(id)}
        const result = await userCollection.deleteOne(query)
        res.send(result)
      })

      app.patch("/users/admin/:id",verifyToken,verifyAdmin, async(req,res)=>{
        const id = req.params.id;
        const filter = {_id: new ObjectId(id)}
        const updatedDoc = {
          $set:{
            role:"admin"
          }
        }
        const result = await userCollection.updateOne(filter,updatedDoc)
        res.send(result)
      })


    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);



app.get("/",(req,res)=>{
    res.send("Hi this is home get API")
})

app.listen(port , ()=>{
    console.log(`localhost connect on ${port}`)
})