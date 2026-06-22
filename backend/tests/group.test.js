const request = require('supertest'); 
const app = require('../server');
const db = require('../config/db');
const bcrypt = require('bcrypt');


afterAll(async () => {
    // Closes the database pool connections cleanly so Jest can exit immediately
    if (typeof db.end === 'function') {
        await db.end();
    }
});


describe('Community Groups Feature Testing', () => {
    let testGroupId; 
    const testUserId = 1;
    
    beforeAll(async () => {
        const res = await request(app)
            .post('/api/groups/create')
            .send({
                groupName:'Temporary test group',
                userId: testUserId
            }); 
        testGroupId = res.body.group_id; 
    });
    afterAll(async () => {
        if (testGroupId) {
            await db.query('DELETE FROM group_messages WHERE group_id = $1', [testGroupId]);
            await db.query('DELETE FROM group_members WHERE group_id = $1', [testGroupId]); 
            await db.query('DELETE FROM community_groups WHERE group_id = $1', [testGroupId]);        
        }
    });

    it('create a group successfully with valid boundary name', async () => {
        const res = await request(app)
            .post('/api/groups/create')
            .send({
                groupName:'A', 
                userId:testUserId
            });
        expect(res.statusCode).toEqual(201); 
        expect(res.body).toHaveProperty('group_id');

        await db.query('DELETE FROM group_members WHERE group_id = $1', [res.body.group_id]);
        await db.query('DELETE FROM community_groups WHERE group_id = $1', [res.body.group_id]); 
       
    });

    it('cannot join group with group id that does not exist', async () => {
        const res = await request(app)
            .post('/api/groups/join')
            .send({
                verificationId: -1000, 
                userId: testUserId
            })
        expect(res.status).toEqual(444); 
        expect(res.body.error).toBe('Group ID not found');

    });

    it('should block duplicate enrollment in the same group', async () => {
        const result = await db.query('SELECT verification_id FROM community_groups WHERE group_id = $1 AND created_by = $2', [testGroupId, testUserId]); 
        const testVeriId = result.rows[0]?.verification_id; 
        const res = await request(app)
            .post('/api/groups/join')
            .send({
                verificationId: testVeriId,
                userId: testUserId
            });

        expect(res.status).toEqual(400); 
        expect(res.body.error).toBe('You are already a member of this group'); 
    });


    it('should post a text message to an active chat group', async () => {
        const res = await request(app)
            .post('/api/groups/message')
            .send({
                groupId: testGroupId, 
                sendId: testUserId, 
                messageText: 'Hello I am testing'
            }); 
        expect(res.status).toEqual(201); 
        expect(res.body).toHaveProperty('message_id'); 
        expect(res.body.message_text).toBe('Hello I am testing'); 
    }); 

    it('should be able to retrieve text message', async () => {
        const res = await request(app)
            .get(`/api/groups/${testGroupId}/messages`)
        
        expect(res.status).toEqual(200)
        expect(Array.isArray(res.body)).toBe(true); 
        expect(res.body.length).toBeGreaterThan(0); 
    })

    it('should automatically delete the group when the absolute last member exits the room', async () => {
        // Step A: Spawn an isolated group with an alternate valid user ID (or the test user)
        const setupRes = await request(app)
            .post('/api/groups/create')
            .send({
                groupName: 'Self-Destruct Test Room',
                userId: testUserId
            });
        const secondGroupId = setupRes.body.group_id;

        // Step B: Trigger the exit controller payload for that user
        const res = await request(app)
            .post('/api/groups/leave')
            .send({
                groupId: secondGroupId,
                userId: testUserId
            });

        // According to your controller line: 'If group has no members left, erase its records completely'
        expect(res.statusCode).toEqual(200);
        expect(res.body.message).toContain('Group was empty and has been deleted');

        // Step C: Verify the record is completely purged from PostgreSQL
        const dbCheck = await db.query('SELECT * FROM community_groups WHERE group_id = $1', [secondGroupId]);
        expect(dbCheck.rows.length).toEqual(0);
    });


})


describe('Smart bill splitting calcation testing', () => {
    let testGroupId; 
    const testUserId = 1; 
    beforeAll(async () => {
        const res = await request(app)
            .post('/api/groups/create')
            .send({
                groupName:'Temporary test group',
                userId: testUserId
            }); 
        testGroupId = res.body.group_id; 
    });
    afterAll(async () => {
        if (testGroupId) {
            await db.query('DELETE FROM group_messages WHERE group_id = $1', [testGroupId]);
            await db.query('DELETE FROM group_members WHERE group_id = $1', [testGroupId]); 
            await db.query('DELETE FROM community_groups WHERE group_id = $1', [testGroupId]);        
        }
    });


    it('should calculate an equal split with basic currency conversion smoothly', async () => {
        // Mock payload: User 1 paid 90.00 SGD, total bill needs conversion to USD
        const res = await request(app)
            .post('/api/bills/split_smart')
            .send({
                groupId: testGroupId,
                description: 'Team Dinner',
                category: 'Food',
                currency: 'SGD',
                targetCurrency: 'USD',
                currencyRate: 0.74, // Mock conversion multiplier factor (1 SGD = 0.74 USD)
                splitMethod: 'equal',
                payers: [{ userId: testUserId, paid: 90.00 }],
                individualItems: [],
                sharedCost: 0,
                gst: 0,
                tax: 0
            });

        expect(res.statusCode).toEqual(201);
        expect(res.body).toHaveProperty('billId');
        expect(res.body).toHaveProperty('transactions');
        expect(res.body.settlementsGenerated).toBeGreaterThanOrEqual(0);
        
        // Clean up generated bill shares due to foreign keys cascades
        if (res.body.billId) {
            await db.query('DELETE FROM Bill_Shares WHERE bill_id = $1', [res.body.billId]);
            await db.query('DELETE FROM Bills WHERE bill_id = $1', [res.body.billId]);
        }
    });

    it('should reject bill computation if a payer submits a negatively paid value', async () => {
        const res = await request(app)
                    .post('/api/bills/split_smart')
                    .send({
                        groupId: testGroupId, 
                        description: 'negative bill testing', 
                        category: 'Food', 
                        currency: 'SGD', 
                        targetCurrency: 'SGD', 
                        currencyRate: 1.0, 
                        splitMethod: 'equal', 
                        payers: [
                            {userId: testUserId, paid: -50.00}
                        ], 
                        individualItems: [],
                        sharedCost: 0, 
                        gst: 7, 
                        tax: 0
                    }); 
        expect(res.status).toEqual(400); 
        expect(res.body.error).toBe('negative money paid is not allowed'); 
    }); 

    it('should successfully retrieve group debt ledger', async () => {
        const res = await request(app)
                    .get(`/api/bills/ledger/${testGroupId}`);
        expect(res.status).toEqual(200);
        expect(Array.isArray(res.body)).toBe(true);
                        
    })


})


describe('Smart bill splitting calculation comprehensive engine testing', () => {
    let testGroupId; 
    let userIds = [];

    beforeAll(async () => {
        // 1. Create 4 dedicated test users sequentially in the correct 'account' table
        const usernames = ['Alpha', 'Bravo', 'Charlie', 'Delta'];
        for (const name of usernames) {
            const userRes = await db.query(
                'INSERT INTO account (username, email, password) VALUES ($1, $2, $3) RETURNING user_id',
                [name, `${name.toLowerCase()}@test.com`, 'hashed_test_password_123']
            );
            userIds.push(userRes.rows[0].user_id);
        }

        // 2. Setup a temporary group owned by User 1 (Alpha) in 'community_groups'
        const groupRes = await request(app)
            .post('/api/groups/create')
            .send({
                groupName: 'Calculation Validation Sandbox Group',
                userId: userIds[0]
            }); 
        testGroupId = groupRes.body.group_id; 

        // 3. Link the remaining 3 test users as group members in 'group_members'
        for (let i = 1; i < userIds.length; i++) {
            await db.query(
                'INSERT INTO group_members (group_id, user_id) VALUES ($1, $2)',
                [testGroupId, userIds[i]]
            );
        }
    });

    afterAll(async () => {
        if (testGroupId) {
            // Clean up using lowercase table structures matching your ER diagram precisely
            await db.query('DELETE FROM bill_shares WHERE bill_id IN (SELECT bill_id FROM bills WHERE group_id = $1)', [testGroupId]);
            await db.query('DELETE FROM bills WHERE group_id = $1', [testGroupId]);
            await db.query('DELETE FROM group_messages WHERE group_id = $1', [testGroupId]);
            await db.query('DELETE FROM group_members WHERE group_id = $1', [testGroupId]); 
            await db.query('DELETE FROM community_groups WHERE group_id = $1', [testGroupId]);        
        }
        
        // Purge the 4 test users cleanly out of 'account'
        if (userIds.length > 0) {
            await db.query('DELETE FROM account WHERE user_id = ANY($1::int[])', [userIds]);
        }
    });

    // Test case 1: Equal split (Multi-Payer Edge Case)
    it('should calculate an equal split correctly where multiple users pay uneven amounts', async () => {
        const res = await request(app)
            .post('/api/bills/split_smart')
            .send({
                groupId: testGroupId,
                description: 'Uneven Multi-Payer Dinner',
                category: 'Food',
                currency: 'SGD',
                targetCurrency: 'SGD',
                currencyRate: 1.0,
                splitMethod: 'equal',
                payers: [
                    { userId: userIds[0], paid: 80.00 },
                    { userId: userIds[1], paid: 40.00 }
                ],
                individualItems: [],
                sharedCost: 0
            });

        expect(res.statusCode).toEqual(201);
        expect(res.body).toHaveProperty('transactions');
        
        const txs = res.body.transactions;
        const totalSettled = txs.reduce((sum, t) => sum + parseFloat(t.amount), 0);
        expect(totalSettled).toBeCloseTo(60.00, 2);

        const debtors = txs.map(t => t.debtorId);
        expect(debtors).toContain(userIds[2]);
        expect(debtors).toContain(userIds[3]);
    });

    // test case 2: proportional split 
    it('should calculate a proportional split assigned directly from individual item choices', async () => {
        const res = await request(app)
            .post('/api/bills/split_smart')
            .send({
                groupId: testGroupId,
                description: 'Al La Carte Lunch Split',
                category: 'Food',
                currency: 'USD',
                targetCurrency: 'USD',
                currencyRate: 1.0,
                splitMethod: 'proportional',
                payers: [
                    { userId: userIds[0], paid: 100.00 }
                ],
                individualItems: [
                    { userId: userIds[1], itemCost: 50.00 },
                    { userId: userIds[2], itemCost: 30.00 },
                    { userId: userIds[3], itemCost: 20.00 }
                ],
                sharedCost: 0
            });

        expect(res.statusCode).toEqual(201);
        const txs = res.body.transactions;
        
        txs.forEach(t => {
            expect(t.creditorId).toEqual(userIds[0]);
        });

        const user2 = txs.find(t => t.debtorId === userIds[1]);
        expect(parseFloat(user2.amount)).toBeCloseTo(50.00, 2);
    });

    // test 3: custom split (Individual + Shared Pool)
    it('should calculate a custom split adding personal item cost to an evenly split shared pool', async () => {
        const res = await request(app)
            .post('/api/bills/split_smart')
            .send({
                groupId: testGroupId,
                description: 'Drinks Platter plus mains',
                category: 'Entertainment',
                currency: 'SGD',
                targetCurrency: 'SGD',
                currencyRate: 1.0,
                splitMethod: 'custom',
                payers: [
                    { userId: userIds[0], paid: 140.00 }
                ],
                individualItems: [
                    { userId: userIds[1], itemCost: 60.00 },
                    { userId: userIds[2], itemCost: 40.00 }
                ],
                sharedCost: 40.00
            });

        expect(res.statusCode).toEqual(201);
        const txs = res.body.transactions;

        const user4 = txs.find(t => t.debtorId === userIds[3]);
        expect(user4).toBeDefined();
        expect(parseFloat(user4.amount)).toBeCloseTo(10.00, 2);

        const totalCollectedAmount = txs.reduce((sum, t) => sum + parseFloat(t.amount), 0);
        expect(totalCollectedAmount).toBeCloseTo(130.00, 2);
    });

    // test case 4: cross currency split 
    it('should calculate an equal split correctly with foreign cross-currency conversions', async () => {
        const res = await request(app)
            .post('/api/bills/split_smart')
            .send({
                groupId: testGroupId,
                description: 'International Trip Dinner',
                category: 'Travel',
                currency: 'USD',
                targetCurrency: 'AUD',
                currencyRate: 1.40, 
                splitMethod: 'equal',
                payers: [
                    { userId: userIds[1], paid: 100.00 }
                ],
                individualItems: [],
                sharedCost: 0
            });

        expect(res.statusCode).toEqual(201);
        const txs = res.body.transactions;

        txs.forEach(t => {
            expect(t.creditorId).toEqual(userIds[1]);
            expect(parseFloat(t.amount)).toBeCloseTo(35.00, 2);
        });
    });
});


describe('User Profile feature testing', ()=> {
    let testUserId; 
    const basePassword= 'securePassword123'; 
    const uniqueUsername= 'TestUser_' + Date.now()
    const uniqueEmail= `test_${Date.now()}@gmail.com`;

    // Seed Hooks: Set up a dedicated workspace row before running assertions
    beforeAll(async ()=> {
        const saltRounds= 10; 
        const hashPassword= await bcrypt.hash(basePassword, saltRounds); 
        // Pre-insert an active account entity row manually to act as our session target
        const res= await db.query(
            `INSERT INTO account (username, password, email, created_on)
            VALUES ($1, $2, $3, NOW()) RETURNING user_id`, 
            [uniqueUsername, hashPassword, uniqueEmail]
        ); 
        testUserId= res.rows[0].user_id; 
    })
    // Cleanup Hooks: Wipe the database workspace clean after execution loops terminate
    afterAll(async ()=> {
        if (testUserId) {
            await db.query('DELETE FROM group_members WHERE user_id= $1', [testUserId]); 
            await db.query('DELETE FROM bill_shares WHERE debtor_user_id= $1 OR creditor_user_id= $1', [testUserId]);
            await db.query('DELETE FROM account WHERE user_id=$1', [testUserId]);
        }

    });
    it('should fetch specific profile credentials mathcing valid ID for UI rendering', async ()=> {
        const res= await request(app)
            .get(`/api/accounts/${testUserId}`);
        expect(res.statusCode).toEqual(200); 
        expect(res.body).toHaveProperty('user_id', testUserId); 
        expect(res.body.username).toBe(uniqueUsername); 
        expect(res.body.email).toBe(uniqueEmail);
        expect(res.body).not.toHaveProperty('password'); // Password hashes must remain hidden from UI responses
    });

    it('should return a 4040 error if UI requests a non-existent parameter account ID', async ()=> {
        const res= await request(app) 
            .get('/api/accounts/99999');
        expect(res.statusCode).toEqual(404); 
        expect(res.body.error).toBe('User not found');
    })

    it('should successfully update user profile credentials when no password variation is requested', async ()=> {
        const updatedEmail= 'new_' + uniqueEmail; 
        const updatedUsername= uniqueUsername + '_New';

        const res= await request(app) 
            .put(`/api/accounts/${testUserId}`)
            .send({
                username: updatedUsername, 
                email: updatedEmail,
                currentPassword: '', 
                newPassword: ''
            })
        expect(res.statusCode).toEqual(200); 
        expect(res.body.user.username).toBe(updatedUsername); 
        expect(res.body.user.email).toBe(updatedEmail);
        const dbCheck= await db.query('SELECT username, email FROM account WHERE user_id = $1', [testUserId]); 
        expect(dbCheck.rows[0].username).toBe(updatedUsername); 
        expect(dbCheck.rows[0].email).toBe(updatedEmail);
    });

    it('should reject password update if the current password parameter is missing', async () => {
        const res = await request(app)
            .put(`/api/accounts/${testUserId}`)
            .send({
                username: uniqueUsername,
                email: uniqueEmail,
                currentPassword: '', // Left blank invalidly
                newPassword: 'myBrandNewPassword123'
            });

        expect(res.statusCode).toEqual(400);
        expect(res.body.error).toBe('Please enter your current password to set a new one.');
    });

    it('should reject password update if current verification password does not match hash', async () => {
        const res = await request(app)
            .put(`/api/accounts/${testUserId}`)
            .send({
                username: uniqueUsername,
                email: uniqueEmail,
                currentPassword: 'wrongPasswordAttempt', // Invalid password payload
                newPassword: 'myBrandNewPassword123'
            });

        expect(res.statusCode).toEqual(400);
        expect(res.body.error).toBe('Incorrect current password');
    });

    it('Should update and re-hash password successfully given correct verification keys', async ()=> {
        const freshPassword= 'superSecretNewPassword999';
        const res= await request(app)
            .put(`/api/accounts/${testUserId}`)
            .send({
                username: uniqueUsername, 
                email: uniqueEmail, 
                currentPassword: basePassword, 
                newPassword: freshPassword
            }); 
        expect(res.statusCode).toEqual(200);
        const dbCheck= await db.query('SELECT password FROM account WHERE user_id = $1', [testUserId]);
        const isMatch = await bcrypt.compare(freshPassword, dbCheck.rows[0].password);
        expect(isMatch).toBe(true);
    });

    

    it('Should remove account and self-destruct account space completely on delete request', async ()=>{
        const saltRounds= 10; 
        const hashPassword= await bcrypt.hash(basePassword, saltRounds);
        const disposableUsername= 'DeleteMe_' + Date.now(); 
        const disposableEmail= `delete_${Date.now()}@gmail.com`; 
        const setupRes= await db.query(
            `INSERT INTO account (username, password, email, created_on)
            VALUES ($1, $2, $3, NOW()) RETURNING user_id`, 
            [disposableUsername, hashPassword, disposableEmail]
        )
        const targetDeleteId= setupRes.rows[0].user_id; 
        const res= await request(app) 
            .delete(`/api/accounts/${targetDeleteId}`); 
        expect(res.statusCode).toEqual(200); 
        expect(res.body.message).toBe('Account deleted successfully'); 
        expect(res.body.deleted.user_id).toEqual(targetDeleteId); 

        const dbVerify = await db.query('SELECT * FROM account WHERE user_id = $1', [targetDeleteId]);
        expect(dbVerify.rows.length).toEqual(0);
    })



    

});
