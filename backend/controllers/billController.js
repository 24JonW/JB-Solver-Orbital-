const db = require('../config/db');
// Import the mathematical settlement splitting engine utility function
const { calculateSmartSplit } = require('../utils/billCalculator');

// Creates a bill entry, applies tax/currency conversions, and generates split transaction shares
// POST /api/bills/split_smart
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
        tax = 0,
        dryRun = false // 👈 Added dryRun parameter default to false
    } = req.body;

    try {
        const hasNegatives = payers.some(p => parseFloat(p.paid || 0) < 0); 
        if (hasNegatives) {
            return res.status(400).json({error: 'negative money paid is not allowed'}); 
        }
        const primaryPayerId = payers[0].userId; 

        const subtotalAmount = payers.reduce((sum, p) => sum + parseFloat(p.paid || 0), 0);
        const gstTotal = subtotalAmount * (parseFloat(gst) / 100);
        const taxTotal = subtotalAmount * (parseFloat(tax) / 100);
        const TotalAmount = subtotalAmount + gstTotal + taxTotal; 
        const rateFactor = parseFloat(currencyRate || 1.0); 
        const grandTotalAmount = TotalAmount * rateFactor; 

        const convertedSubtotal = subtotalAmount * rateFactor;
        const compositeRatioFactor = convertedSubtotal > 0 ? (grandTotalAmount / convertedSubtotal) : 1;

        const adjustedPayers = payers.map(p => ({
            userId: p.userId,
            paid: p.paid * rateFactor * compositeRatioFactor
        })); 

        let adjustedIndividualItems = []; 
        let adjustedSharedCost = 0; 

        if (splitMethod === 'equal') {
            adjustedSharedCost = 0; 
        } else if (splitMethod === 'proportional') {
            adjustedIndividualItems = individualItems.map(i => ({
                userId: i.userId,
                itemCost: i.itemCost * compositeRatioFactor * rateFactor
            }));
        } else if (splitMethod === 'custom') {
            adjustedIndividualItems = individualItems.map(i => ({
                userId: i.userId,
                itemCost: i.itemCost * compositeRatioFactor * rateFactor
            }));
            adjustedSharedCost = sharedCost * compositeRatioFactor * rateFactor;
        }

        const membersRes = await db.query('SELECT user_id FROM group_members WHERE group_id = $1', [groupId]);
        const totalGroupMembers = membersRes.rows.map(m => m.user_id); 

        // Run Settle Algorithm Engine
        const paymentTransactions = calculateSmartSplit({
            splitMethod,
            payers: adjustedPayers,
            individualItems: splitMethod === 'equal' ? [] : adjustedIndividualItems,
            sharedCost: splitMethod === 'custom' ? adjustedSharedCost : (splitMethod === 'equal' ? grandTotalAmount : 0),
            totalGroupMembers
        });

        // If dryRun is true, stop here and return calculations without DB writes
        if (dryRun) {
            return res.status(200).json({ 
                message: 'Dry run calculated successfully!', 
                settlementsGenerated: paymentTransactions.length,
                transactions: paymentTransactions 
            });
        }

        // Otherwise, save to Database
        const billResult = await db.query(
            `INSERT INTO Bills (group_id, payer_user_id, description, category, total_amount, currency, target_currency, exchange_rate) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING bill_id`,
            [groupId, primaryPayerId, description, category, grandTotalAmount, currency, targetCurrency || currency, parseFloat(currencyRate || 1.0)]
        ); 
        const billId = billResult.rows[0].bill_id; 

        for (let tx of paymentTransactions) {
            await db.query(
                `INSERT INTO Bill_Shares (bill_id, debtor_user_id, creditor_user_id, amount_owed, payment_status) 
                 VALUES ($1, $2, $3, $4, 'unpaid')`,
                [billId, tx.debtorId, tx.creditorId, tx.amount]
            );
        }

        res.status(201).json({ 
            message: 'Smart split processed cleanly and saved!', 
            billId, 
            settlementsGenerated: paymentTransactions.length,
            transactions: paymentTransactions 
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

const getReceivablesPayments= async (req, res)=> {
    const {userId} = req.params; 
    try {
        const result= await db.query(
            `SELECT * FROM people_who_owe_me WHERE creditor_user_id= $1`, [userId]
        );
        res.json(result.rows)
    } catch (err) {
        console.error(err); 
        res.status(500).json({error: 'Server error retrieving receivables history data'})
    }
}

const triggerChasePayment= async (req, res) => {
    const {creditorId, creditorName, debtorId, debtorUsername, debtorEmail, amountOwed} = req.body; 
    
    try {
        const mutualGroupResult= await db.query(
            `SELECT gm1.group_id
            FROM group_members gm1 
            JOIN group_members gm2 ON gm1.group_id = gm2.group_id
            WHERE gm1.user_id= $1 AND gm2.user_id = $2
            LIMIT 1`, 
            [creditorId, debtorId]
        )
        let targetGroupId; 
        if (mutualGroupResult.rows.length >0) {
            targetGroupId= mutualGroupResult.rows[0].group_id; 
        } else {
            return res.status(404).json({error: 'No mutual community group found between users. '});
        }
        const reminderText= `Payment reminder: @${debtorUsername}, you still have an outstanding balance of SGD $${amountOwed} with me. Please settle it when you are free!`; 
        await db.query(
            `INSERT INTO group_messages (sender_id, group_id, message_text, sent_at)
             VALUES ($1, $2, $3, NOW())`, 
            [creditorId, targetGroupId, reminderText]
        );

        const resendResponse = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.RESEND_API_KEY}`, 
                'Content-Type': 'application/json'
            }, 
            body: JSON.stringify({
                // Important: When using Resend's free tier without a custom domain, 
                // you MUST use 'onboarding@resend.dev' as the sender address.
                from: "JBSolver <onboarding@resend.dev>",
                to: [debtorEmail], 
                subject: `⚠️ Balance Settlement Reminder from ${creditorName}`,
                html: `
                  <div style="font-family: sans-serif; padding: 20px; color: #333; max-width: 600px; border: 1px solid #eee; border-radius: 12px;">
                    <h2 style="color: #21498a;">Hi ${debtorUsername},</h2>
                    <p>This is an automated reminder from your assistant app <strong>JBSolver</strong>.</p>
                    <p><strong>${creditorName}</strong> has requested settlement for an outstanding balance of:</p>
                    <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0; font-size: 18px; font-weight: bold; color: #dc2626;">
                      SGD ${amountOwed}
                    </div>
                    <p>Please log in to your dashboard to reconcile and settle this bill share.</p>
                    <hr style="border: none; border-top: 1px solid #eee; margin-top: 30px;" />
                    <small style="color: #999;">If you've already transferred the funds, please follow up with ${creditorName} to update the tracking state.</small>
                  </div>
                `
            })
        }); 
        const resendData= await resendResponse.json(); 
        if (!resendResponse.ok) {
            console.error("Resend API Error details:", resendData);
            // Don't crash the request if the email fails, since the chat insert succeeded
        }

        res.json({ 
            message: 'Chase alert message posted to group and real email dispatched!',
            groupIdMatched: targetGroupId 
        });

    } catch (err) {
        console.error(err); 
        res.status(500).json({error: 'Failed to process push/email notifications'})
    }
} 

module.exports = { 
    createSmartBill, 
    getGroupLedger, 
    clearSharePayment, 
    clearPaidHistory, 
    getOutstandingPayments, 
    clearBulkPayments, 
    getReceivablesPayments, 
    triggerChasePayment
};

