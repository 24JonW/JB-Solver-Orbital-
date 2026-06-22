const db = require('../config/db'); 

console.log('in here')
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
                        -- User is a debtor
                        WHEN b.payer_user_id != $1 THEN bs.amount_owed

                        -- User is the payer
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

                LEFT JOIN bill_shares bs
                    ON b.bill_id = bs.bill_id  
                WHERE
                    b.payer_user_id = $1
                    OR (bs.debtor_user_id = $1)

                ORDER BY b.bill_date DESC;
            `;
                    
        const response = await db.query(queryText, [userId]);
        res.json(response.rows);
    } catch (err) {
        console.error(err); 
        res.status(500).json({error: 'Server error cannot get transaction history'}); 
    }
    
}

const createPersonalExpense = async (req, res) => {
    const { payer_user_id, description, category, bill_date, total_amount, currency } = req.body;
    
    try {
        const queryText = `
            INSERT INTO bills (
                group_id, 
                payer_user_id, 
                description, 
                category, 
                bill_date, 
                total_amount, 
                currency
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *, total_amount AS net_amount; 
            -- We alias total_amount as net_amount so the frontend charts read it properly instantly!
        `;
        
        const values = [null, payer_user_id, description, category, bill_date, total_amount, currency];
        const response = await db.query(queryText, values);
        
        // Return the saved transaction back to the frontend
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
        res.status(200).json({message: 'Tranasaction record successfully deleted'}); 
    } catch (err) {
        console.error(err); 
        res.status(500).json({ error: 'Database server failed to erase transaction row.'}); 
    }
}
module.exports = { getPersonalLedger, createPersonalExpense, deleteTransactionRecord}; 