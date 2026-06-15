import { useState, useEffect } from 'react';
import axios from 'axios';
import { X } from 'lucide-react';
import '../SmartBill.css'; 
// import '../App.css'; 
import { FcCurrencyExchange } from "react-icons/fc";
import { MdCalculate } from "react-icons/md";
import { GrSend } from "react-icons/gr";

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
    gst: 9,
    tax: 0,
    sharedCost: 0
  });

  const [payers, setPayers] = useState([]);
  const [individualItems, setIndividualItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [billTransactions, setBillTransactions] = useState([]);

  //Initialize core currencies 
  const [currencies, setCurrencies]= useState(['SGD', 'MYR', 'USD', 'EUR', 'GBP', 'RMB', 'THB', 'IDR']); 
  const [targetCurrency, setTargetCurrency]= useState('SGD'); 
  const [exchangeRates, setExchangeRates]= useState({}); 


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

  useEffect(()=>{
    const fetchGlobalCurrencies= async ()=> {
      try {
        const response= await axios.get('https://open.er-api.com/v6/latest/USD'); 
        if (response.data && response.data.rates) {
          const currencyCodes= Object.keys(response.data.rates);
          setCurrencies(currencyCodes.sort());
          setExchangeRates(response.data.rates); //store all rates relative to USD 
        }
      } catch (err) {
        console.error("Failed to fetch global currency list API, using local fallbacks:", err);
      }
    }; 
    if (show) {
      fetchGlobalCurrencies(); 
    }

  }, [show])

  if (!show) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setBillData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const updatePayerAmount = (userId, value) => {
    const parsedValue= value === "" ? "": parseFloat(value); 
    setPayers(prev =>
      prev.map(p =>
        p.userId === userId ? { ...p, paid: parsedValue } : p
      )
    );
  };

  const updateItemAmount = (userId, amount) => {
    const parsedValue= amount === "" ? "" : parseFloat(amount); 
    setIndividualItems(prev =>
      prev.map(item =>
        item.userId === userId ? { ...item, itemCost: parsedValue} : item
      )
    );
  };

  // Calculations
  const subtotalPaid = payers.reduce((sum, p) => sum + Number(p.paid || 0), 0);
  const gstAmount = subtotalPaid * (Number(billData.gst || 0) / 100);
  const taxAmount = subtotalPaid * (Number(billData.tax || 0) / 100);
  const baseFinalAmount = subtotalPaid + gstAmount + taxAmount;
  //Account for currency 
  let currencyRate = 1;
  if (exchangeRates[billData.currency] && exchangeRates[targetCurrency]) {
    const baseToUsd = exchangeRates[billData.currency];   // Rate of currency paid in
    const targetToUsd = exchangeRates[targetCurrency];   // Rate of currency converting to
    
    // Cross-multiplication formula
    currencyRate = targetToUsd / baseToUsd; // rate of target currency/ rate of base currency
  }
  const finalAmount= baseFinalAmount*currencyRate;

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
          targetCurrency: targetCurrency,  //newly added
          currencyRate: currencyRate, //newly added
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
            summary += `${debtor?.username} owes ${creditor?.username} ${targetCurrency} ${Number(tx.amount).toFixed(2)}\n`; 
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
            <div className= "descriptionDivision"> 
              <label className= "descriptionLabel">Description: </label>
              
              <input
                  type="text"
                  name="description"
                  value={billData.description}
                  onChange={handleChange}
                  placeholder="Your group expenditure..."
                  className='descriptionInput'
                />
            </div>
            <div className= "categoryDivision"> 
              <label className= "categoryLabel">Category: </label>
              <select name="category" value={billData.category} onChange={handleChange} className= "categoryType">
                <option value="Food">Food</option>
                <option value="Transport">Transport</option>
                <option value="Accommodation">Accommodation</option>
                <option value="Travel">Travel</option>
                <option value="Shopping">Shopping</option>
                <option value="Entertainment">Entertainment</option>
                <option value="Healthcare">Healthcare</option>
              </select>
            </div>
            <div className= "splitMethodDivision"> 
              <label className= "splitMethodLabel">Split Method: </label>
              <select name="splitMethod" value={billData.splitMethod} onChange={handleChange} className= "splitMethodOption">
                <option value="equal">Equal Split</option>
                <option value="proportional">Proportional Split</option>
                <option value="custom">Custom Split</option>
              </select>
            </div>

            <div className= "currencyDivision"> 
              <label className= "currencyLabel">Currency <FcCurrencyExchange size={20} />: </label>
              
              <select name="currency" value={billData.currency} onChange={handleChange} className= "currencyOptions">
               {currencies.map((code)=> (
                <option key= {code} value= {code}> 
                  {code}
                </option>
               ))
               }
              </select>
              
            </div>
            <div className= "currencyDivision"> 
              <label className= "currencyLabel">Convert To: </label>
              
              <select name="targetCurrency" value={targetCurrency} onChange={(e)=> setTargetCurrency(e.target.value)} className= "currencyOptions">
               {currencies.map((code)=> (
                <option key= {`target-${code}`} value= {code}> 
                  {code}
                </option>
               ))}
              </select>
              
            </div>

            <div className= "GSTDivision" >
              <label className= "GSTLabel">GST (%): </label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                name="gst"
                value={billData.gst}
                onChange={handleChange}
                className= "GSTInput"
              /> 
            </div>

            <div className= "additionTaxDivision"> 
              <label className= "additionTaxLabel">Additional Tax (%): </label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                name="tax"

                value={billData.tax}
                onChange={handleChange}
                className= "additionTaxInput"
              />

            </div>

            <div className= "whoPaidDivision"> 
              <strong style={{ fontSize: "large", padding: '10px' }}>Who Paid?</strong>
        
              {payers.length === 0 ? (
                <p>Loading members profile details...</p>
              ) : (
                payers.map((payer) => (
                  <div key={payer.userId} className="payer-row">
                    <span className= "payerRowLabel">
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
                      className= "payerRowInput"
                    />
                  </div>
                ))
              )}
            </div>
            

            <div className= "proportionalDivision"> 
              {billData.splitMethod === 'equal' && (
                <> 
                  <strong style={{ fontSize: "large", padding: '10px' }}>Bill is split equally</strong>
                </>
              ) }
              {billData.splitMethod === 'proportional' && (
                <>
                  <strong style={{ fontSize: "large", padding: '10px' }}>Individual Orders</strong>
                  <p style={{ padding: '10px' }}>Enter what each member personally consumed.</p>
                  {individualItems.map(item => (
                    <div key={item.userId} className="payer-row">
                      <span className= "proportionalLabel">{item.username}</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.itemCost}
                        placeholder="0.00"
                        onChange={(e) => updateItemAmount(item.userId, e.target.value)}
                        className= "proportionalInput"
                      />
                    </div>
                  ))}
                </>
              )}

              {billData.splitMethod === 'custom' && (
                <>
                  <strong style={{ fontSize: "large", padding: '10px' }}>Individual Orders</strong>
                  <p style={{ padding: '10px' }}>Enter what each member personally consumed.</p>
                  {individualItems.map(item => (
                    <div key={item.userId} className="payer-row">
                      <span className= "proportionalLabel">{item.username}</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.itemCost}
                        placeholder="0.00"
                        onChange={(e) => updateItemAmount(item.userId, e.target.value)}
                        className= "proportionalInput"
                      />
                    </div>
                  ))}
                  <hr />
                  <strong style={{ fontSize: "large", padding: '10px' }}>Shared items</strong>
                  <p style={{ padding: '10px' }}>Example: appetizers, shared fries, group platter, shared drinks</p>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    name="sharedCost"
                    value={billData.sharedCost}
                    onChange={handleChange}
                    className= "proportionalInput"
                  />
                </>
              )}
            </div> 

        

            <div className= "billSummaryDivision"> 
              <strong style={{ fontSize: "large", padding: '10px' }}>Bill Summary</strong>
              <p style={{ padding: '10px' }}>Subtotal Paid: {billData.currency} {subtotalPaid.toFixed(2)}</p>
              
              {billData.currency !== targetCurrency && (
                  <p style={{ margin: 0, padding: '2px', color: '#2b6cb0', fontSize: '0.95em' }}>
                     Rate: 1 {billData.currency} = {currencyRate.toFixed(4)} {targetCurrency}
                  </p>
              )}
              <p style={{ padding: '10px' }}><strong>Final Bill ({targetCurrency}):</strong> {targetCurrency} {finalAmount.toFixed(2)}</p>


              <div className='buttons'>
                <div className='button-wrapper'>
                <button className= "smartSplitButton" type="button" onClick={submitBill} disabled={loading}>
                    <MdCalculate size={30}/>
                </button>
                <span className='hover-tooltip'> {loading ? 'Calculating...  ' : 'Calculate '}</span>
              </div>
              
              
              <div className='button-wrapper'>
                <button className= "billSummaryButton" type='button' onClick={sendBillSummaryToGroup}>
                    <GrSend size={30}/>
                </button>
                <span className='hover-tooltip'> Send bill summary to group</span>
              </div>
              </div>
              
              

            </div>

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

