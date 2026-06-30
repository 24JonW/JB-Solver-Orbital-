const db = require('../config/db'); 

const getPersonalLedger = async (req, res) => {
    const { userId } = req.params; 
    try {
        const queryText = `
                SELECT
                    b.bill_id AS bill_id,
                    b.description,
                    b.category,
                    b.currency,
                    b.bill_date,
                    CASE
                        WHEN b.payer_user_id != $1 THEN bs.amount_owed
                        ELSE b.total_amount - COALESCE(
                            (
                                SELECT SUM(sub_bs.amount_owed)
                                FROM bill_shares sub_bs
                                WHERE sub_bs.bill_id = b.bill_id
                                AND sub_bs.debtor_user_id != $1
                                AND sub_bs.payment_status = 'paid'
                            ),
                            0
                        )
                    END AS net_amount,
                    CASE
                        WHEN b.payer_user_id = $1 THEN 'payer'
                        ELSE 'debtor'
                    END AS role,
                    bs.payment_status
                FROM bills b
                LEFT JOIN bill_shares bs ON b.bill_id = bs.bill_id  
                WHERE b.payer_user_id = $1 OR (bs.debtor_user_id = $1)
                ORDER BY b.bill_date DESC;
            `;
        const response = await db.query(queryText, [userId]);
        res.json(response.rows);
    } catch (err) {
        console.error(err); 
        res.status(500).json({error: 'Server error cannot get transaction history'}); 
    }
};

const createPersonalExpense = async (req, res) => {
    const { payer_user_id, description, category, bill_date, total_amount, currency } = req.body;
    try {
        const queryText = `
            INSERT INTO bills (group_id, payer_user_id, description, category, bill_date, total_amount, currency)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *, total_amount AS net_amount; 
        `;
        const values = [null, payer_user_id, description, category, bill_date, total_amount, currency];
        const response = await db.query(queryText, values);
        res.status(210).json(response.rows[0]);
    } catch (err) {
        console.error("Database insert error:", err);
        res.status(500).json({ error: 'Server error, could not save personal expenditure.' });
    }
};

const deleteTransactionRecord = async (req, res) => {
    const { billId } = req.params; 
    try {
        await db.query(`DELETE FROM bills WHERE bill_id = $1`, [billId]);
        res.status(200).json({message: 'Transaction record successfully deleted'}); 
    } catch (err) {
        console.error(err); 
        res.status(500).json({ error: 'Database server failed to erase transaction row.'}); 
    }
};

const setMonthlyBudget = async (req, res) => {
    const { user_id, budget_amount, budget_month } = req.body;
    try {
        const queryText = `
            INSERT INTO budgets (user_id, budget_amount, budget_month)
            VALUES ($1, $2, $3)
            ON CONFLICT (user_id, budget_month) 
            DO UPDATE SET budget_amount = EXCLUDED.budget_amount
            RETURNING *;
        `;
        const values = [user_id, budget_amount, budget_month];
        const response = await db.query(queryText, values);
        res.status(200).json(response.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error, could not save budget.' });
    }
};

const getMonthlyBudget = async (req, res) => {
    const { userId, monthStr } = req.params;
    try {
        const queryText = `SELECT budget_amount FROM budgets WHERE user_id = $1 AND budget_month = $2`;
        const response = await db.query(queryText, [userId, monthStr]);
        if (response.rows.length > 0) {
            res.json({ budget_amount: response.rows[0].budget_amount });
        } else {
            res.json({ budget_amount: 0 }); 
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error, could not fetch budget.' });
    }
};

module.exports = { getPersonalLedger, createPersonalExpense, deleteTransactionRecord, setMonthlyBudget, getMonthlyBudget };