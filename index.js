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
app.use(cors(
    {
        "origin": "*",
        "methods": "GET,HEAD,PUT,PATCH,POST,DELETE",
        "preflightContinue": false,
        "optionsSuccessStatus": 204
    }
));
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
        const noticeCollection = database.collection('notice');
        const purchesCollection = database.collection('purches-balance');
        const purchesHistoryCollection = database.collection('purches-history');
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

        // notice data
        app.get('/notice', async (req, res) => {
            const cursor = noticeCollection.find({});
            const notice = await cursor.toArray();
            res.send(notice);
        })

        app.post('/notice', async (req, res) => {
            const noticeItem = req.body;
            const result = await noticeCollection.insertOne(noticeItem)
            res.json(result);
        })
        // purches-balance data
        app.post("/purches-balance", async (req, res) => {
            let { givAmount, email } = req.body
            givAmount = Number(givAmount)

            try {
                let findUser = await purchesCollection.findOne({ email: email })

                if (findUser) {

                    await purchesCollection.findOneAndUpdate({ email: email }, { $set: { givAmount: findUser.givAmount += givAmount } })
                } else {
                    await purchesCollection.insertOne({ givAmount, email })
                }
            } catch (err) {
                return res.status(404).json({ message: "Not Found" })
            }
        })

        // Get single punches
        app.get("/purches-balance/:email", async (req, res) => {
            let { email } = req.params
            try {
                let user = await purchesCollection.findOne({ email })
                if (!user) {
                    return res.status(404).json({ message: "Not Found" })
                }
                res.status(201).json(user)
            } catch (err) {
                return res.status(404).json({ message: "Not Found" })
            }
        })
        // Purches History
        app.post("/purchesHistory", async (req, res) => {
            try {
                let user = await purchesHistoryCollection.insertOne(req.body)
                return res.status(200).json(user)
            } catch (err) {
                return res.status(500).json({ message: "Server Error" })

            }
        })
        // Get Purches Hostory
        app.get("/purchesHistory", async (req, res) => {

            try {
                let user = await purchesHistoryCollection.find({}).toArray()

                return res.status(200).json(user)
            } catch (err) {
                return res.status(500).json({ message: "Server Error" })
            }
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



        // Withdraw Request
        app.post('/withdraw-request/:email', async (req, res) => {
            let email = req.params.email
            try {
                const user = await clientrequestCollection.findOne({ email: email })
                if (!user) {
                    return res.status(404).json({ message: "Not Found 1" })
                }

                if (user.click >= 2) {
                    return res.status(201).json({ message: 3 });
                }
                try {
                    const mainUser = await clientrequestCollection.findOneAndUpdate({ email: email }, { $set: { click: user.click + 1 } })

                    const result = await withdrawrequestCollection.insertOne({ ...req.body, pending: true })
                    if (result.acknowledged) {
                        // Reset Withdraw Click
                        schedule.scheduleJob('0 0 1 * *', async () => {
                            await clientrequestCollection.findOneAndUpdate({ email: email }, { $set: { click: 0 } })
                        })
                        res.status(201).json({ message: 1 });
                    }

                } catch (err) {
                    return res.status(200).json({ message: "click not update" })
                }

            } catch (err) {
                res.status(202).json({ message: "Request Denied" })
            }

        })
        // Clear the withdraw
        app.put("/clearwithdraw", async (req, res) => {
            let result
            try {
                result = await withdrawrequestCollection.findOneAndUpdate({ _id: ObjectId(req.body.id) }, { $set: { pending: false } }, { new: true })

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
            let totalBalancePaidByCompany = (Number(accountType.split("/")[1]) * 2 / 100)
            let AccountType = Number(accountType.split("/")[1])
            if (AccountType === 1000) {
                totalBalancePaidByCompany += 2500

            }
            else if (AccountType === 3000) {
                totalBalancePaidByCompany += 7500

            }
            else if (AccountType === 6000) {
                totalBalancePaidByCompany += 15000

            }
            else {
                totalBalancePaidByCompany += 50000

            }

            const userReq = {
                accountType,
                treeId: `${Date.now()}${Math.round(Math.random() * 100)}`.slice(4, -5),
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
                profilePic,
                isValidUser: false,
                date: date.toDateString(),
                referIncom: 0,
                click: 0,
                dailyPaid: 0,
                totalPaid: totalBalancePaidByCompany,
                totalSponsorIncome: 0,
                totalGenerationIncom: 0,
                totalWithdraw: 0,
                currentBalance: totalBalancePaidByCompany
            }

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
            let totalPaid;
            let dailyPaid;
            let totalSponsorIncome = 0
            let totalWithdraw = 0
            let totalGeneration = 0

            try {
                let user = await clientrequestCollection.findOne({ email: email })

                if (!user) {
                    return res.status(200).json({ message: "Not Found" })
                }

                let weekday = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date().getDay()]
                let AccountType = Number(user.accountType.split("/")[1])
                if (user.totalPaid === 0) {
                    await clientrequestCollection.findOneAndUpdate({ email: email }, { $set: { totalPaid: null } })
                    totalPaid = "Please Recharge Money"
                } else {
                    if (user.totalPaid === null) {
                        totalPaid = "Please Recharge Money"
                    } else {
                        dailyPaid = user.dailyPaid
                        // Daily Paid 1% of TotalPaid
                        schedule.scheduleJob('0 0 * * *', async () => {
                            if (weekday !== "Fri") {
                                await clientrequestCollection.findOneAndUpdate({ email: email }, { $set: { dailyPaid: dailyPaid += (AccountType * 1 / 100) } })
                                await clientrequestCollection.findOneAndUpdate({ email: email }, { $set: { totalPaid: user.totalPaid -= (AccountType * 1 / 100) } })
                            }
                        })
                    }
                }
                totalPaid = user.totalPaid

             
                // Sponsor Income
                try {
                    let sponsors = await clientrequestCollection.find({ referId: user.treeId }).toArray()
                    // Sponsor Income 10%
                    sponsors.forEach(async sponsor => {
                        let SponsorAccountType = Number(sponsor.accountType.split("/")[1])
                        totalSponsorIncome += SponsorAccountType * 10 / 100
                        await clientrequestCollection.findOneAndUpdate({ email: email }, { $set: { totalSponsorIncome: totalSponsorIncome } })
                    })
                    // Sponsor (total income এর 10%)*10%

                } catch (err) {
                    return res.status(501).json({ message: "Internal Sever Error" })
                }

                // Generation income
                try {
                    // Second Generation
                    let secondGen = await clientrequestCollection.find({ referId: user.treeId }).toArray()
                    secondGen.forEach(async secondGenUser => {
                        // Third Generation
                        let thirdGen = await clientrequestCollection.find({ referId: secondGenUser.treeId }).toArray()
                        thirdGen.forEach(async thirdGenUser => {
                            let ThirdGenAccountType = Number(thirdGenUser.accountType.split("/")[1])
                            totalGeneration += ThirdGenAccountType * 1 / 100
                            await clientrequestCollection.findOneAndUpdate({ email: email }, { $set: { totalGenerationIncom: totalGeneration } })


                            // Fourth Generation
                            let fourthGen = await clientrequestCollection.find({ referId: thirdGenUser.treeId }).toArray()
                            fourthGen.forEach(async fourthGenUser => {
                                let FourthGenAccountType = Number(fourthGenUser.accountType.split("/")[1])
                                console.log(totalGeneration)
                                console.log(FourthGenAccountType * 1 / 100)
                                totalGeneration += FourthGenAccountType * 1 / 100
                               
                                await clientrequestCollection.findOneAndUpdate({ email: email }, { $set: { totalGenerationIncom: totalGeneration } })
                            })

                        })

                    })
                    // ThirdGen
                } catch (err) {
                    return res.status(501).json({ message: "Internal Sever Error" })
                }
                // total Withdraw
                try {
                    let withdrawUser = await withdrawrequestCollection.find({ email: user.email, pending: false }).toArray()
                    withdrawUser.forEach(async userItem => {
                        totalWithdraw += Number(userItem.total)
                    })
                    await clientrequestCollection.findOneAndUpdate({ email: email }, { $set: { totalWithdraw: totalWithdraw } })
                } catch (err) {
                    return res.status(501).json({ message: "Internal Sever Error" })
                }



            } catch (err) {
                return res.status(404).json({ message: "Not Found 2" })
            }
            let currentBalance = (dailyPaid + totalSponsorIncome + totalGeneration) - totalWithdraw
            try {
                await clientrequestCollection.findOneAndUpdate({ email: email }, { $set: { currentBalance: currentBalance } })
            } catch (err) {
                return res.status(500).json({ message: "Internal Server Erro" })
            }
            return res.status(201).json({
                totalPaid,
                dailyPaid,
                totalSponsorIncome,
                totalGeneration,
                totalWithdraw
            })
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
        // GEt All Client Request
        app.get('/client-request', async (req, res) => {
            const cursor = clientrequestCollection.find({});
            const userReq = await cursor.toArray();
            res.json(userReq);
        });
        // Get single client request
        app.get("/singleClient/:email", async (req, res) => {
            let user
            try {
                let { email } = req.params
                user = await clientrequestCollection.findOne({ email: email });
                if (!user) {
                    return res.status(404).json({ message: "User Not Found" })
                }
            } catch (err) {
                return res.status(404).json({ message: "User Not Found" })
            }

            return res.status(201).json(user)
        })
        // Get Dashboard samary 
        app.get("/dashboardSamary", async (req, res) => {
            let totalClient;
            let totalActiveClient;
            let paymentRecived;
            let withdrawRequest;
            try {
                totalClient = await (await clientrequestCollection.find().toArray()).length;
                totalActiveClient = await (await clientrequestCollection.find({ isValidUser: true }).toArray()).length;
                paymentRecived = await (await withdrawrequestCollection.find({ pending: false }).toArray()).length
                withdrawRequest = await (await withdrawrequestCollection.find({ pending: true }).toArray()).length
            } catch (err) {
                return res.status(501).json({ message: "Internal Server Error" })
            }
            return res.status(201).json({
                totalClient,
                totalActiveClient,
                paymentRecived,
                withdrawRequest
            })
        })

        // Get Tree 
        app.get("/unilaveltree/:email", async (req, res) => {
            let fistUserName;
            let secondTree;
            try {
                //    Search 1st Tree
                let { email } = req.params

                const firstUser = await clientrequestCollection.findOne({ email: email });
                if (!firstUser) {
                    return res.status(202).json({ message: "User Not found 1" })
                }
                fistUserName = firstUser.name
                //   Search 2nd Tree
                try {
                    let secondUsers = await clientrequestCollection.find({ referId: firstUser.treeId }).toArray();
                    secondTree = secondUsers
                } catch (err) {
                    return res.status(202).json({ message: "User Not found 2" })
                }
            } catch (err) {

            }

            let filterdArray = secondTree.map(async user => {
                try {
                    let users = await clientrequestCollection.find({ referId: user.treeId }).toArray()
                    user.children = users

                } catch (err) {
                    return res.status(202).json({ message: "User Not found 3" })
                }
                return user
            })
            const filtered = await Promise.all([...filterdArray])
            let forthTree = filtered[0]?.children.map(async item => {
                let usersItem
                try {
                    usersItem = await clientrequestCollection.find({ referId: item.treeId }).toArray()
                    item.children = usersItem
                } catch (err) {
                    console.log("hello")
                    return res.status(202).json({ message: "User Not found 4" })
                }

                return item
            })
            if (forthTree) {
                await Promise.all([...forthTree])
            }




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