

const calculateSmartSplit = ({
    splitMethod,     
    payers,          
    individualItems, 
    sharedCost = 0,  
    totalGroupMembers 
}) => {

    const balances = {};
    
    totalGroupMembers.forEach(memberId => {
        balances[memberId] = 0;
    });

    // ROUND 1: Subtract what people paid (Credit them)
    payers.forEach(payer => {
        balances[payer.userId] -= parseFloat(payer.paid || 0);
    });

    // ROUND 2 & 3: Distribute obligations based on method selection
    if (splitMethod === 'equal') {
        // If the controller passed grandTotal via sharedCost parameter
        const totalBill = sharedCost > 0 ? sharedCost : payers.reduce((sum, p) => sum + parseFloat(p.paid || 0), 0);
        const perPersonShare = totalBill / totalGroupMembers.length;

        totalGroupMembers.forEach(memberId => {
            balances[memberId] += perPersonShare;
        });

    } else if (splitMethod === 'proportional') {
        individualItems.forEach(item => {
            balances[item.userId] += parseFloat(item.itemCost || 0);
        });

    } else if (splitMethod === 'custom') {
        const perPersonSharedPool = parseFloat(sharedCost || 0) / totalGroupMembers.length;

        totalGroupMembers.forEach(memberId => {
            balances[memberId] += perPersonSharedPool;
        });

        individualItems.forEach(item => {
            balances[item.userId] += parseFloat(item.itemCost || 0);
        });
    }

    // ROUND 4: Split into Creditors (Group X) and Debtors (Group Y)
    const groupX = []; 
    const groupY = []; 

    Object.keys(balances).forEach(userId => {
        const netBalance = Math.round(balances[userId] * 100) / 100; 
        
        if (netBalance < 0) {
            groupX.push({ userId: parseInt(userId), amountToReceive: Math.abs(netBalance) });
        } else if (netBalance > 0) {
            groupY.push({ userId: parseInt(userId), amountToPay: netBalance });
        }
    });

    // BUCKET FILLING LOOP
    const transactions = [];
    let xIdx = 0;
    let yIdx = 0;

    while (xIdx < groupX.length && yIdx < groupY.length) {
        const creditor = groupX[xIdx];
        const debtor = groupY[yIdx];

        const settlementAmount = Math.min(creditor.amountToReceive, debtor.amountToPay);

        transactions.push({
            debtorId: debtor.userId,
            creditorId: creditor.userId,
            amount: parseFloat(settlementAmount.toFixed(2))
        });

        creditor.amountToReceive -= settlementAmount;
        debtor.amountToPay -= settlementAmount;

        if (Math.abs(creditor.amountToReceive) < 0.01) xIdx++;
        if (Math.abs(debtor.amountToPay) < 0.01) yIdx++;
    }

    return transactions; 
};

module.exports = { calculateSmartSplit };

/*
const calculateSmartSplit = ({
    splitMethod,     // 'equal', 'proportional', or 'custom'
    payers,          // Array: e.g [{ userId: 1, paid: 180 }, { userId: 2, paid: 100 }]
    individualItems, // Array: e.g [{ userId: 1, itemCost: 70 }] (Used for proportional/custom)
    sharedCost = 0,  // Number: Total cost of shared items (Used for custom split)
    totalGroupMembers // Array of total participants
}) => {

    const balances = {};
    
    // initialise all participants with a 0 balance
    totalGroupMembers.forEach(memberId => {
        balances[memberId] = 0;
    });

    // --- ROUND 1: Subtract what people paid (Credit them) ---
    payers.forEach(payer => {
        balances[payer.userId] -= parseFloat(payer.paid || 0);
    });

    // --- ROUND 2 & 3: Calculate what they owe based on method and add it ---
    if (splitMethod === 'equal') {
        // Find total bill amount from sum of all payments
        const totalBill = payers.reduce((sum, p) => sum + parseFloat(p.paid || 0), 0);
        const perPersonShare = totalBill / totalGroupMembers.length;

        totalGroupMembers.forEach(memberId => {
            balances[memberId] += perPersonShare;
        });

    } else if (splitMethod === 'proportional') {
        // Direct assignment from individual items consumed
        individualItems.forEach(item => {
            balances[item.userId] += parseFloat(item.itemCost || 0);
        });

    } else if (splitMethod === 'custom') {
        // Individual items + an equal share of the shared pool cost
        const perPersonSharedPool = parseFloat(sharedCost || 0) / totalGroupMembers.length;

        totalGroupMembers.forEach(memberId => {
            // Add their share of the shared fries/appetizers
            balances[memberId] += perPersonSharedPool;
        });

        // Add what they personally ordered
        individualItems.forEach(item => {
            balances[item.userId] += parseFloat(item.itemCost || 0);
        });
    }

    // --- ROUND 4: Split into Group X (Creditors) and Group Y (Debtors) ---
    const groupX = []; // Creditors (Negative balance: system owes them back)
    const groupY = []; // Debtors (Positive balance: they must pay into system)

    Object.keys(balances).forEach(userId => {
        const netBalance = Math.round(balances[userId] * 100) / 100; // Round to 2 decimals safely
        
        if (netBalance < 0) {
            groupX.push({ userId: parseInt(userId), amountToReceive: Math.abs(netBalance) });
        } else if (netBalance > 0) {
            groupY.push({ userId: parseInt(userId), amountToPay: netBalance });
        }
    });

    // --- BUCKET FILLING LOOP ---
    const transactions = [];
    let xIdx = 0;
    let yIdx = 0;

    while (xIdx < groupX.length && yIdx < groupY.length) {
        const creditor = groupX[xIdx];
        const debtor = groupY[yIdx];

        // Determine how much can be cleared in this transaction step
        const settlementAmount = Math.min(creditor.amountToReceive, debtor.amountToPay);

        transactions.push({
            debtorId: debtor.userId,
            creditorId: creditor.userId,
            amount: parseFloat(settlementAmount.toFixed(2))
        });

        // Deduct from the "buckets"
        creditor.amountToReceive -= settlementAmount;
        debtor.amountToPay -= settlementAmount;

        // Move to the next person if their bucket is completely satisfied
        if (Math.abs(creditor.amountToReceive) < 0.01) xIdx++;
        if (Math.abs(debtor.amountToPay) < 0.01) yIdx++;
    }

    return transactions; 
    // Returns clean list: [{ debtorId: 3, creditorId: 1, amount: 40 }]
};

module.exports = { calculateSmartSplit };
*/