const db = require('../config/db');
const { calculateSmartSplit } = require('../utils/billCalculator');

const createSmartBill = async (req, res) => {
    const { 
        groupId, 
        description, 
        category, 
        currency, 
        splitMethod,     
        payers,          
        individualItems, 
        sharedCost,
        gst = 0,
        tax = 0
    } = req.body;

    try {
        
        // 1. Save the primary bill tracker into database
        const primaryPayerId = payers[0].userId; // to insert bills table in database

        // 2. Calculate the total bill from values provided
        const subtotalAmount = payers.reduce((sum, p) => sum + parseFloat(p.paid || 0), 0);
        const gstTotal = subtotalAmount * (parseFloat(gst) / 100);
        const taxTotal = subtotalAmount * (parseFloat(tax) / 100);
        const grandTotalAmount = subtotalAmount + gstTotal + taxTotal; // to insert bills table in database 

        
        const billResult = await db.query(
            `INSERT INTO Bills (group_id, payer_user_id, description, category, total_amount, currency) 
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING bill_id`,
            [groupId, primaryPayerId, description, category, grandTotalAmount, currency]
        ); // return bill_id after inserting table
        const billId = billResult.rows[0].bill_id; 

        // 3. Adjust user data arrays to pass to the processing engine with tax weight distribution
        const adjustedPayers = payers.map(p => ({
            userId: p.userId,
            paid: p.paid // raw cash inputs used to determine credit
        })); // to insert into calculateSmartBills function 

        let adjustedIndividualItems = []; // to insert into calculateSmartBills function 
        let adjustedSharedCost = 0; // to insert into calculateSmartBills function 

        const compositeRatioFactor = subtotalAmount > 0 ? (grandTotalAmount / subtotalAmount) : 1;

        if (splitMethod === 'equal') {
            // Equal weights will be handled by internal engine conditions using grandTotalAmount
            adjustedSharedCost = 0; 
        } else if (splitMethod === 'proportional') {
            adjustedIndividualItems = individualItems.map(i => ({
                userId: i.userId,
                itemCost: i.itemCost * compositeRatioFactor
            }));
        } else if (splitMethod === 'custom') {
            adjustedIndividualItems = individualItems.map(i => ({
                userId: i.userId,
                itemCost: i.itemCost * compositeRatioFactor
            }));
            adjustedSharedCost = sharedCost * compositeRatioFactor;
        }
        // 4. Get all members of the group to pass to the engine
        const membersRes = await db.query('SELECT user_id FROM group_members WHERE group_id = $1', [groupId]);
        const totalGroupMembers = membersRes.rows.map(m => m.user_id); // to insert into calculateSmartBills function 

        // 5. Run Settle Algorithm Engine
        const paymentTransactions = calculateSmartSplit({
            splitMethod,
            payers: adjustedPayers,
            individualItems: splitMethod === 'equal' ? [] : adjustedIndividualItems,
            sharedCost: splitMethod === 'custom' ? adjustedSharedCost : (splitMethod === 'equal' ? grandTotalAmount : 0),
            totalGroupMembers
        });
        /* paymentTransactions = 
        {
            debtorId: debtor.userId,
            creditorId: creditor.userId,
            amount: parseFloat(settlementAmount.toFixed(2))
        } */ 

        // 6. Bulk insert transaction maps into Bill_Shares table
        for (let tx of paymentTransactions) {
            await db.query(
                `INSERT INTO Bill_Shares (bill_id, debtor_user_id, creditor_user_id, amount_owed, payment_status) 
                 VALUES ($1, $2, $3, $4, 'unpaid')`,
                [billId, tx.debtorId, tx.creditorId, tx.amount]
            );
        }

        res.status(201).json({ 
            message: 'Smart split processed cleanly!', 
            billId, 
            settlementsGenerated: paymentTransactions.length,
            transactions: paymentTransactions // Return transactions array back to client side mapping
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server failed to calculate and save smart split.' });
    }
};

const getGroupLedger = async (req, res) => {
    const { groupId } = req.params;
    try {
        const result = await db.query(
            `SELECT bs.*, b.description, b.currency,
                    d.username AS debtor_name, c.username AS creditor_name
             FROM Bill_Shares bs
             JOIN Bills b ON bs.bill_id = b.bill_id
             JOIN account d ON bs.debtor_user_id = d.user_id
             JOIN account c ON bs.creditor_user_id = c.user_id
             WHERE b.group_id = $1
             ORDER BY bs.payment_status DESC, bs.share_id DESC`,
            [groupId]
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error retrieving group ledger' });
    }
};

const getOutstandingPayments = async (req, res) => {
    const {userId}= req.params; 
    try {
        const result= await db.query(
            `SELECT bs.*, b.description, b.currency, d.username AS debtor_name, c.username AS creditor_name
            FROM bill_shares bs 
            JOIN bills b ON bs.bill_id = b.bill_id
            JOIN account d ON bs.debtor_user_id = d.user_id
            JOIN account c ON bs.creditor_user_id= c.user_id
            WHERE bs.debtor_user_id = $1 AND bs.payment_status= 'unpaid'
            ORDER BY b.bill_date DESC`, 
            [userId]
        )
        res.json(result.rows);

    } catch (err) {
        console.error(err); 
        res.status(500).json({error: 'Server error retrieving outstanding payments'});
    }
}

const clearSharePayment = async (req, res) => {
    const { shareId } = req.body;
    try {
        await db.query(
            `UPDATE Bill_Shares SET payment_status = 'paid', paid_at = NOW() WHERE share_id = $1`,
            [shareId]
        );
        res.json({ message: 'Payment settled!' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to update ledger balance' });
    }
};


const clearPaidHistory = async (req, res) => {
    const { groupId } = req.body; 
    try {
        await db.query(
                `DELETE FROM Bill_Shares WHERE payment_status = 'paid' AND bill_id IN (SELECT bill_id FROM Bills WHERE group_id = $1)`, [groupId]); 
        res.json({
            message: 'Paid history cleared successfully'
        }); 
    } catch (err) {
        console.error(err); 
        res.status(500).json({
            error: 'Failed to clear paid history'
        }); 
    }
}

module.exports = { createSmartBill, getGroupLedger, getOutstandingPayments , clearSharePayment, clearPaidHistory};

/*
const db = require('../config/db');
const { calculateSmartSplit } = require('../utils/billCalculator');

const createSmartBill = async (req, res) => {
    const { 
        groupId, 
        description, 
        category, 
        currency, 
        splitMethod,     
        payers,          
        individualItems, 
        sharedCost,
        gst = 0,
        tax = 0
    } = req.body;

    try {
        // 1. Get all members of the group to pass to the engine
        const membersRes = await db.query('SELECT user_id FROM group_members WHERE group_id = $1', [groupId]);
        const totalGroupMembers = membersRes.rows.map(m => m.user_id);

        // 2. Calculate the total bill from values provided
        const subtotalAmount = payers.reduce((sum, p) => sum + parseFloat(p.paid || 0), 0);
        const gstTotal = subtotalAmount * (parseFloat(gst) / 100);
        const taxTotal = subtotalAmount * (parseFloat(tax) / 100);
        const grandTotalAmount = subtotalAmount + gstTotal + taxTotal;

        // 3. Save the primary bill tracker into database
        const primaryPayerId = payers[0].userId;
        const billResult = await db.query(
            `INSERT INTO Bills (group_id, payer_user_id, description, category, total_amount, currency) 
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING bill_id`,
            [groupId, primaryPayerId, description, category, grandTotalAmount, currency]
        );
        const billId = billResult.rows[0].bill_id;

        // 4. Adjust user data arrays to pass to the processing engine with tax weight distribution
        const adjustedPayers = payers.map(p => ({
            userId: p.userId,
            paid: p.paid // raw cash inputs used to determine credit
        }));

        let adjustedIndividualItems = [];
        let adjustedSharedCost = 0;

        const compositeRatioFactor = subtotalAmount > 0 ? (grandTotalAmount / subtotalAmount) : 1;

        if (splitMethod === 'equal') {
            // Equal weights will be handled by internal engine conditions using grandTotalAmount
            adjustedSharedCost = 0; 
        } else if (splitMethod === 'proportional') {
            adjustedIndividualItems = individualItems.map(i => ({
                userId: i.userId,
                itemCost: i.itemCost * compositeRatioFactor
            }));
        } else if (splitMethod === 'custom') {
            adjustedIndividualItems = individualItems.map(i => ({
                userId: i.userId,
                itemCost: i.itemCost * compositeRatioFactor
            }));
            adjustedSharedCost = sharedCost * compositeRatioFactor;
        }

        // 5. Run Settle Algorithm Engine
        const paymentTransactions = calculateSmartSplit({
            splitMethod,
            payers: adjustedPayers,
            individualItems: splitMethod === 'equal' ? [] : adjustedIndividualItems,
            sharedCost: splitMethod === 'custom' ? adjustedSharedCost : (splitMethod === 'equal' ? grandTotalAmount : 0),
            totalGroupMembers
        });

        // 6. Bulk insert transaction maps into Bill_Shares table
        for (let tx of paymentTransactions) {
            await db.query(
                `INSERT INTO Bill_Shares (bill_id, debtor_user_id, creditor_user_id, amount_owed, payment_status) 
                 VALUES ($1, $2, $3, $4, 'unpaid')`,
                [billId, tx.debtorId, tx.creditorId, tx.amount]
            );
        }

        res.status(201).json({ 
            message: 'Smart split processed cleanly!', 
            billId, 
            settlementsGenerated: paymentTransactions.length,
            transactions: paymentTransactions // Return transactions array back to client side mapping
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server failed to calculate and save smart split.' });
    }
};

const getGroupLedger = async (req, res) => {
    const { groupId } = req.params;
    try {
        const result = await db.query(
            `SELECT bs.*, b.description, b.currency,
                    d.username AS debtor_name, c.username AS creditor_name
             FROM Bill_Shares bs
             JOIN Bills b ON bs.bill_id = b.bill_id
             JOIN account d ON bs.debtor_user_id = d.user_id
             JOIN account c ON bs.creditor_user_id = c.user_id
             WHERE b.group_id = $1
             ORDER BY bs.payment_status DESC, bs.share_id DESC`,
            [groupId]
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error retrieving group ledger' });
    }
};

const clearSharePayment = async (req, res) => {
    const { shareId } = req.body;
    try {
        await db.query(
            `UPDATE Bill_Shares SET payment_status = 'paid', paid_at = NOW() WHERE share_id = $1`,
            [shareId]
        );
        res.json({ message: 'Payment settled!' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to update ledger balance' });
    }
};

module.exports = { createSmartBill, getGroupLedger, clearSharePayment };


*/