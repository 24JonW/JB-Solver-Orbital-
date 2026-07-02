const db = require('../config/db');
// Import the mathematical settlement splitting engine utility function
const { calculateSmartSplit } = require('../utils/billCalculator');

// Creates a bill entry, applies tax/currency conversions, and generates split transaction shares
// POST /api/bills/split_smart
const createSmartBill = async (req, res) => {
    const { 
        groupId, 
        description, 
        category, 
        currency, 
        targetCurrency, 
        currencyRate,
        splitMethod,     
        payers,          
        individualItems, 
        sharedCost,
        gst = 0,
        tax = 0
    } = req.body;

    try {
        const hasNegatives = payers.some(p => parseFloat(p.paid || 0) < 0); 
        if (hasNegatives) {
            return res.status(400).json({error: 'negative money paid is not allowed'}); 
        }
        // Establish the primary payer identity
        const primaryPayerId = payers[0].userId; 

        // Calculate the total bill from values provided
        const subtotalAmount = payers.reduce((sum, p) => sum + parseFloat(p.paid || 0), 0);
        const gstTotal = subtotalAmount * (parseFloat(gst) / 100);
        const taxTotal = subtotalAmount * (parseFloat(tax) / 100);
        const TotalAmount = subtotalAmount + gstTotal + taxTotal; // Total bill in original currency
        // Handle conversion multipliers gracefully (fallback to baseline 1.0 factor)
        const rateFactor= parseFloat(currencyRate || 1.0) 
        const grandTotalAmount= TotalAmount*rateFactor; // Final bill amount converted entirely into the target settlement currency


        // Insert primary bill details to the database
        const billResult = await db.query(
            `INSERT INTO Bills (group_id, payer_user_id, description, category, total_amount, currency, target_currency, exchange_rate) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING bill_id`,
            [groupId, primaryPayerId, description, category, grandTotalAmount, currency, targetCurrency || currency, parseFloat(currencyRate || 1.0)]
        ); // return bill_id after inserting table
        const billId = billResult.rows[0].bill_id; 

        // Adjust user data arrays to pass to the processing engine with tax weight distribution
        const adjustedPayers = payers.map(p => ({
            userId: p.userId,
            paid: p.paid * rateFactor // raw cash inputs used to determine credit
        })); // to insert into calculateSmartBills function 

        let adjustedIndividualItems = []; // to insert into calculateSmartBills function 
        let adjustedSharedCost = 0; // to insert into calculateSmartBills function 

        // Establish structural ratio scales to distribute tax/GST weights down onto items proportionally
        const convertedSubtotal = subtotalAmount * rateFactor;
        const compositeRatioFactor = convertedSubtotal > 0 ? (grandTotalAmount / convertedSubtotal) : 1;

        // Apply mathematical splits based on selected distribution mode conditions
        if (splitMethod === 'equal') {
            // Equal weights will be handled by internal engine conditions using grandTotalAmount
            adjustedSharedCost = 0; 
        } else if (splitMethod === 'proportional') {
            // Convert individual values and add distributed tax weight ratios
            adjustedIndividualItems = individualItems.map(i => ({
                userId: i.userId,
                itemCost: i.itemCost * compositeRatioFactor * rateFactor
            }));
        } else if (splitMethod === 'custom') {
            // Convert and weight balance attributes for both individual orders and shared costs
            adjustedIndividualItems = individualItems.map(i => ({
                userId: i.userId,
                itemCost: i.itemCost * compositeRatioFactor * rateFactor
            }));
            adjustedSharedCost = sharedCost * compositeRatioFactor * rateFactor;
        }
        // Get all members of the group to pass to the engine
        const membersRes = await db.query('SELECT user_id FROM group_members WHERE group_id = $1', [groupId]);
        const totalGroupMembers = membersRes.rows.map(m => m.user_id); // to insert into calculateSmartBills function 

        // Run Settle Algorithm Engine
        const paymentTransactions = calculateSmartSplit({
            splitMethod,
            payers: adjustedPayers,
            individualItems: splitMethod === 'equal' ? [] : adjustedIndividualItems,
            sharedCost: splitMethod === 'custom' ? adjustedSharedCost : (splitMethod === 'equal' ? grandTotalAmount : 0),
            totalGroupMembers
        });

        // Bulk insert transaction maps into Bill_Shares table
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

// Retrieves all split transaction debt shares for a group 
// Route: GET /api/bills/ledger/:groupId
const getGroupLedger = async (req, res) => {
    const { groupId } = req.params;
    try {
        const result = await db.query(
            `SELECT bs.*, b.description, b.currency, b.target_currency, b.exchange_rate,
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

// Updates a target share debt transaction line status indicator to 'paid'
// Route: POST /api/bills/settle-share
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

// Deletes payment history logs by wiping out all settled transactions for a target group room
// Route: POST /api/bills/clear-history
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

// Homepage: Gathers all unpaid debt share entities across all groups where a specific user is the debtor
// Route: GET /api/bills/outstanding/:userId
const getOutstandingPayments = async (req, res) => {
    const {userId}= req.params; 
    try {
        const result= await db.query(
            `SELECT bs.*, b.description, b.currency, b.target_currency, b.exchange_rate, d.username AS debtor_name, c.username AS creditor_name
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

const clearBulkPayments = async (req, res) => {
    const { debtorId, creditorId } = req.body;
    try {
        await db.query(
            `UPDATE Bill_Shares 
             SET payment_status = 'paid', paid_at = NOW() 
             WHERE debtor_user_id = $1 AND creditor_user_id = $2 AND payment_status = 'unpaid'`,
            [debtorId, creditorId]
        );
        res.json({ message: 'All outstanding balances settled with this user!' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to clear bulk ledger balances' });
    }
};

module.exports = { createSmartBill, getGroupLedger, clearSharePayment, clearPaidHistory, getOutstandingPayments, clearBulkPayments};

