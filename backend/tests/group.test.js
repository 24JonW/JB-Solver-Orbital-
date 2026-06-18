const request = require('supertest'); 
const app = require('../server');
const db = require('../config/db');

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

    it('cannot that join group with group id that does not exist', async () => {
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


