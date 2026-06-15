const db = require('../config/db'); 

console.log('in here')
const getPersonalLedger = async (req, res) => {
    const { userId } = req.params; 
    try {
        const queryText = `
                SELECT
                    b.bill_id,
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
                    OR (bs.debtor_user_id = $1 AND bs.payment_status = 'paid')

                ORDER BY b.bill_date DESC;
            `;
                    
        const response = await db.query(queryText, [userId]);
        res.json(response.rows);
    } catch (err) {
        console.error(err); 
        res.status(500).json({error: 'Server error cannot get transaction history'}); 
    }
    
}

module.exports = { getPersonalLedger }