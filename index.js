const express = require('express');
const { MongoClient } = require('mongodb');
require('dotenv').config();
const app = express();
const ObjectId = require('mongodb').ObjectId;
const cors = require('cors');
const fileUpload = require('express-fileupload');
const schedule = require("node-schedule")
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());
app.use(fileUpload());
app.use(express.urlencoded({ extends: true }))



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.8djb4.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

let date = new Date()






async function run() {
    try {
        await client.connect();
        const database = client.db('mlm');
        const usersCollection = database.collection('users');
        const clientrequestCollection = database.collection('client-request');
        const complainCollection = database.collection('complain');
        const contactCollection = database.collection('contact');
        const callbackCollection = database.collection('callback');
        const withdrawrequestCollection = database.collection('withdraw-request');

        // complain data

        app.get('/complain', async (req, res) => {
            const cursor = complainCollection.find({});
            const complain = await cursor.toArray();
            res.send(complain);
        })

        app.post('/complain', async (req, res) => {
            const complainItem = req.body;
            const result = await complainCollection.insertOne(complainItem)
            res.json(result);
        })




        // contact data

        app.get('/contact', async (req, res) => {
            const cursor = contactCollection.find({});
            const contact = await cursor.toArray();
            res.send(contact);
        })

        app.post('/contact', async (req, res) => {
            const contactItem = req.body;
            const result = await contactCollection.insertOne(contactItem)
            res.json(result);
        })





        // call back data
        app.get('/callback', async (req, res) => {
            const cursor = callbackCollection.find({});
            const callback = await cursor.toArray();
            res.send(callback);
        })

        app.post('/callback', async (req, res) => {
            const callbackItem = req.body;
            const result = await callbackCollection.insertOne(callbackItem)
            res.json(result);
        })

        // withdraw request data
        app.get('/withdraw-request', async (req, res) => {
            const cursor = withdrawrequestCollection.find({});
            const withdrawReq = await cursor.toArray();
            res.send(withdrawReq);
        })
        // Get Single User Withdraw Status
        app.get("/withdrawStateu/:email", async (req, res) => {
            let user
            try {
                let { email } = req.params
                user = await withdrawrequestCollection.find({ email: email }, { pending: false }).toArray()
                if (!user) {
                    return res.status(200).json({ message: "User Not Found" })
                }
            } catch (err) {
                return res.status(200).json({ message: "User Not Found" })
            }
            res.status(201).json(user)
        })

        app.post('/withdraw-request', async (req, res) => {
            try {
                const result = await withdrawrequestCollection.insertOne({ ...req.body, pending: true })
                if (result.acknowledged) {
                    res.status(201).json({ message: 1 });
                }
            } catch (err) {
                res.status(202).json({ message: "Request Denied" })
            }

        })
        // Clear the withdraw
        app.put("/clearwithdraw", async (req, res) => {
            let result
            try {
                result = await withdrawrequestCollection.findOneAndUpdate({ email: req.body.email }, { $set: { pending: false } }, { new: true })
            }
            catch (err) {
                return res.status(202).json({ message: "Server Error" })
            }

            return res.status(201).json(result)

        })

        // users data

        app.post('/users', async (req, res) => {
            const user = req.body;
            const result = await usersCollection.insertOne(user)
            res.json(result);
        })

        app.put('/users', async (req, res) => {
            const user = req.body;
            const filter = { email: user.email };
            const options = { upsert: true };
            const updateDoc = { $set: user };
            const result = await usersCollection.updateOne(filter, updateDoc, options);
            res.json(result);
        })

        app.get('/users/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email: email };
            const user = await usersCollection.findOne(query);
            let isAdmin = false;
            if (user?.role === 'admin') {
                isAdmin = true;
            }
            res.json({ admin: isAdmin });
        })


        // client req data    
        app.post('/client-request', async (req, res) => {
            let {
                phoneNumber,
                accountType,
                referId,
                name,
                fatherName,
                motherName,
                nomineeName,
                dateOfBirth,
                nidBirth,
                profession,
                division,
                district,
                upzilla,
                post,
                profilePic,
                email
            } = req.body
            const encodeProfilePic = profilePic.toString('base64');
            const profilePicBuffer = Buffer.from(encodeProfilePic, 'base64');
            const userReq = {
                accountType,
                treeId: `${Date.now()}-${Math.round(Math.random() * 1E9)}`,
                referId,
                name,
                email,
                fatherName,
                motherName,
                nomineeName,
                dateOfBirth,
                nidBirth,
                profession,
                division,
                district,
                upzilla,
                post,
                phoneNumber,
                profilePic: profilePicBuffer,
                isValidUser: false,
                date: date.toDateString(),
                referIncom: 0
            }
            console.log(userReq)
            const result = await clientrequestCollection.insertOne(userReq);
            res.json(result);
        });
        // GET Refer List
        app.get("/referList/:email", async (req, res) => {
            try {
                let { email } = req.params
                let result = await clientrequestCollection.findOne({ email: email })

                try {
                    let users = await clientrequestCollection.find({ referId: result.treeId }).toArray()
                    console.log(users)
                    return res.status(201).json(users)
                } catch (err) {
                    return res.status(200).json({ message: "Not Found" })
                }
            } catch (err) {
                return res.status(200).json({ message: "Not Found" })
            }
        })
        // Income Report
        app.get("/incomReport/:email", async (req, res) => {
            let { email } = req.params
            let totoalPaid;
            let dailyPaid = 0;
            try {
                let user = await clientrequestCollection.findOne({ email: email })
                if (!user) {
                    return res.status(200).json({ message: "Not Found" })
                }
                totoalPaid = Number(user.accountType.spilt("/")[1])
                schedule.scheduleJob('0 0 * * *', () => {
                    dailyPaid += totoalPaid * 1 / 100
                })
                // Referal User
                try {
                    let users = await clientrequestCollection.find({ referId: user.treeId }).toArray()
                    console.log(user)

                } catch (err) {
                    return res.status(200).json({ message: "Not Found" })
                }

            } catch (err) {
                return res.status(200).json({ message: "Not Found" })
            }

        })

        // Active User
        app.put("/activeuser", async (req, res) => {
            try {
                const user = await clientrequestCollection.findOneAndUpdate({ _id: ObjectId(req.body.id) }, { $set: { isValidUser: true } }, { new: true });
                if (user.ok) {
                    return res.status(201).json({ message: user.ok, isValidUser: user.value.isValidUser })
                }
            } catch (err) {
                return res.status(200).json({ message: "Not Updated" })
            }

        })

        app.get('/client-request', async (req, res) => {
            const cursor = clientrequestCollection.find({});
            const userReq = await cursor.toArray();
            res.json(userReq);
        });


        // Get Tree 
        app.get("/unilaveltree/:id", async (req, res) => {
            let fistUserName;
            let secondTree;
            try {
                //    Search 1st Tree
                let { id } = req.params
                const firstUser = await clientrequestCollection.findOne({ _id: ObjectId(id) });
                if (!firstUser) {
                    return res.status(202).json({ message: "User Not found" })
                }
                fistUserName = firstUser.name
                //   Search 2nd Tree
                try {
                    let secondUsers = await clientrequestCollection.find({ referId: firstUser.treeId }).toArray();
                    secondTree = secondUsers
                } catch (err) {
                    return res.status(202).json({ message: "User Not found" })
                }
            } catch (err) {
                console.log(err)
            }

            let filterdArray = secondTree.map(async user => {
                try {
                    let users = await clientrequestCollection.find({ referId: user.treeId }).toArray()
                    user.children = users
                } catch (err) {
                    return res.status(202).json({ message: "User Not found" })
                }
                return user
            })
            const filtered = await Promise.all([...filterdArray])
            console.log(filtered)

            return res.status(200).json([
                {
                    name: fistUserName,
                    children: [
                        ...filtered
                    ]

                }
            ])
        })

    }
    catch (err) {
        // await client.close();
    }
}
run().catch(console.dir);

app.get('/api', (req, res) => {
    res.send('sd-one server')
});

app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`)
});