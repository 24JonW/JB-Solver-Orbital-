import { useState, useEffect } from 'react';
import axios from 'axios';
import { X } from 'lucide-react';

function SmartSplitCalculator({
  show,
  onClose,
  selectedGroup,
  currentUser,
  groupMembers
}) {
  const [billData, setBillData] = useState({
    description: '',
    category: 'Food',
    currency: 'SGD',
    splitMethod: 'equal',
    gst: 0,
    tax: 0,
    sharedCost: 0
  });

  const [payers, setPayers] = useState([]);
  const [individualItems, setIndividualItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [billTransactions, setBillTransactions] = useState([]);

  useEffect(() => {
    if (!groupMembers || groupMembers.length === 0) return;
    
    setPayers(
      groupMembers.map(member => ({
        userId: member.user_id,
        username: member.username,
        paid: 0
      }))
    );

    setIndividualItems(
      groupMembers.map(member => ({
        userId: member.user_id,
        username: member.username,
        itemCost: 0
      }))
    );
  }, [groupMembers]);

  if (!show) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setBillData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const updatePayerAmount = (userId, amount) => {
    setPayers(prev =>
      prev.map(p =>
        p.userId === userId ? { ...p, paid: Number(amount) } : p
      )
    );
  };

  const updateItemAmount = (userId, amount) => {
    setIndividualItems(prev =>
      prev.map(item =>
        item.userId === userId ? { ...item, itemCost: Number(amount) } : item
      )
    );
  };

  // Calculations
  const subtotalPaid = payers.reduce((sum, p) => sum + Number(p.paid || 0), 0);
  const gstAmount = subtotalPaid * (Number(billData.gst || 0) / 100);
  const taxAmount = subtotalPaid * (Number(billData.tax || 0) / 100);
  const finalAmount = subtotalPaid + gstAmount + taxAmount;

  const submitBill = async () => {
    try {
      const activePayers = payers.filter(p => p.paid > 0);

      if (activePayers.length === 0) {
        alert('At least one payer is required.');
        return;
      }

      if (!billData.description.trim()) {
        alert('Please enter a description.');
        return;
      }

      setLoading(true);

      const response = await axios.post(
        'http://localhost:5001/api/bills/split_smart',
        {
          groupId: selectedGroup.group_id,
          description: billData.description,
          category: billData.category,
          currency: billData.currency,
          splitMethod: billData.splitMethod,
          payers: activePayers,
          individualItems: individualItems.filter(item => item.itemCost > 0),
          sharedCost: Number(billData.sharedCost || 0)
        }
      );
      setBillTransactions(response.data.transactions);
      alert(`Bill created successfully!\n${response.data.settlementsGenerated} settlement(s) generated`);
      
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || 'Failed to create smart split');
    } finally {
      setLoading(false);
    }
  }; 

  const sendBillSummaryToGroup = async () => {
    if (billTransactions.length === 0) {
        alert('Create the bill first');
        return; 
    }
    try {
        let summary = `💰 Bill Summary\n` + `${billData.description}\n\n`;
        billTransactions.forEach(tx => {
            const debtor = groupMembers.find(m => m.user_id == tx.debtorId); 
            const creditor = groupMembers.find(m => m.user_id == tx.creditorId); 
            summary += `${debtor?.username} owes ${creditor?.username} ${billData.currency} ${Number(tx.amount).toFixed(2)}\n`; 
        });

        await axios.post(
            'http://localhost:5001/api/groups/message', 
            {
                groupId: selectedGroup.group_id, 
                senderId: currentUser.user_id, 
                messageText: summary
            }
        );
        alert('Bill summary sent. '); 
        onClose();
    } catch (err) {
        console.error(err); 
        alert('Failed to send bill summary. '); 
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        
        <div className="modal-header">
          <h3>Smart Bill Splitter</h3>
          <button className="close-modal-btn" onClick={onClose}>
            <X size={20}/>
          </button>
        </div>

        <div className="modal-body">
          <form className="calculator-form" onSubmit={(e) => e.preventDefault()}>
            
            <label>Description</label>
            <input
              type="text"
              name="description"
              value={billData.description}
              onChange={handleChange}
              placeholder="Dinner at Marina Bay Sands"
            />
            <br />

            <label>Category</label>
            <select name="category" value={billData.category} onChange={handleChange}>
              <option value="Food">Food</option>
              <option value="Transport">Transport</option>
              <option value="Accommodation">Accommodation</option>
              <option value="Travel">Travel</option>
              <option value="Shopping">Shopping</option>
              <option value="Entertainment">Entertainment</option>
              <option value="Healthcare">Healthcare</option>
            </select>
            <br />

            <label>Split Method</label>
            <select name="splitMethod" value={billData.splitMethod} onChange={handleChange}>
              <option value="equal">Equal Split</option>
              <option value="proportional">Proportional Split</option>
              <option value="custom">Custom Split</option>
            </select>
            <br />

            <label>Currency</label>
            <select name="currency" value={billData.currency} onChange={handleChange}>
              <option value="SGD">SGD</option>
              <option value="MYR">MYR</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="GBP">GBP</option>
              <option value="RMB">RMB</option>
              <option value="THB">THB</option>
              <option value="IDR">IDR</option>
            </select>
            <br />

            <label>GST (%)</label>
            <input
              type="number"
              min="0"
              max="100"
              step="0.1"
              name="gst"
              value={billData.gst}
              onChange={handleChange}
            />
            <br />

            <label>Additional Tax (%)</label>
            <input
              type="number"
              min="0"
              max="100"
              step="0.1"
              name="tax"
              value={billData.tax}
              onChange={handleChange}
            />
            <hr />

            <h4>Who Paid?</h4>
            {payers.length === 0 ? (
              <p>Loading members profile details...</p>
            ) : (
              payers.map((payer) => (
                <div key={payer.userId} className="payer-row">
                  <span>
                    {payer.username}
                    {currentUser && payer.userId === currentUser.user_id ? ' (You)' : ''}
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={payer.paid}
                    placeholder="0.00"
                    onChange={(e) => updatePayerAmount(payer.userId, e.target.value)}
                  />
                </div>
              ))
            )}
            <hr />

            {billData.splitMethod === 'proportional' && (
              <>
                <h4>Individual Orders</h4>
                <p>Enter what each member personally consumed.</p>
                {individualItems.map(item => (
                  <div key={item.userId} className="payer-row">
                    <span>{item.username}</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.itemCost}
                      placeholder="0.00"
                      onChange={(e) => updateItemAmount(item.userId, e.target.value)}
                    />
                  </div>
                ))}
              </>
            )}

            {billData.splitMethod === 'custom' && (
              <>
                <h4>Individual Orders</h4>
                <p>Enter what each member personally consumed.</p>
                {individualItems.map(item => (
                  <div key={item.userId} className="payer-row">
                    <span>{item.username}</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.itemCost}
                      placeholder="0.00"
                      onChange={(e) => updateItemAmount(item.userId, e.target.value)}
                    />
                  </div>
                ))}
                <hr />
                <h4>Shared Items</h4>
                <p>Example: appetizers, shared fries, group platter, shared drinks</p>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  name="sharedCost"
                  value={billData.sharedCost}
                  onChange={handleChange}
                />
              </>
            )}
            <hr />

            <h4>Bill Summary</h4>
            <p>Subtotal Paid: {billData.currency} {subtotalPaid.toFixed(2)}</p>
            
            <p><strong>Final Bill:</strong> {billData.currency} {finalAmount.toFixed(2)}</p>

            <button type="button" onClick={submitBill} disabled={loading}>
              {loading ? 'Calculating...' : 'Create Smart Split'}
            </button>
            <button type='button' onClick={sendBillSummaryToGroup}>Send bill summary to group</button>
          </form>
        </div>

      </div>
    </div>
  );
}

export default SmartSplitCalculator;
/*
<SmartSplitCalculator
  show={showCalculatorModal}
  onClose={() => setShowCalculatorModal(false)}
  selectedGroup={selectedGroup}
  currentUser={currentUser}
  groupMembers={groupMembers}
/>

*/

